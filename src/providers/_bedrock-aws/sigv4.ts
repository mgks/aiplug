/**
 * Tiny AWS SigV4 signer for the Bedrock Converse API.
 *
 * Implements the subset of SigV4 needed for `bedrock-runtime.<region>.amazonaws.com/model/<id>/converse`:
 *   - HMAC-SHA256 via `node:crypto`
 *   - URL-encoded query params (caller responsibility)
 *   - `amz-date` + `host` + `x-amz-content-sha256` headers
 *   - `Authorization: AWS4-HMAC-SHA256 Credential=…,SignedHeaders=…,Signature=…`
 *
 * No third-party dependency. Intentionally minimal — only the Bedrock
 * Converse use-case is implemented, not the full AWS API surface.
 */
import { createHash, createHmac } from 'node:crypto';

export interface BedrockCredentials {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
}

export interface BedrockSigV4Request {
    method: 'POST';
    /** Region (e.g. `us-east-1`). */
    region: string;
    /** Service code (always `bedrock` for our use-case). */
    service: 'bedrock';
    /** Path including leading slash (e.g. `/model/anthropic.claude-3-5-sonnet-20241022-v2:0/converse`). */
    path: string;
    body: string;
    credentials: BedrockCredentials;
    /** Optional extra headers to include in the signed request. */
    extraHeaders?: Record<string, string>;
}

export interface SignedBedrockRequest {
    url: string;
    headers: Record<string, string>;
}

/** SHA-256 hex digest of an input string. */
function sha256Hex(input: string): string {
    return createHash('sha256').update(input, 'utf-8').digest('hex');
}

/** HMAC-SHA256 hex digest. */
function hmacSha256(key: Buffer | string, input: string): Buffer {
    return createHmac('sha256', key as never).update(input, 'utf-8').digest();
}

/** URI-encode each path segment per RFC 3986, but keep `/` separators
 * intact because AWS expects literal slashes in the canonical URI. */
function uriEncodePath(path: string): string {
    if (!path) return '/';
    const trimmed = path.startsWith('/') ? path : `/${path}`;
    return trimmed
        .split('/')
        .map((seg) =>
            encodeURIComponent(seg).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`),
        )
        .join('/');
}

/** Canonicalise headers: lowercase keys, trim values, sort. */
function canonicalHeaders(headers: Record<string, string>): {
    canonical: string;
    signed: string;
} {
    const sortedKeys = Object.keys(headers)
        .map((k) => k.toLowerCase())
        .sort();
    const lines: string[] = [];
    const signedList: string[] = [];
    for (const key of sortedKeys) {
        const value = headers[key] ?? '';
        const trimmed = value.replace(/\s+/g, ' ').trim();
        lines.push(`${key}:${trimmed}`);
        signedList.push(key);
    }
    return {
        canonical: lines.join('\n') + '\n',
        signed: signedList.join(';'),
    };
}

/** Build the canonical request that gets signed. */
function canonicalRequest({
    method,
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    hashedPayload,
    signedHeadersList,
}: {
    method: string;
    canonicalUri: string;
    canonicalQueryString: string;
    canonicalHeaders: string;
    hashedPayload: string;
    signedHeadersList: string;
}): string {
    return [
        method,
        canonicalUri,
        canonicalQueryString,
        canonicalHeaders,
        signedHeadersList,
        hashedPayload,
    ].join('\n');
}

/** Compute the SigV4 signature for a Bedrock request. */
export function signBedrockRequest(req: BedrockSigV4Request): SignedBedrockRequest {
    const host = `bedrock-runtime.${req.region}.amazonaws.com`;
    const now = new Date();
    const amzDate =
        now.toISOString().replace(/[:\-]|\.\d{3}/g, '').slice(0, 15) + 'Z';

    // headers we sign
    const headers: Record<string, string> = {
        host,
        'x-amz-date': amzDate,
        'x-amz-content-sha256': sha256Hex(req.body),
        ...(req.credentials.sessionToken ? { 'x-amz-security-token': req.credentials.sessionToken } : {}),
        ...(req.extraHeaders ?? {}),
    };

    const { canonical: canonicalHeadersStr, signed: signedHeadersList } = canonicalHeaders(headers);

    const canonicalUri = uriEncodePath(req.path);
    const canonicalQueryString = '';
    const hashedPayload = headers['x-amz-content-sha256']!;
    const creq = canonicalRequest({
        method: req.method,
        canonicalUri,
        canonicalQueryString,
        canonicalHeaders: canonicalHeadersStr,
        hashedPayload,
        signedHeadersList,
    });
    const hashedCanonicalRequest = sha256Hex(creq);

    const credentialScope = `${amzDate.slice(0, 8)}/${req.region}/${req.service}/aws4_request`;
    const stringToSign = [
        'AWS4-HMAC-SHA256',
        amzDate,
        credentialScope,
        hashedCanonicalRequest,
    ].join('\n');

    // Derive signing key
    const kDate = hmacSha256(`AWS4${req.credentials.secretAccessKey}`, amzDate.slice(0, 8));
    const kRegion = hmacSha256(kDate, req.region);
    const kService = hmacSha256(kRegion, req.service);
    const kSigning = hmacSha256(kService, 'aws4_request');
    const signature = createHmac('sha256', kSigning).update(stringToSign, 'utf-8').digest('hex');

    const authorization =
        `AWS4-HMAC-SHA256 ` +
        `Credential=${req.credentials.accessKeyId}/${credentialScope}, ` +
        `SignedHeaders=${signedHeadersList}, ` +
        `Signature=${signature}`;

    return {
        url: `https://${host}${req.path}`,
        headers: {
            ...headers,
            authorization,
            'content-type': 'application/json',
        },
    };
}
