import * as fs from 'node:fs';
import * as path from 'node:path';

interface ProviderItem {
  id?: number;
  name: string;
  slug: string;
  aliases?: string[];
  category?: string;
  website?: string;
  api_base_url?: string;
  popular_models?: string[];
  env_variable?: string;
  openai_compatible?: boolean;
  notes?: string;
}

const providersPath = path.resolve('data/providers.json');
const providers: ProviderItem[] = JSON.parse(fs.readFileSync(providersPath, 'utf8'));

const categoryOrder = [
  'Frontier',
  'Gateway',
  'Aggregator',
  'IaaS',
  'Sovereign / Cloud',
  'Local',
  'Search',
  'Audio',
  'Image / Video',
  'Embeddings',
  'OAuth',
  'Web Cookie',
  'No-auth',
  'Specialized',
  'Cloud Agent',
];

const categoryTitles: Record<string, string> = {
  Frontier: 'Frontier Labs & Flagship APIs',
  Gateway: 'API Gateways & Unified Proxies',
  Aggregator: 'Aggregators & Multi-Provider Routers',
  IaaS: 'IaaS, Bare-Metal & GPU Clouds',
  'Sovereign / Cloud': 'Enterprise Cloud & Sovereign Infrastructure',
  Local: 'Local Runtimes & Offline Servers',
  Search: 'Search & Web Retrieval APIs',
  Audio: 'Audio, Speech-to-Text & Text-to-Speech',
  'Image / Video': 'Image & Video Generation',
  Embeddings: 'Dedicated Embeddings & Vector Providers',
  OAuth: 'OAuth & Developer Platforms',
  'Web Cookie': 'Session & Web-Based Endpoints',
  'No-auth': 'Free & No-Auth Endpoints',
  Specialized: 'Domain-Specific & Specialized AI',
  'Cloud Agent': 'Cloud Coding & Autonomous Agents',
};

const grouped: Record<string, ProviderItem[]> = {};
for (const cat of categoryOrder) {
  grouped[cat] = [];
}

// Built-in virtual transports
grouped['Local']?.unshift({
  name: 'Mock Transport',
  slug: 'mock',
  website: 'https://github.com/memoryblock-io/aiplug',
  api_base_url: 'In-memory (zero network)',
  env_variable: '—',
  openai_compatible: true,
  notes: 'Built-in offline testing, stream chunk simulation, zero network calls',
});

grouped['Aggregator']?.unshift({
  name: 'AIPlug Fallback Router',
  slug: 'fallback',
  website: 'https://github.com/memoryblock-io/aiplug',
  api_base_url: 'Multi-provider failover chain',
  env_variable: '—',
  openai_compatible: true,
  notes: 'Automatic failover across multiple providers on 429, timeout, or network outage',
});

for (const p of providers) {
  const cat = p.category && grouped[p.category] ? p.category : 'Specialized';
  grouped[cat]?.push(p);
}

let md = `# Supported Providers Directory (490+ Providers, 930+ Routes)\n\n`;
md += `This document contains the complete, authoritative reference of all supported AI providers and runtime transports in **AIPlug**.\n\n`;
md += `Every provider listed below can be plugged into the AIPlug SDK, the OpenAI-compatible HTTP gateway, or the \`aiplug\` CLI.\n\n`;

md += `> **Tip:** You can also dynamically search this entire registry in-memory using \`AIPlug.searchProviders("query")\` or \`aiplug transport list\`.\n\n`;

md += `## Table of Contents\n\n`;
for (const cat of categoryOrder) {
  const list = grouped[cat];
  if (!list || list.length === 0) continue;
  const title = categoryTitles[cat] || cat;
  const anchor = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  md += `- [${title} (${list.length})](#${anchor})\n`;
}
md += `\n---\n\n`;

for (const cat of categoryOrder) {
  const list = grouped[cat];
  if (!list || list.length === 0) continue;
  const title = categoryTitles[cat] || cat;
  md += `## ${title} (${list.length})\n\n`;
  md += `| Provider | Slug | API Base URL | Default Env Var | Wire Protocol | Notes |\n`;
  md += `| :--- | :--- | :--- | :--- | :--- | :--- |\n`;

  for (const p of list) {
    const nameLink = p.website ? `[${p.name}](${p.website})` : p.name;
    const slug = '`' + p.slug + '`';
    const baseUrl = p.api_base_url ? '`' + p.api_base_url + '`' : '—';
    const envVar = p.env_variable ? '`' + p.env_variable + '`' : '—';
    const wire = p.openai_compatible ? '✓ OpenAI' : 'Native / Custom';
    const notes = (p.notes || '').replace(/\|/g, '\\|');
    md += `| ${nameLink} | ${slug} | ${baseUrl} | ${envVar} | ${wire} | ${notes} |\n`;
  }
  md += `\n`;
}

md += `## Using Any Provider\n\n`;
md += `### In TypeScript / JavaScript\n\n`;
md += `\`\`\`typescript\nimport { AIPlug } from 'aiplug';\n\n`;
md += `// By provider slug\n`;
md += `const ai = AIPlug.create({\n  transport: 'groq',\n  apiKey: process.env.GROQ_API_KEY,\n  model: 'llama-3.3-70b-versatile',\n});\n\n`;
md += `// Or using unified model specifier\n`;
md += `const ai2 = AIPlug.fromModel('together/meta-llama/Llama-3.3-70B-Instruct-Turbo', {\n  apiKey: process.env.TOGETHER_API_KEY,\n});\n\`\`\`\n\n`;

md += `### In the CLI\n\n`;
md += `\`\`\`bash\n# Configure any provider interactively\naiplug transport add mistral\n\n# Switch active provider\naiplug transport use mistral\n\n# Health check\naiplug transport test mistral\n\`\`\`\n\n`;

md += `### OpenAI-Compatible HTTP Server\n\n`;
md += `Run \`aiplug serve\` and point any standard OpenAI SDK at \`http://localhost:3711/v1\`.\n`;

fs.writeFileSync('PROVIDERS.md', md, 'utf8');
console.log('Generated PROVIDERS.md with', Object.values(grouped).flat().length, 'entries.');
