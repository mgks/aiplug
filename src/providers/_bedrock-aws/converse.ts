/**
 * Bedrock native transport — speaks AWS SigV4-signed `Converse` and
 * `ConverseStream` against `bedrock-runtime.<region>.amazonaws.com`.
 *
 * Provider id: `bedrock-aws`. The existing `bedrock` provider is the
 * OpenAI-compat shim and stays untouched.
 *
 * No third-party runtime dependency: signing is implemented in
 * `./sigv4.ts`. AWS credentials are read from `providerOptions` with
 * a fallback to the standard AWS default credential provider via the
 * `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_SESSION_TOKEN`
 * environment variables.
 */
import { Transport, requireModel } from '../../transport.js';
import { makeError } from '../../errors.js';
import { codeForStatus, wrapFetchError, extractText } from '../_shared.js';
import { signBedrockRequest, type BedrockCredentials } from './sigv4.js';
import { EventStreamDecoder } from './eventstream.js';
import { METADATA, CAPABILITIES } from './capabilities.js';
import type {
    ChatMessage,
    ChatRequest,
    ChatResponse,
    HealthInfo,
    ModelInfo,
    StreamChunk,
    ToolCall,
    TransportMetadata,
    Usage,
} from '../../types.js';

interface ConverseSystemBlock { text: string }
interface ConverseTextBlock { text: string }
interface ConverseImageBlock {
    image: {
        format: 'png' | 'jpeg' | 'gif' | 'webp';
        source: { bytes: Uint8Array } | { s3Location: { uri: string } };
    };
}
interface ConverseToolUseBlock {
    toolUse: { toolUseId: string; name: string; input: unknown };
}
interface ConverseToolResultBlock {
    toolResult: {
        toolUseId: string;
        content: Array<{ text?: string; json?: unknown }>;
        status?: 'success' | 'error';
    };
}
type ConverseContentBlock = ConverseTextBlock | ConverseImageBlock | ConverseToolUseBlock | ConverseToolResultBlock;

interface ConverseMessage {
    role: 'user' | 'assistant';
    content: ConverseContentBlock[];
}

interface ConverseToolSpec {
    toolSpec: {
        name: string;
        description?: string;
        inputSchema: { json: Record<string, unknown> };
    };
}

interface ConverseToolConfig {
    tools: ConverseToolSpec[];
}

interface ConverseResponse {
    output?: {
        message?: {
            role: 'assistant';
            content: ConverseContentBlock[];
        };
    };
    stopReason?: 'end_turn' | 'tool_use' | 'max_tokens' | 'stop_sequence' | string;
    usage?: {
        inputTokens?: number;
        outputTokens?: number;
        totalTokens?: number;
        /** Tokens served from a Bedrock prompt cache. */
        cacheReadInputTokens?: number;
        /** Tokens written into a Bedrock prompt cache. */
        cacheWriteInputTokens?: number;
    };
}

function formatImageFormat(mime: string | undefined): 'png' | 'jpeg' | 'gif' | 'webp' | undefined {
    if (!mime) return undefined;
    const m = mime.toLowerCase();
    if (m.includes('png')) return 'png';
    if (m.includes('jpeg') || m.includes('jpg')) return 'jpeg';
    if (m.includes('gif')) return 'gif';
    if (m.includes('webp')) return 'webp';
    return undefined;
}

function mapContentBlocks(message: ChatMessage): ConverseContentBlock[] {
    const blocks: ConverseContentBlock[] = [];
    const text = extractText(message.content);
    if (text) {
        blocks.push({ text });
    }
    if (message.toolCalls) {
        for (const tc of message.toolCalls) {
            blocks.push({
                toolUse: { toolUseId: tc.id, name: tc.name, input: tc.arguments },
            });
        }
    }
    return blocks;
}

function mapUserContentBlocks(message: ChatMessage): ConverseContentBlock[] {
    if (message.role !== 'tool') {
        return mapContentBlocks(message);
    }
    if (message.toolCallId) {
        const text = extractText(message.content);
        return [
            {
                toolResult: {
                    toolUseId: message.toolCallId,
                    content: text ? [{ text }] : [],
                    status: 'success',
                },
            },
        ];
    }
    return mapContentBlocks(message);
}

function buildConverseBody(req: ChatRequest): {
    body: { messages: ConverseMessage[]; system?: ConverseSystemBlock[]; toolConfig?: ConverseToolConfig; inferenceConfig?: Record<string, unknown> };
} {
    const system: ConverseSystemBlock[] = [];
    const messages: ConverseMessage[] = [];

    for (const m of req.messages) {
        if (m.role === 'system') {
            const text = extractText(m.content);
            if (text) system.push({ text });
            continue;
        }
        if (m.role === 'assistant') {
            const blocks = mapContentBlocks(m);
            if (blocks.length > 0) messages.push({ role: 'assistant', content: blocks });
            continue;
        }
        if (m.role === 'user') {
            messages.push({ role: 'user', content: mapContentBlocks(m) });
            continue;
        }
        if (m.role === 'tool') {
            // Bedrock uses `role: user` to carry tool-result blocks.
            const blocks = mapUserContentBlocks(m);
            if (blocks.length > 0) messages.push({ role: 'user', content: blocks });
        }
    }

    const body: { messages: ConverseMessage[]; system?: ConverseSystemBlock[]; toolConfig?: ConverseToolConfig; inferenceConfig?: Record<string, unknown> } = { messages };
    if (system.length > 0) body.system = system;
    if (req.tools && req.tools.length > 0) {
        body.toolConfig = {
            tools: req.tools.map((t) => ({
                toolSpec: {
                    name: t.name,
                    ...(t.description ? { description: t.description } : {}),
                    inputSchema: { json: t.parameters },
                },
            })),
        };
    }
    const inferenceConfig: Record<string, unknown> = {};
    if (req.sampling?.maxTokens !== undefined) inferenceConfig['maxTokens'] = req.sampling.maxTokens;
    if (req.sampling?.temperature !== undefined) inferenceConfig['temperature'] = req.sampling.temperature;
    if (req.sampling?.topP !== undefined) inferenceConfig['topP'] = req.sampling.topP;
    if (Object.keys(inferenceConfig).length > 0) body.inferenceConfig = inferenceConfig;

    return { body };
}

export interface BedrockAWSConfig {
    transport: string;
    apiKey?: string;
    baseURL?: string;
    model?: string;
    headers?: Record<string, string>;
    timeoutMs?: number;
    capabilities?: never;
    providerOptions?: Record<string, unknown> & {
        region?: string;
        accessKeyId?: string;
        secretAccessKey?: string;
        sessionToken?: string;
    };
}

function resolveCredentials(config: BedrockAWSConfig): BedrockCredentials {
    const opts = config.providerOptions ?? {};
    const accessKeyId =
        opts.accessKeyId ?? process.env['AWS_ACCESS_KEY_ID'] ?? process.env['AWS_ACCESS_KEY'];
    const secretAccessKey =
        opts.secretAccessKey ?? process.env['AWS_SECRET_ACCESS_KEY'] ?? process.env['AWS_SECRET_KEY'];
    if (!accessKeyId || !secretAccessKey) {
        throw makeError({
            code: 'AUTH_MISSING',
            transport: METADATA.name,
            message:
                'Bedrock requires AWS credentials. Set AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY or pass providerOptions.accessKeyId/secretAccessKey.',
        });
    }
    return {
        accessKeyId,
        secretAccessKey,
        ...(opts.sessionToken ?? process.env['AWS_SESSION_TOKEN']
            ? { sessionToken: opts.sessionToken ?? process.env['AWS_SESSION_TOKEN']! }
            : {}),
    };
}

function resolveRegion(config: BedrockAWSConfig): string {
    return (
        (config.providerOptions?.region as string | undefined) ??
        process.env['AWS_REGION'] ??
        process.env['AWS_DEFAULT_REGION'] ??
        'us-east-1'
    );
}

function regionFromBaseURL(baseURL: string | undefined): string | undefined {
    if (!baseURL) return undefined;
    const m = /bedrock-runtime\.([^.]+)\.amazonaws\.com/.exec(baseURL);
    return m?.[1];
}

async function signedFetch(
    config: BedrockAWSConfig,
    region: string,
    path: string,
    body: string,
    signal: AbortSignal | undefined,
): Promise<Response> {
    const credentials = resolveCredentials(config);
    const signed = signBedrockRequest({
        method: 'POST',
        region,
        service: 'bedrock',
        path,
        body,
        credentials,
    });
    try {
        return await fetch(signed.url, {
            method: 'POST',
            headers: signed.headers,
            body,
            ...(signal ? { signal } : {}),
        });
    } catch (err) {
        throw wrapFetchError(err, METADATA.name);
    }
}

export class BedrockAWSTransport extends Transport {
    constructor(config: BedrockAWSConfig) {
        super({ ...config }, METADATA);
    }

    private resolvedRegion(): string {
        const cfg = this.config as BedrockAWSConfig;
        return resolveRegion(cfg);
    }

    private resolvedBaseURL(): string {
        const cfg = this.config as BedrockAWSConfig;
        const regionFromOpts = cfg.providerOptions?.region as string | undefined;
        const region = regionFromOpts ?? regionFromBaseURL(cfg.baseURL) ?? this.resolvedRegion();
        return cfg.baseURL ?? `https://bedrock-runtime.${region}.amazonaws.com`;
    }

    override capabilities(): TransportMetadata {
        return METADATA;
    }

    private resolveModelForUrl(): { modelId: string; regionFromUrl: string | undefined } {
        const cfg = this.config as BedrockAWSConfig;
        const baseURL = this.resolvedBaseURL();
        const regionFromUrl = regionFromBaseURL(baseURL);
        const modelId = cfg.model ?? '';
        return { modelId, regionFromUrl };
    }

    override async chat(req: ChatRequest, signal?: AbortSignal): Promise<ChatResponse> {
        requireModel(this.config);
        const { body } = buildConverseBody(req);
        const bodyJson = JSON.stringify(body);
        const cfg = this.config as BedrockAWSConfig;
        const region = this.resolvedRegion();
        const { modelId } = this.resolveModelForUrl();
        const path = `/model/${modelId}/converse`;

        let res: Response;
        try {
            res = await signedFetch(cfg, region, path, bodyJson, signal);
        } catch (err) {
            throw wrapFetchError(err, METADATA.name);
        }
        if (!res.ok) {
            const text = await res.text().catch(() => '');
            throw makeError({
                code: codeForStatus(res.status),
                transport: METADATA.name,
                status: res.status,
                message: `Bedrock Converse failed: ${res.status}`,
                details: { body: text.slice(0, 2048) },
            });
        }
        const data = (await res.json()) as ConverseResponse;
        const blocks = data.output?.message?.content ?? [];
        let text = '';
        const toolCalls: ToolCall[] = [];
        for (const blk of blocks) {
            if ('text' in blk && blk.text) text += blk.text;
            if ('toolUse' in blk && blk.toolUse) {
                toolCalls.push({
                    id: blk.toolUse.toolUseId,
                    name: blk.toolUse.name,
                    arguments: (blk.toolUse.input as Record<string, unknown>) ?? {},
                });
            }
        }
        const message: ChatMessage = toolCalls.length > 0 ? { role: 'assistant', content: text, toolCalls } : { role: 'assistant', content: text };
        const resp: ChatResponse = {
            model: modelId,
            message,
            finishReason: data.stopReason ?? 'stop',
            raw: data,
        };
        if (data.usage?.inputTokens !== undefined) {
            const usage: Usage = {
                promptTokens: data.usage.inputTokens,
                totalTokens: data.usage.totalTokens ?? data.usage.inputTokens,
            };
            if (data.usage.outputTokens !== undefined) usage.completionTokens = data.usage.outputTokens;
            const cacheRead = (data.usage as { cacheReadInputTokens?: number }).cacheReadInputTokens;
            if (typeof cacheRead === 'number') usage.cacheReadTokens = cacheRead;
            const cacheWrite = (data.usage as { cacheWriteInputTokens?: number }).cacheWriteInputTokens;
            if (typeof cacheWrite === 'number') usage.cacheWriteTokens = cacheWrite;
            resp.usage = usage;
        }
        return resp;
    }

    override async *stream(req: ChatRequest, signal?: AbortSignal): AsyncIterableIterator<StreamChunk> {
        requireModel(this.config);
        const cfg = this.config as BedrockAWSConfig;
        const region = this.resolvedRegion();
        const { modelId } = this.resolveModelForUrl();
        const { body } = buildConverseBody(req);
        const bodyJson = JSON.stringify(body);
        const path = `/model/${modelId}/converse-stream`;

        let res: Response;
        try {
            res = await signedFetch(cfg, region, path, bodyJson, signal);
        } catch (err) {
            throw wrapFetchError(err, METADATA.name);
        }
        if (!res.ok || !res.body) {
            const text = await res.text().catch(() => '');
            throw makeError({
                code: codeForStatus(res.status),
                transport: METADATA.name,
                status: res.status,
                message: `Bedrock ConverseStream failed: ${res.status}`,
                details: { body: text.slice(0, 2048) },
            });
        }

        const reader = res.body.getReader();
        const es = new EventStreamDecoder();
        let acc = '';
        const toolCalls: ToolCall[] = [];
        let usage: { promptTokens?: number; completionTokens?: number; totalTokens?: number } | undefined;
        let finishReason: string | undefined;
        let activeToolUseId = '';

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                for (const message of es.push(value)) {
                    const eventType = message.headers.find((h) => h.name === ':event-type')?.value;
                    if (!eventType) continue;
                    // Bedrock ConverseStream payloads are flat — the fields live at
                    // the top level of the JSON object, not under a wrapper named
                    // after the event type.
                    let payload: {
                        start?: { toolUse?: { toolUseId?: string; name?: string } };
                        delta?: { text?: string; toolUse?: { input?: string } };
                        stopReason?: string;
                        usage?: { inputTokens?: number; outputTokens?: number; totalTokens?: number };
                    };
                    try {
                        payload = JSON.parse(message.payload);
                    } catch {
                        continue;
                    }

                    if (eventType === 'contentBlockStart' && payload.start?.toolUse?.toolUseId && payload.start.toolUse.name) {
                        activeToolUseId = payload.start.toolUse.toolUseId;
                        toolCalls.push({
                            id: payload.start.toolUse.toolUseId,
                            name: payload.start.toolUse.name,
                            arguments: {},
                        });
                    }

                    if (eventType === 'contentBlockDelta' && payload.delta) {
                        const delta = payload.delta;
                        if (delta.text) {
                            acc += delta.text;
                            yield { type: 'text-delta', delta: delta.text, accumulated: acc };
                        }
                        if (delta.toolUse?.input && activeToolUseId) {
                            const tc = toolCalls.find((t) => t.id === activeToolUseId);
                            if (tc) {
                                try {
                                    Object.assign(tc.arguments, JSON.parse(delta.toolUse.input));
                                } catch {
                                    // partial JSON; emit raw delta so the
                                    // consumer can stream-parse it.
                                    const raw = delta.toolUse.input;
                                    (tc.arguments as Record<string, unknown>)['_partial'] = raw;
                                }
                                yield {
                                    type: 'tool-call-delta',
                                    toolCallId: activeToolUseId,
                                    argumentsDelta: delta.toolUse.input,
                                };
                            }
                        }
                    }

                    if (eventType === 'messageStop' && payload.stopReason) {
                        finishReason = payload.stopReason;
                    }

                    if (eventType === 'metadata' && payload.usage) {
                        const md = payload.usage as {
                            inputTokens?: number;
                            outputTokens?: number;
                            totalTokens?: number;
                            cacheReadInputTokens?: number;
                            cacheWriteInputTokens?: number;
                        };
                        const u: Usage = {};
                        if (md.inputTokens !== undefined) u.promptTokens = md.inputTokens;
                        if (md.outputTokens !== undefined) u.completionTokens = md.outputTokens;
                        u.totalTokens = md.totalTokens ?? (md.inputTokens ?? 0) + (md.outputTokens ?? 0);
                        if (typeof md.cacheReadInputTokens === 'number') {
                            u.cacheReadTokens = md.cacheReadInputTokens;
                        }
                        if (typeof md.cacheWriteInputTokens === 'number') {
                            u.cacheWriteTokens = md.cacheWriteInputTokens;
                        }
                        usage = u;
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }

        if (toolCalls.length > 0) {
            yield { type: 'tool-call', toolCall: toolCalls[toolCalls.length - 1]! };
        }
        if (usage) yield { type: 'usage', usage };
        if (finishReason) {
            yield { type: 'finish', reason: finishReason as 'stop' | 'length' | 'tool_calls' | 'content_filter' | 'error' | string };
        } else {
            yield { type: 'finish', reason: 'stop' };
        }
    }

    override async embeddings(): Promise<never> {
        throw makeError({
            code: 'UNSUPPORTED_CAPABILITY',
            transport: METADATA.name,
            message: 'Bedrock Converse does not expose embeddings through aiplug; pick a native embedding provider.',
        });
    }

    override async images(): Promise<never> {
        throw makeError({
            code: 'UNSUPPORTED_CAPABILITY',
            transport: METADATA.name,
            message: 'Bedrock image generation is not implemented in aiplug yet.',
        });
    }

    override async audio(): Promise<never> {
        throw makeError({
            code: 'UNSUPPORTED_CAPABILITY',
            transport: METADATA.name,
            message: 'Bedrock audio is not implemented in aiplug yet.',
        });
    }

    override async transcription(): Promise<never> {
        throw makeError({
            code: 'UNSUPPORTED_CAPABILITY',
            transport: METADATA.name,
            message: 'Bedrock transcription is not implemented in aiplug yet.',
        });
    }

    override async models(): Promise<ModelInfo[]> {
        return [{ id: this.config.model ?? '', transport: METADATA.name, capabilities: [...CAPABILITIES] }];
    }

    override async health(signal?: AbortSignal): Promise<HealthInfo> {
        try {
            const region = this.resolvedRegion();
            const cfg = this.config as BedrockAWSConfig;
            const bodyJson = JSON.stringify({
                messages: [{ role: 'user', content: [{ text: 'ping' }] }],
                inferenceConfig: { maxTokens: 1 },
            });
            const { modelId } = this.resolveModelForUrl();
            const path = `/model/${modelId}/converse`;
            const res = await signedFetch(cfg, region, path, bodyJson, signal);
            return {
                ok: res.ok,
                ...(res.status === 403
                    ? { error: 'AWS credentials rejected — verify accessKeyId/secretAccessKey/region and that the model is enabled for this account.' }
                    : res.status === 404
                        ? { error: `Model ${modelId} not found in ${region}.` }
                        : res.ok
                            ? {}
                            : { error: `Bedrock Converse ${res.status}` }),
            };
        } catch (err) {
            const e = err as Error;
            return { ok: false, error: e.message };
        }
    }
}
