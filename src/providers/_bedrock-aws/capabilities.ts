import type { Capability, TransportMetadata } from '../../types.js';

export const CAPABILITIES: Capability[] = [
    'chat',
    'streaming',
    'tools',
    'vision',
];

export const METADATA: TransportMetadata = {
    name: 'bedrock-aws',
    version: '0.1.0',
    capabilities: CAPABILITIES,
    defaultBaseURL: 'https://bedrock-runtime.us-east-1.amazonaws.com',
    auth: 'header',
    authHeader: 'authorization',
};
