# Supported Providers Directory (490+ Providers, 930+ Routes)

This document contains the complete, authoritative reference of all supported AI providers and runtime transports in **AIPlug**.

Every provider listed below can be plugged into the AIPlug SDK, the OpenAI-compatible HTTP gateway, or the `aiplug` CLI.

> **Tip:** You can also dynamically search this entire registry in-memory using `AIPlug.searchProviders("query")` or `aiplug transport list`.

## Table of Contents

- [Frontier Labs & Flagship APIs (74)](#frontier-labs-flagship-apis)
- [API Gateways & Unified Proxies (130)](#api-gateways-unified-proxies)
- [Aggregators & Multi-Provider Routers (20)](#aggregators-multi-provider-routers)
- [IaaS, Bare-Metal & GPU Clouds (63)](#iaas-bare-metal-gpu-clouds)
- [Enterprise Cloud & Sovereign Infrastructure (43)](#enterprise-cloud-sovereign-infrastructure)
- [Local Runtimes & Offline Servers (28)](#local-runtimes-offline-servers)
- [Search & Web Retrieval APIs (19)](#search-web-retrieval-apis)
- [Audio, Speech-to-Text & Text-to-Speech (15)](#audio-speech-to-text-text-to-speech)
- [Image & Video Generation (20)](#image-video-generation)
- [Dedicated Embeddings & Vector Providers (5)](#dedicated-embeddings-vector-providers)
- [OAuth & Developer Platforms (22)](#oauth-developer-platforms)
- [Session & Web-Based Endpoints (34)](#session-web-based-endpoints)
- [Free & No-Auth Endpoints (10)](#free-no-auth-endpoints)
- [Domain-Specific & Specialized AI (6)](#domain-specific-specialized-ai)
- [Cloud Coding & Autonomous Agents (3)](#cloud-coding-autonomous-agents)

---

## Frontier Labs & Flagship APIs (74)

| Provider | Slug | API Base URL | Default Env Var | Wire Protocol | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| [OpenAI](https://platform.openai.com) | `openai` | `https://api.openai.com/v1` | `OPENAI_API_KEY` | ✓ OpenAI | Industry-standard SDK ecosystem |
| [Anthropic](https://www.anthropic.com) | `anthropic` | `https://api.anthropic.com` | `ANTHROPIC_API_KEY` | Native / Custom | Native Messages API (not OpenAI-compatible) |
| [Google AI Studio](https://aistudio.google.com) | `google-ai-studio` | `https://generativelanguage.googleapis.com` | `GEMINI_API_KEY` | ✓ OpenAI | Up to 2M context; free tier on Flash variants |
| [DeepSeek](https://platform.deepseek.com) | `deepseek` | `https://api.deepseek.com/v1` | `DEEPSEEK_API_KEY` | ✓ OpenAI | OpenAI + Anthropic format; context caching |
| [Mistral AI](https://console.mistral.ai) | `mistral` | `https://api.mistral.ai/v1` | `MISTRAL_API_KEY` | ✓ OpenAI | EU-hosted; generous experiment tier |
| [xAI](https://x.ai) | `xai` | `https://api.x.ai/v1` | `XAI_API_KEY` | ✓ OpenAI | Real-time streaming & agent workflows |
| [Cohere](https://cohere.com) | `cohere` | `https://api.cohere.com/v2` | `COHERE_API_KEY` | Native / Custom | Enterprise search & RAG |
| [AI21 Labs](https://studio.ai21.com) | `ai21` | `https://api.ai21.com/studio/v1` | `AI21_API_KEY` | ✓ OpenAI | Long-context hybrid architecture |
| [Baidu Qianfan](https://cloud.baidu.com/product/wenxinworkshop) | `baidu-qianfan` | `https://api.baiduqianfan.ai/v1` | `QIANFAN_API_KEY` | ✓ OpenAI | Chinese-language optimized |
| [StepFun](https://platform.stepfun.com) | `stepfun` | `https://api.stepfun.com/v1` | `STEPFUN_API_KEY` | ✓ OpenAI | Multilingual agent pipelines |
| [Z.ai (Zhipu AI)](https://open.bigmodel.cn) | `zhipu` | `https://open.bigmodel.cn/api/paas/v4/` | `ZHIPU_API_KEY` | ✓ OpenAI | Strong bilingual CN/EN performance |
| [Xiaomi](https://xiaomi.com) | `xiaomi` | `https://api.xiaomimimo.com/v1` | `XIAOMI_API_KEY` | ✓ OpenAI | On-device & edge deployments |
| [Reka AI](https://reka.ai) | `reka` | `https://api.reka.ai/v1` | `REKA_API_KEY` | ✓ OpenAI | Video, audio & text multimodal |
| [Inflection](https://inflection.ai) | `inflection` | `Custom webhooks` | — | Native / Custom | Conversational assistant focus |
| [MiniMax](https://platform.minimax.io) | `minimax` | `https://api.minimax.io/v1` | `MINIMAX_API_KEY` | ✓ OpenAI | OpenAI + Anthropic compatible; agentic |
| [Alibaba DashScope](https://www.alibabacloud.com) | `dashscope` | `https://dashscope-intl.aliyuncs.com/compatible-mode/v1` | `DASHSCOPE_API_KEY` | ✓ OpenAI | Alibaba Cloud Model Studio; Qwen family |
| [Upstage](https://console.upstage.ai) | `upstage` | `https://api.upstage.ai/v1/solar` | `UPSTAGE_API_KEY` | ✓ OpenAI | Korean AI lab; strong document AI |
| [Perplexity](https://docs.perplexity.ai) | `perplexity` | `https://api.perplexity.ai` | `PERPLEXITY_API_KEY` | ✓ OpenAI | Search-grounded answers with citations |
| [MiniMax International](https://platform.minimaxi.chat) | `minimax-intl` | `https://api.minimaxi.chat/v1` | `MINIMAX_API_KEY` | ✓ OpenAI | International endpoint (api.minimaxi.chat) |
| [Pioneer AI](https://pioneer.ai) | `pioneer` | `https://api.pioneer.ai/v1` | `PIONEER_API_KEY` | ✓ OpenAI | $75 free usage credits — no credit card required; Pioneer AI by Fastino Labs. Free $75 usage credits, no credit card required. Use API key auth with a pio_sk_... key. Only open-tier models (Qwen3, Llama, Gemma, SmolLM) work directly — gated models (Claude/GPT/Gemini) require prior fine-tuning via the Pioneer platform. |
| [UC Direct (uncensored.com)](https://uncensored.com) | `uc-direct` | `https://api.uncensored.com/api/v1` | `UC_DIRECT_API_KEY` | ✓ OpenAI | Use your uncensored.com Developer API key (uai_sk_live_...). The key never expires. This is the metered/credits surface; the un-metered subscription chat is the separate 'uc' provider.; UC Direct is OpenAI-compatible on /api/v1. |
| [Blackbox AI](https://blackbox.ai) | `blackbox` | `https://api.blackbox.ai/v1` | `BLACKBOX_API_KEY` | ✓ OpenAI | Limited free access is available through Blackbox; model availability and account limits apply |
| [Perplexity Agent](https://www.perplexity.ai) | `perplexity-agent` | `https://api.perplexity.ai/v1` | `PERPLEXITY_AGENT_API_KEY` | ✓ OpenAI | Use your Perplexity API key.; Use Agent API model IDs with the pplx-agent/ prefix, for example pplx-agent/openai/gpt-5.6-sol or pplx-agent/anthropic/claude-opus-4-5. |
| [Meta Llama API](https://llama.developer.meta.com) | `meta-llama` | `https://api.llama.com/compat/v1` | `META_LLAMA_API_KEY` | ✓ OpenAI | First-party model lab API. |
| [Galadriel](https://galadriel.com) | `galadriel` | `https://api.galadriel.ai/v1` | `GALADRIEL_API_KEY` | ✓ OpenAI | First-party model lab API. |
| [Codestral](https://mistral.ai) | `codestral` | `https://codestral.mistral.ai/v1` | `CODESTRAL_API_KEY` | ✓ OpenAI | First-party model lab API. |
| [Maritalk](https://www.maritaca.ai) | `maritalk` | `https://chat.maritaca.ai/api` | `MARITALK_API_KEY` | ✓ OpenAI | First-party model lab API. |
| [Nous Research](https://portal.nousresearch.com/help) | `nous-research` | `https://inference-api.nousresearch.com/v1` | `NOUS_RESEARCH_API_KEY` | ✓ OpenAI | Free tier: 50 RPM, 500,000 TPM — no credit card; Use your Nous Portal API key.; Nous exposes an OpenAI-compatible /v1 surface with a large remote /models catalog. The /chat/completions endpoint requires a valid API key for programmatic inference. |
| [Writer](https://dev.writer.com) | `writer` | `https://api.writer.com/v1` | `WRITER_API_KEY` | ✓ OpenAI | Writer Palmyra is OpenAI-compatible at https://api.writer.com/v1. palmyra-x5 offers a 1M-token context window. |
| [GLM Coding](https://z.ai/subscribe) | `glm-coding` | `https://api.z.ai/api/coding/paas/v4` | `GLM_API_KEY` | ✓ OpenAI | First-party model lab API.; Preset GLM profile with higher token budget, thinking enabled, and longer timeout. |
| [GLM Coding (China)](https://open.bigmodel.cn) | `glm-cn` | `https://open.bigmodel.cn/api/coding/paas/v4` | `GLM_CN_API_KEY` | ✓ OpenAI | First-party model lab API. |
| [Alibaba Token Plan](https://www.alibabacloud.com/help/en/model-studio/token-plan-overview) | `bailian-coding-plan` | `https://token-plan.ap-southeast-1.maas.aliyuncs.com/apps/anthropic/v1` | `BAILIAN_CODING_PLAN_API_KEY` | Native / Custom | Use an Alibaba Token Plan key and select its Singapore or Beijing region. |
| [Qwen Cloud](https://www.qwencloud.com) | `qwen-cloud` | `https://dashscope-intl.aliyuncs.com/compatible-mode/v1` | `QWEN_CLOUD_API_KEY` | ✓ OpenAI | Use a Qwen Cloud API key and select its Global or Beijing region. |
| [Qwen Cloud Token Plan](https://www.qwencloud.com/pricing/token-plan) | `qwen-cloud-token-plan` | `https://token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1` | `QWEN_CLOUD_TOKEN_PLAN_API_KEY` | ✓ OpenAI | Use a Qwen Cloud Token Plan key and select its Singapore or Beijing region. |
| [Kimi Code API Key](https://www.kimi.com/code) | `kimi-coding-apikey` | `https://api.kimi.com/coding/v1` | `KIMI_CODING_API_KEY` | ✓ OpenAI | First-party model lab API. |
| [Minimax (China)](https://www.minimaxi.com) | `minimax-cn` | `https://api.minimaxi.com/v1` | `MINIMAX_CN_API_KEY` | ✓ OpenAI | First-party model lab API. |
| [Alibaba (China)](https://dashscope.console.aliyun.com) | `alibaba-cn` | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `ALIBABA_CN_API_KEY` | ✓ OpenAI | First-party model lab API. |
| [LongCat AI](https://longcat.chat/platform/docs) | `longcat` | `https://api.longcat.chat/openai/v1` | `LONGCAT_API_KEY` | ✓ OpenAI | Free: one-time 10M-token grant after account signup + KYC verification (LongCat-2.0). One-time only — not a recurring daily/monthly allowance. |
| [Volcengine Ark Agent Plan](https://console.volcengine.com/ark/region:cn-beijing/subscription/agent-plan) | `volcengine-agent-plan` | `https://ark.cn-beijing.volces.com/api/plan/v3` | `VOLCENGINE_AGENT_PLAN_API_KEY` | ✓ OpenAI | Connect your Volcano Engine account or use an Ark Agent Plan subscription API key. |
| [Volcengine Ark Coding Plan](https://console.volcengine.com/ark/region:cn-beijing/subscription/coding-plan) | `volcengine-coding-plan` | `https://ark.cn-beijing.volces.com/api/coding/v3` | `VOLCENGINE_CODING_PLAN_API_KEY` | ✓ OpenAI | Connect your Volcano Engine account or use an Ark Coding Plan subscription API key. |
| [GigaChat (Sber)](https://developers.sber.ru) | `gigachat` | `https://gigachat.devices.sberbank.ru/api/v1` | `GIGACHAT_API_KEY` | ✓ OpenAI | First-party model lab API. |
| [Xiaomi MiMo Token Plan](https://mimo.mi.com) | `xiaomi-mimo-token-plan` | `https://token-plan-sgp.xiaomimimo.com/v1` | `XIAOMI_MIMO_TOKEN_PLAN_API_KEY` | ✓ OpenAI | First-party model lab API. |
| [Tencent Hunyuan](https://hunyuan.tencent.com) | `tencent` | `https://api.hunyuan.cloud.tencent.com/v1` | `TENCENT_API_KEY` | ✓ OpenAI | Free Hunyuan Lite models. WeChat ecosystem.; Get API key at console.cloud.tencent.com |
| [iFlytek Spark](https://xinghuo.xfyun.cn) | `iflytek` | `https://spark-api-open.xf-yun.com/v1` | `IFLYTEK_API_KEY` | ✓ OpenAI | Spark Lite is free (2 QPS rate-limited), but iFlytek ToS §2.4(3) prohibits programmatic extraction and requires Chinese real-name auth — use with caution.; Get API key at console.xfyun.cn |
| [Baichuan](https://www.baichuan-ai.com) | `baichuan` | `https://api.baichuan-ai.com/v1` | `BAICHUAN_API_KEY` | ✓ OpenAI | Free Baichuan models. Popular Chinese LLM startup.; Get API key at platform.baichuan-ai.com |
| [Yi (01.AI)](https://01.ai) | `yi` | `https://api.lingyiwanwu.com/v1` | `YI_API_KEY` | ✓ OpenAI | No free API tier (2026) — Yi-Light retired; platform.01.ai is pay-as-you-go (Yi-Lightning paid). Open weights are download-only.; Get API key at platform.lingyiwanwu.com |
| [360 AI](https://ai.360.cn) | `360ai` | `https://api.360.cn/v1` | `AI360_API_KEY` | Native / Custom | Free 360 AI Brain models. Major Chinese security company.; Get API key at ai.360.cn |
| [Doubao](https://doubao.com) | `doubao` | `https://ark.cn-beijing.volces.com/api/v3` | `DOUBAO_API_KEY` | ✓ OpenAI | Free Doubao models. ByteDance's chatbot.; Get API key at console.volcengine.com |
| [SenseNova](https://platform.sensenova.cn) | `sensenova` | `https://token.sensenova.cn/v1` | `SENSENOVA_API_KEY` | ✓ OpenAI | Free SenseTime models. Computer vision leader.; Get API key at platform.sensenova.cn; SenseNova registration appears to require a Chinese (+86) phone number for SMS verification — no international sign-up path is documented, so users outside mainland China may be unable to obtain an API key. |
| [Huancheng Public API](https://api.hcnsec.cn) | `hcnsec` | `https://api.hcnsec.cn/v1` | `HCNSEC_API_KEY` | ✓ OpenAI | Xinjiang Huancheng Cybersecurity public LLM API platform: free credits with daily check-ins.; Get API key at api.hcnsec.cn |
| [SEA-LION](https://sea-lion.ai) | `sealion` | `https://api.sea-lion.ai/v1` | `SEALION_API_KEY` | ✓ OpenAI | Permanently free at 10 RPM — AI Singapore's Southeast-Asian models (Llama/Qwen/Gemma SEA-LION).; Sign in at sea-lion.ai with Google (no card, no region wall), create an API key, then paste it here. |
| [Naver CLOVA Studio](https://api.ncloud-docs.com/docs/en/ai-naver-clovastudio-summary) | `clova-studio` | `https://clovastudio.stream.ntruss.com/v3/chat-completions` | `CLOVA_STUDIO_API_KEY` | Native / Custom | All three v3 models are served: HCX-007 (reasoning, text only), HCX-005 (vision — accepts both public image URLs and inline base64 images), and HCX-DASH-002 (lightweight, text only). Requests stream upstream and are accumulated into a JSON body when the client asks for a non-stream… |
| [InternLM (Intern-S1)](https://internlm.intern-ai.org.cn) | `internlm` | `https://chat.intern-ai.org.cn/api/v1` | `INTERNLM_API_KEY` | ✓ OpenAI | Free monthly quota ~1M input / 3M output tokens (~10 RPM) |
| [Ant Ling / Ring (inclusionAI)](https://developer.ant-ling.com/en/docs) | `ant-ling` | `https://api.ant-ling.com/v1` | `ANT_LING_API_KEY` | ✓ OpenAI | 500,000 free tokens per day per account (resets 02:00 UTC+8, no rollover); Register and create an API key at the Ant Ling API console (https://chat.ant-ling.com/open), then paste it here.; the provider is OpenAI-compatible and also exposes an Anthropic-compatible surface. |
| [Sarvam AI](https://docs.sarvam.ai) | `sarvam` | `https://api.sarvam.ai/v1` | `SARVAM_API_KEY` | ✓ OpenAI | ₹1,000 in free signup credits — never expire; Sarvam AI is OpenAI-compatible on /v1. Models are tuned for Indic languages. |
| [PLaMo](https://plamo.preferredai.jp/api) | `plamo` | `https://api.platform.preferredai.jp/v1` | `PLAMO_API_KEY` | ✓ OpenAI | PLaMo is OpenAI-compatible at https://api.platform.preferredai.jp/v1. Built by Preferred Networks and optimized for Japanese. Docs are primarily in Japanese. |
| [Typhoon](https://docs.opentyphoon.ai) | `typhoon` | `https://api.opentyphoon.ai/v1` | `TYPHOON_API_KEY` | ✓ OpenAI | Free API key with a 5 req/s and 200 req/m rate limit.; Typhoon is OpenAI-compatible on /v1. Built by SCB 10X (Thailand); typhoon-v2.5-30b-a3b-instruct is a thai-first, multilingual model. |
| [Amazon Nova](https://nova.amazon.com) | `amazon-nova` | `https://api.nova.amazon.com/v1` | `NOVA_API_KEY` | ✓ OpenAI | Amazon's first-party Nova API, separate from Bedrock. |
| [Meta AI](https://dev.meta.ai) | `meta-ai` | `https://api.meta.ai/v1` | `META_MODEL_API_KEY` | ✓ OpenAI | Meta Muse Spark models on api.meta.ai (distinct from the Llama API). |
| [Moonshot AI (China)](https://platform.moonshot.cn) | `moonshot-cn` | `https://api.moonshot.cn/v1` | `MOONSHOT_CN_API_KEY` | ✓ OpenAI | Kimi models on Moonshot's China endpoint. |
| [Thinking Machines](https://tinker-docs.thinkingmachines.ai/tinker/compatible-apis/anthropic/) | `thinking-machines` | `https://tinker.thinkingmachines.dev/services/tinker-prod/anthropic/api/v1` | `TINKER_API_KEY` | Native / Custom | Anthropic-compatible Tinker API for Thinking Machines models. |
| [Krutrim](https://cloud.olakrutrim.com) | `krutrim` | `https://cloud.olakrutrim.com/v1` | `KRUTRIM_API_KEY` | ✓ OpenAI | Ola Krutrim OpenAI-compatible inference API. |
| [Kimi For Coding](https://www.kimi.ai/code) | `kimi-ai-coding` | `https://api.kimi.ai/coding/v1` | `KIMI_AI_API_KEY` | ✓ OpenAI | Kimi coding plan on kimi.ai (distinct from api.kimi.com). |
| [Alibaba Coding Plan](https://www.alibabacloud.com/help/en/model-studio/coding-plan) | `alibaba-coding-plan` | `https://coding-intl.dashscope.aliyuncs.com/v1` | `ALIBABA_CODING_PLAN_API_KEY` | ✓ OpenAI | International Alibaba Model Studio coding-plan endpoint. |
| [Alibaba Coding Plan (China)](https://help.aliyun.com/zh/model-studio/coding-plan) | `alibaba-coding-plan-cn` | `https://coding.dashscope.aliyuncs.com/v1` | `ALIBABA_CODING_PLAN_CN_API_KEY` | ✓ OpenAI | China Alibaba Model Studio coding-plan endpoint. |
| [Alibaba Token Plan (China)](https://www.alibabacloud.com/help/zh/model-studio/token-plan-overview) | `alibaba-token-plan-cn` | `https://token-plan.cn-beijing.maas.aliyuncs.com/compatible-mode/v1` | `ALIBABA_TOKEN_PLAN_CN_API_KEY` | ✓ OpenAI | China-region Alibaba token plan (Beijing MaaS). |
| [StepFun Step Plan (China)](https://platform.stepfun.com/docs/zh/step-plan/integrations/reasoning-api) | `stepfun-step-plan` | `https://api.stepfun.com/step_plan/v1` | `STEPFUN_STEP_PLAN_API_KEY` | ✓ OpenAI | StepFun Step Plan on the China platform. |
| [StepFun Step Plan (Global)](https://platform.stepfun.ai/docs/en/step-plan/integrations/reasoning-api) | `stepfun-step-plan-global` | `https://api.stepfun.ai/step_plan/v1` | `STEPFUN_GLOBAL_STEP_PLAN_API_KEY` | ✓ OpenAI | StepFun Step Plan on the global platform. |
| [MiniMax Token Plan](https://platform.minimax.io/docs/token-plan/intro) | `minimax-token-plan` | `https://api.minimax.io/anthropic/v1` | `MINIMAX_TOKEN_PLAN_API_KEY` | Native / Custom | Anthropic-compatible MiniMax token plan (minimax.io). |
| [MiniMax Token Plan (China)](https://platform.minimaxi.com/docs/token-plan/intro) | `minimax-cn-token-plan` | `https://api.minimax.cn/anthropic/v1` | `MINIMAX_CN_TOKEN_PLAN_API_KEY` | Native / Custom | Anthropic-compatible MiniMax token plan on minimax.cn. |
| [Tencent TokenHub](https://cloud.tencent.com/document/product/1823/130050) | `tencent-tokenhub` | `https://tokenhub.tencentmaas.com/v1` | `TENCENT_TOKENHUB_API_KEY` | ✓ OpenAI | Tencent MaaS TokenHub for Hunyuan models. |
| [Tencent Token Plan](https://cloud.tencent.com/document/product/1823/130060) | `tencent-token-plan` | `https://api.lkeap.cloud.tencent.com/plan/v3` | `TENCENT_TOKEN_PLAN_API_KEY` | ✓ OpenAI | Tencent Cloud token-plan endpoint (LKEAP). |
| [Aleph Alpha](https://docs.aleph-alpha.com) | `aleph-alpha` | `Custom Pharia deployment` | `ALEPH_ALPHA_API_KEY` | ✓ OpenAI | Chat inference is on your own Pharia deployment, not one public base URL. |
| [WebWright](https://webwright.ai) | `webwright` | `https://webwright.ai/v1` | `WEBWRIGHT_API_KEY` | ✓ OpenAI | Wren R1 chat, transcription and web search behind one OpenAI-compatible base URL. |

## API Gateways & Unified Proxies (130)

| Provider | Slug | API Base URL | Default Env Var | Wire Protocol | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| [OpenRouter](https://openrouter.ai) | `openrouter` | `https://openrouter.ai/api/v1` | `OPENROUTER_API_KEY` | ✓ OpenAI | Auto fallback & provider selection |
| [Opper](https://opper.ai) | `opper` | `https://api.opper.ai/v3/compat` | `OPPER_API_KEY` | ✓ OpenAI | EU-hosted; PII shielding |
| [Axiom](https://axiomstudio.ai) | `axiom` | `https://cloud.axiomstudio.ai/rest/v1/llm-gateway/v1/` | `AXIOM_API_KEY` | ✓ OpenAI | Kubernetes-native enterprise routing |
| [Switchpoint](https://switchpoint.ai) | `switchpoint` | `https://api.ppq.ai` | `SWITCHPOINT_API_KEY` | ✓ OpenAI | Request-aware provider selection |
| [Relace](https://relace.ai) | `relace` | `https://api.relace.ai/v1` | `RELACE_API_KEY` | ✓ OpenAI | Coding APIs; zero data retention default |
| [Moonshot AI](https://api.moonshot.ai/v1) | `moonshot` | `https://api.moonshot.ai/v1` | `MOONSHOT_API_KEY` | ✓ OpenAI | First-party Kimi gateway |
| [OpenInference](https://openinference.ai) | `openinference` | `Tracing / observability` | — | Native / Custom | Execution graph tracing |
| [Weights & Biases](https://wandb.ai) | `wandb` | `https://api.inference.wandb.ai/v1` | `WANDB_API_KEY` | ✓ OpenAI | Experiment tracking |
| [Perceptron](https://perceptron.ai) | `perceptron` | `Custom gateway` | — | Native / Custom | Custom middleware routing |
| [Portkey](https://portkey.ai) | `portkey` | `https://api.portkey.ai/v1` | `PORTKEY_API_KEY` | ✓ OpenAI | Guardrails, caching, observability |
| [LiteLLM](https://github.com/BerriAI/litellm) | `litellm` | `http://localhost:4000/v1` | `LITELLM_MASTER_KEY` | ✓ OpenAI | Open-source; self-host or cloud |
| [Requesty](https://requesty.ai) | `requesty` | `https://router.requesty.ai/v1` | `REQUESTY_API_KEY` | ✓ OpenAI | Auto-failover between providers |
| [Unify.ai](https://unify.ai) | `unify` | `https://api.unify.ai/v0` | `UNIFY_API_KEY` | ✓ OpenAI | Picks optimal provider per query |
| [Helicone](https://helicone.ai) | `helicone` | `https://ai-gateway.helicone.ai/v1` | `HELICONE_API_KEY` | ✓ OpenAI | Observability-first AI gateway |
| [Vercel AI Gateway](https://vercel.com/docs/ai-gateway) | `vercel-ai-gateway` | `https://ai-gateway.vercel.sh/v1` | `VERCEL_AI_GATEWAY_KEY` | ✓ OpenAI | Bundled with Vercel platform |
| [Cloudflare AI Gateway](https://developers.cloudflare.com/ai-gateway/) | `cloudflare-ai-gateway` | `https://gateway.ai.cloudflare.com/v1` | `CLOUDFLARE_API_TOKEN` | ✓ OpenAI | Edge caching; sits in front of APIs |
| [Kong AI Gateway](https://konghq.com/products/kong-ai-gateway) | `kong-ai-gateway` | `Self-hosted / enterprise` | — | Native / Custom | For existing Kong infrastructure |
| [Cortecs](https://cortecs.ai) | `cortecs` | `https://api.cortecs.ai/v1` | `CORTECS_API_KEY` | ✓ OpenAI | OpenCode-supported; EU GDPR-compliant LLM router with speed/cost/balanced routing |
| [OpenCode Zen](https://opencode.ai/zen) | `opencode-zen` | `https://opencode.ai/zen/v1` | `OPENCODE_API_KEY` | ✓ OpenAI | OpenCode-curated models verified for coding agents; use opencode/<model-id> prefix |
| [OpenCode Go](https://opencode.ai/docs/go/) | `opencode-go` | `https://opencode.ai/zen/go/v1` | `OPENCODE_API_KEY` | ✓ OpenAI | OpenCode-supported; low-cost subscription for open coding models; use opencode-go/<model-id> |
| [LLM Gateway](https://llmgateway.io) | `llm-gateway` | `https://api.llmgateway.io/v1` | `LLM_GATEWAY_API_KEY` | ✓ OpenAI | OpenCode-supported; unified API with provider/model routing |
| [ZenMux](https://zenmux.ai) | `zenmux` | `https://zenmux.ai/api/v1` | `ZENMUX_API_KEY` | ✓ OpenAI | OpenCode-supported; enterprise routing across 200+ models |
| [Sakana AI (Fugu)](https://console.sakana.ai) | `sakana-fugu` | `https://api.sakana.ai/v1` | `SAKANA_API_KEY` | ✓ OpenAI | Trained multi-agent orchestrator; routes to frontier LLM pool via single OpenAI-compatible API |
| [Prism API](https://go165.github.io/prism-api-promo/) | `prism-api` | `https://sub2api.558686.xyz/v1` | `PRISM_API_KEY` | ✓ OpenAI | Independent OpenAI-compatible gateway for overseas developers; low-cost GPT-5.5 access and crypto-friendly recharge/voucher options |
| [DiscountedTokens](https://discountedtokens.com) | `discountedtokens` | `https://discountedtokens.com/v1` | `DISCOUNTEDTOKENS_API_KEY` | ✓ OpenAI | Budget resale of GPT-5.x family; OpenAI/Anthropic/Responses compatible; ~80% below retail |
| [XiuRouter](https://router.xiu.ai/) | `xiurouter` | `https://router-api.xiu.ai/v1` | `XIUROUTER_API_KEY` | ✓ OpenAI | Usage-based gateway with OpenAI Chat Completions and Responses, Anthropic Messages, Gemini GenerateContent, scoped keys, and request-level usage and cost records |
| [SAGG](https://api.privatedeskai.com) | `sagg` | `https://api.privatedeskai.com/v1` | `SAGG_API_KEY` | ✓ OpenAI | Multi-provider failover gateway; a flat-rate Super Deal tier ($0.028/1M tokens, separate key) is also available |
| [AIWave](https://aiwave.live/) | `aiwave` | `https://aiwave.live/v1` | `AIWAVE_API_KEY` | ✓ OpenAI | Chinese AI providers with USD billing, dated pricing, and request-level usage records |
| [CLIProxyAPI](https://github.com/router-for-me/CLIProxyAPI) | `cliproxyapi` | `http://localhost:8317/v1` | `CLIPROXYAPI_KEY` | Native / Custom | OpenAI-compatible multi-provider gateway or local proxy. |
| [9router](https://www.npmjs.com/package/9router) | `9router` | `http://localhost:20130/v1` | — | Native / Custom | OpenAI-compatible multi-provider gateway or local proxy. |
| [1min.AI](https://1min.ai) | `oneminai` | `https://api.1min.ai/api/chat-with-ai` | `ONEMINAI_API_KEY` | ✓ OpenAI | Create an API key at https://docs.1min.ai/docs/api/create-api-key, then paste it here.; 1min.ai uses a proprietary chat API (single prompt string + SSE) instead of OpenAI chat/completions. |
| [Cheaper Inference](https://cheaperinference.com) | `cheaperinference` | `https://api.cheaperinference.com/v1` | `CHEAPERINFERENCE_API_KEY` | ✓ OpenAI | Create an API key at https://cheaperinference.com/ (needs the `inference` scope), then paste the ir_live_… token here. |
| [Freebuff](https://freebuff.com) | `freebuff` | `https://www.codebuff.com/api/v1` | `FREEBUFF_API_KEY` | ✓ OpenAI | Free Codebuff / Freebuff AI models.; Enter Freebuff / Codebuff Auth Token (obtained via CLI login or automated harvester).; Token is authenticated against Codebuff upstream session pool. |
| [Charm Hyper](https://hyper.charm.land) | `charm-hyper` | `https://hyper.charm.land/v1` | `CHARM_HYPER_API_KEY` | ✓ OpenAI | 100 free monthly Hypercredits on signup; Create an API key at https://hyper.charm.land, then paste it here as a Bearer token. |
| [AgentRouter](https://agentrouter.org) | `agentrouter` | `https://agentrouter.org/v1` | `AGENTROUTER_API_KEY` | Native / Custom | $200 free credits on signup - multi-model routing gateway; Get $200 free credits at https://agentrouter.org/register — no credit card required. |
| [UnoRouter](https://unorouter.ai) | `unorouter` | `https://api.unorouter.com/v1` | `UNOROUTER_API_KEY` | ✓ OpenAI | Models with the :free suffix do not debit balance; limit is 1 request/minute per free model per user.; Create an API key at https://unorouter.ai, then paste it here as a Bearer token. |
| [Command Code](https://commandcode.ai) | `command-code` | `https://api.commandcode.ai` | `COMMAND_CODE_API_KEY` | ✓ OpenAI | Use a Command Code API key. Requests are sent to Command Code's /provider/v1/chat/completions endpoint.; Create or copy an API key from Command Code, then paste it here as a Bearer token. |
| [Zylo API](https://zyloai.net) | `zylo-api` | `https://api.zyloai.net/v1` | `ZYLO_API_KEY` | ✓ OpenAI | Basic plan: 10 RPM, 7,200 requests/day and 200,000 tokens/day; limited to Basic text models.; Create a free Zylo API key at https://zyloai.net, then use https://api.zyloai.net/v1 as the OpenAI-compatible base URL. |
| [FastRouter](https://fastrouter.ai) | `fastrouter` | `https://api.fastrouter.ai/api/v1` | `FASTROUTER_API_KEY` | ✓ OpenAI | Models with the :free suffix allow 10 requests/day per organization and model; availability may change.; Create a FastRouter API key, then use https://api.fastrouter.ai/api/v1 as the OpenAI-compatible base URL. |
| [LLM.Kiwi](https://llm.kiwi) | `llm-kiwi` | `https://api.llm.kiwi/v1` | `LLM_KIWI_API_KEY` | ✓ OpenAI | Free plan exposes auto and hrLLM; the published 40 requests/hour limit applies to hrLLM.; Create a free LLM.Kiwi key, then use https://api.llm.kiwi/v1 as the OpenAI-compatible base URL. |
| [LiteRouter](https://literouter.com) | `literouter` | `https://api.literouter.com/v1` | `LITEROUTER_API_KEY` | ✓ OpenAI | Free model variants use the :free suffix; daily credit limits vary by model and free input is capped at 5,000 tokens.; Create a LiteRouter API key, then use https://api.literouter.com/v1 as the OpenAI-compatible base URL. |
| [GreenPT](https://greenpt.com) | `greenpt` | `https://api.greenpt.ai/v1` | `GREENPT_API_KEY` | ✓ OpenAI | API subscription is free to create; inference is billed per token. No free inference allowance is published.; Create a GreenPT API key, then use https://api.greenpt.ai/v1 as the OpenAI-compatible base URL. Review jurisdiction, privacy and regional data-transfer requirements before use. |
| [EURouter](https://eurouter.ai) | `eurouter` | `https://api.eurouter.ai/v1` | `EUROUTER_API_KEY` | ✓ OpenAI | Create an EURouter API key, then use https://api.eurouter.ai/v1 as the OpenAI-compatible base URL. Models are served by third-party upstreams listed per model in the EURouter catalog; check each upstream jurisdiction, privacy and data-transfer terms before use. |
| [MNN AI](https://mnnai.ru) | `mnn-ai` | `https://api.mnnai.ru/v1` | `MNN_AI_API_KEY` | ✓ OpenAI | Free plan: $1 monthly credits, 10 RPM and access only to models marked Free.; Create an MNN AI API key, then use the primary https://api.mnnai.ru/v1 OpenAI-compatible endpoint. Review jurisdiction, privacy and regional data-transfer requirements before use. |
| [MegaNova AI](https://meganova.ai) | `meganova-ai` | `https://api.meganova.ai/v1` | `MEGANOVA_AI_API_KEY` | ✓ OpenAI | Free signup without a card. Published Tier 1 per-model quotas total 550 requests/day; they are not a shared global pool, and paid overage can apply if enabled.; Create a MegaNova API key, then use https://api.meganova.ai/v1 as the OpenAI-compatible base URL. |
| [Mixlayer](https://www.mixlayer.com) | `mixlayer` | `https://models.mixlayer.ai/v1` | `MIXLAYER_API_KEY` | ✓ OpenAI | The qwen/qwen3.5-4b-free model is free for prototyping and rate-limited; no fixed public RPM or daily quota is confirmed.; Create a Mixlayer API key, then use https://models.mixlayer.ai/v1 as the OpenAI-compatible base URL. |
| [Speka AI](https://speka.me) | `speka` | `https://speka.me/v1` | `SPEKA_API_KEY` | ✓ OpenAI | Free plan: $1 monthly usage, 10 RPM, one API key and access to open models and the playground; no card required.; Create a Speka API key, then use https://speka.me/v1 as the OpenAI-compatible base URL. Confirm current model availability and overage settings before use. |
| [TokenReply](https://www.tokenreply.com) | `tokenreply` | `https://api.tokenreply.com/v1` | `TOKENREPLY_API_KEY` | ✓ OpenAI | Free-tagged models have model- and campaign-specific daily limits; no fixed global free quota is published.; Create a TokenReply token, then use https://api.tokenreply.com/v1 as the OpenAI-compatible base URL and confirm the selected model's current limit. |
| [Yolo-Auto](https://yolo-auto.com) | `yolo-auto` | `https://yolo-auto.com/v1` | `YOLO_AUTO_API_KEY` | ✓ OpenAI | Free API access is request-limited and intended for testing; no numeric daily quota is published and free access is not promised indefinitely.; Create a yolo_ API key, then use https://yolo-auto.com/v1 as the OpenAI-compatible base URL. |
| [DXNT / DX Token](https://www.dxnt.com) | `dxnt` | `https://www.dxnt.com/v1` | `DXNT_API_KEY` | ✓ OpenAI | Free accounts are documented at 100 calls/day; the quota may increase through invitations and can vary by account.; Create a DXNT API key, then use https://www.dxnt.com/v1 as the OpenAI-compatible base URL. |
| [CloudCode.ONE](https://cloudcode.one) | `cloudcode-one` | `https://api.cloudcode.one/v1` | `CLOUDCODE_ONE_API_KEY` | ✓ OpenAI | Published free models include glm-4.7-flash and glm-4.6v-flash; no numeric quota is published, and key creation may require credit or a coupon.; Create a CloudCode.ONE key, then use https://api.cloudcode.one/v1 as the OpenAI-compatible base URL. Key issuance may require credit or a coupon. |
| [OfoxAI](https://ofox.ai) | `ofoxai` | `https://api.ofox.ai/v1` | `OFOXAI_API_KEY` | ✓ OpenAI | The current catalog advertises 10+ free models without a public numeric quota; review upstream provenance, retention and training terms before production use.; Create an OfoxAI Bearer key, then use https://api.ofox.ai/v1 as the OpenAI-compatible base URL. This integration covers the OpenAI surface only. |
| [ZeroLimitAI](https://www.zerolimitai.com) | `zerolimitai` | `https://www.zerolimitai.com/api/v1` | `ZEROLIMITAI_API_KEY` | ✓ OpenAI | Temporary free trial is advertised, but official pages conflict between 3 and 7 days; a 100-calls/day claim is not treated as permanent.; Create a ZeroLimitAI Bearer token, then use https://www.zerolimitai.com/api/v1 as the OpenAI-compatible base URL. |
| [Helyx AI](https://helyxai.space) | `helyxai` | `https://helyxai.space/v1` | `HELYXAI_API_KEY` | ✓ OpenAI | Operational Free plan documents 100,000 tokens/day; the site's separate 2M+ marketing claim conflicts and is not treated as a quota guarantee.; Create a Helyx AI Bearer key, then use https://helyxai.space/v1 as the OpenAI-compatible base URL. Review terms and data retention first. |
| [Auriko](https://www.auriko.ai) | `auriko` | `https://api.auriko.ai/v1` | `AURIKO_API_KEY` | ✓ OpenAI | Free plan publishes 1,000 Platform RPM and 10,000 BYOK RPM. Platform inference still passes through provider cost; this is not a free-token pool or unlimited free inference.; Create an Auriko key with the ak_ prefix, then use https://api.auriko.ai/v1 as the OpenAI-compatible base URL. BYOK and platform credits have different cost semantics. |
| [Poixe AI](https://poixe.com) | `poixe-ai` | `https://api.poixe.com/v1` | `POIXE_AI_API_KEY` | ✓ OpenAI | Current public free limits are small and model-group specific: 2 RPM/5 RPD for large-cup models and 20 RPM/50 RPD for small-cup models.; Create a Poixe Bearer key, then use https://api.poixe.com/v1 as the OpenAI-compatible base URL. Treat free model provenance and regional availability as experimental. |
| [Chat Oripe](https://api.oriper.com) | `chat-oripe` | `https://api.oriper.com/v1` | `CHAT_ORIPE_API_KEY` | ✓ OpenAI | Official metadata advertises 2M tokens/month, but the public site and documentation were blocked during audit; treat the quota and brand mapping as unconfirmed.; Use https://api.oriper.com/v1 only after confirming the provider's current documentation, terms and key issuance. No quota is guaranteed by this catalog. |
| [FreeInference](https://freeinference.org) | `freeinference` | `https://freeinference.org/v1` | `FREEINFERENCE_API_KEY` | ✓ OpenAI | Free research access without a card; non-Harvard applicants require manual approval and no numeric quota is publicly guaranteed.; Apply for a FreeInference key, then use https://freeinference.org/v1 as the OpenAI-compatible base URL. Terms allow prompt/response logging and possible publication of anonymized research data; never send sensitive or production data. |
| [Free.ai](https://free.ai) | `free-ai` | `https://api.free.ai/v1/chat` | `FREE_AI_API_KEY` | ✓ OpenAI | 30,000 tokens/day cover self-hosted models after email verification. Usage beyond the pool can bill at raw cost, and premium external models are paid.; Create an sk-free- key, then use the nonstandard but OpenAI-shaped https://api.free.ai/v1/chat/ endpoint. Select a self-hosted zero-price model to stay within the free pool. |
| [DGrid](https://dgrid.ai) | `dgrid` | `https://api.dgrid.ai/v1` | `DGRID_API_KEY` | ✓ OpenAI | DGrid Free Models Router: 10 requests/minute and 100 requests/day. A $5 lifetime top-up unlocks up to 20 requests/minute and 1,000 requests/day.; Create a DGrid API key at https://dgrid.ai, then use https://api.dgrid.ai/v1 as the OpenAI-compatible base URL. |
| [Qiniu](https://www.qiniu.com) | `qiniu` | `https://api.qnaigc.com/v1` | `QINIU_API_KEY` | ✓ OpenAI | Create a Qiniu AI inference API key at https://portal.qiniu.com/ai-inference/api-key, then paste it here as a Bearer token. OpenAI-compatible endpoint at https://api.qnaigc.com/v1, proxying DeepSeek, Claude, Kimi and more behind one key. |
| [OrcaRouter](https://www.orcarouter.ai) | `orcarouter` | `https://api.orcarouter.ai/v1` | `ORCAROUTER_API_KEY` | ✓ OpenAI | Create an API key (starts with sk-orca-) at https://www.orcarouter.ai, then paste it as a Bearer token. OpenAI-compatible endpoint at https://api.orcarouter.ai/v1. |
| [Api.airforce](https://api.airforce) | `api-airforce` | `https://api.airforce/v1` | `AIRFORCE_API_KEY` | ✓ OpenAI | 55 free tier models including Grok-3, Claude 3.7, Qwen3, Kimi-K2, Gemini 2.5 Flash, DeepSeek-V3; Get your API key from https://panel.api.airforce — OpenAI-compatible endpoint at https://api.airforce/v1 |
| [CrofAI](https://crof.ai) | `crof` | `https://crof.ai/v1` | `CROF_API_KEY` | ✓ OpenAI | OpenAI-compatible multi-provider gateway or local proxy. |
| [BazaarLink](https://bazaarlink.ai) | `bazaarlink` | `https://bazaarlink.ai/api/v1` | `BAZAARLINK_API_KEY` | ✓ OpenAI | Free tier: 4M tokens/day per account with auto:free routing — zero-cost inference, no credit card required.; Use your BazaarLink API key (starts with sk-bl-) in Authorization: Bearer <key>. OpenAI SDK works with base URL https://bazaarlink.ai/api/v1. Models use provider/model-name format.; Create a free API key at https://bazaarlink.ai — model 'auto:free' routes to zero-cost inference. All models use the provider/… |
| [Synthetic](https://synthetic.new) | `synthetic` | `https://api.synthetic.new/openai/v1` | `SYNTHETIC_API_KEY` | ✓ OpenAI | OpenAI-compatible multi-provider gateway or local proxy. |
| [Kilo Gateway](https://kilo.ai) | `kilo-gateway` | `https://api.kilo.ai/api/gateway` | `KILO_GATEWAY_API_KEY` | ✓ OpenAI | OpenAI-compatible multi-provider gateway or local proxy. |
| [Dahl](https://inference.dahl.global) | `dahl` | `https://inference.dahl.global/v1` | `DAHL_API_KEY` | ✓ OpenAI | Free — MiniMax M2.7, Kimi K2.6. Click 'Add Account' to auto-generate a token, or add your own API key.; Click 'Add Account' to auto-generate a token, or add a manual API key.; Auto-generate a token or paste your own API key.; Dahl auto-generates tokens via https://inference.dahl.global/tokens. No signup needed. Rate limits apply. You can also add your own API key. |
| [FreeTheAi](https://freetheai.xyz) | `freetheai` | `https://api.freetheai.xyz/v1` | `FREETHEAI_API_KEY` | ✓ OpenAI | Free OpenAI-compatible gateway — sign up via Discord for an API key.; Join the FreeTheAi Discord to get your free API key. |
| [g4f.space — Groq](https://g4f.space) | `g4f-groq` | `https://g4f.space/api/groq/v1` | `G4F_GROQ_API_KEY` | ✓ OpenAI | Anonymous access to Groq requires proof-of-work cake credits from g4f.dev/chat; alternatively, use a g4f.dev member API key. Limits vary.; Bake anonymous cake credits at g4f.dev/chat, or use a g4f.dev member key (create one at g4f.dev/members.html).; Its Terms and Privacy links were unavailable when last verified… |
| [g4f.space — Gemini](https://g4f.space) | `g4f-gemini` | `https://g4f.space/api/gemini/v1` | `G4F_GEMINI_API_KEY` | ✓ OpenAI | Anonymous access to Gemini requires proof-of-work cake credits from g4f.dev/chat; alternatively, use a g4f.dev member API key. Limits vary.; Bake anonymous cake credits at g4f.dev/chat, or use a g4f.dev member key (create one at g4f.dev/members.html).; Its Terms and Privacy links were unavailable when last verifi… |
| [g4f.space — Pollinations](https://g4f.space) | `g4f-pollinations` | `https://g4f.space/api/pollinations/v1` | `G4F_POLLINATIONS_API_KEY` | ✓ OpenAI | Anonymous access to Pollinations requires proof-of-work cake credits from g4f.dev/chat; alternatively, use a g4f.dev member API key. Limits vary.; Bake anonymous cake credits at g4f.dev/chat, or use a g4f.dev member key (create one at g4f.dev/members.html).; Its Terms and Privacy links were unavailable when last… |
| [g4f.space — Ollama](https://g4f.space) | `g4f-ollama` | `https://g4f.space/api/ollama/v1` | `G4F_OLLAMA_API_KEY` | ✓ OpenAI | Anonymous access to hosted Ollama requires proof-of-work cake credits from g4f.dev/chat; alternatively, use a g4f.dev member API key. Limits vary.; Bake anonymous cake credits at g4f.dev/chat, or use a g4f.dev member key (create one at g4f.dev/members.html).; Its Terms and Privacy links were unavailable when last… |
| [g4f.space — NVIDIA](https://g4f.space) | `g4f-nvidia` | `https://g4f.space/api/nvidia/v1` | `G4F_NVIDIA_API_KEY` | ✓ OpenAI | Anonymous access to NVIDIA NIM requires proof-of-work cake credits from g4f.dev/chat; alternatively, use a g4f.dev member API key. Limits vary.; Bake anonymous cake credits at g4f.dev/chat, or use a g4f.dev member key (create one at g4f.dev/members.html).; Its Terms and Privacy links were unavailable when last ve… |
| [LLM7.io](https://llm7.io) | `llm7` | `https://api.llm7.io/v1` | `LLM7_API_KEY` | ✓ OpenAI | No signup required - 2 req/s, 20 RPM, 100 req/hr free tier; Use any non-empty key (for example 'unused'). If older built-in models return model_unavailable, use Available Models → Import from /models or Auto-Sync; verified live model: gemini-3.1-flash-lite.; Works without API key (use 'unused' as key). Get free token at token.llm7.io for higher limits. |
| [LlamaGate](https://llamagate.ai) | `llamagate` | `https://llamagate.ai/v1` | `LLAMAGATE_API_KEY` | ✓ OpenAI | OpenAI-compatible multi-provider gateway or local proxy. |
| [Gitlawb Opengateway (MiMo)](https://opengateway.gitlawb.com) | `gitlawb` | `https://opengateway.gitlawb.com/v1/xiaomi-mimo` | `GITLAWB_API_KEY` | ✓ OpenAI | Free MiMo (xiaomi/mimo-v2.5) revoked 2026-05 — Opengateway is now a pay-as-you-go credit gateway; no recurring free model.; Get your API key from Gitlawb Opengateway dashboard. |
| [Gitlawb Opengateway (GMI Cloud)](https://opengateway.gitlawb.com) | `gitlawb-gmi` | `https://opengateway.gitlawb.com/v1/gmi-cloud` | `GITLAWB_GMI_API_KEY` | ✓ OpenAI | Free Nemotron promo ended 2026-06 — the GMI Cloud route is now pay-as-you-go credit only.; Get your API key from Gitlawb Opengateway dashboard. |
| [NanoGPT](https://nano-gpt.com) | `nanogpt` | `https://nano-gpt.com/api/v1` | `NANOGPT_API_KEY` | ✓ OpenAI | OpenAI-compatible multi-provider gateway or local proxy. |
| [LaoZhang AI](https://api.laozhang.ai) | `laozhang` | `https://api.laozhang.ai/v1` | `LAOZHANG_API_KEY` | Native / Custom | OpenAI-compatible multi-provider gateway or local proxy. |
| [b.ai](https://b.ai) | `bai` | `https://api.b.ai/v1` | `BAI_API_KEY` | ✓ OpenAI | Bearer API key for the b.ai OpenAI-compatible LLM gateway (distinct from TheB.AI). Create a key at https://docs.b.ai, then use https://api.b.ai/v1 as the OpenAI-compatible base URL. |
| [FenayAI](https://fenayai.com) | `fenayai` | `https://api.fenayai.com/v1` | `FENAYAI_API_KEY` | Native / Custom | Bearer API key for the FenayAI OpenAI-compatible gateway. |
| [Empower](https://docs.empower.dev) | `empower` | `https://api.empower.dev/v1` | `EMPOWER_API_KEY` | Native / Custom | Bearer API key for the Empower OpenAI-compatible endpoint.; Empower exposes OpenAI-compatible chat on https://app.empower.dev/api/v1 with tool-calling support on empower-functions. |
| [Factory](https://factory.ai) | `factory` | `https://api.factory.ai/v1` | `FACTORY_API_KEY` | ✓ OpenAI | Bearer API key for the Factory OpenAI-compatible gateway.; Get your Factory API key at https://app.factory.ai/settings/api-keys, then paste it as a Bearer token. OpenAI-compatible endpoint at https://api.factory.ai/v1. |
| [BluesMinds](https://www.bluesminds.com) | `bluesminds` | `https://api.bluesminds.com/v1` | `BLUESMINDS_API_KEY` | ✓ OpenAI | Free daily pi credits — supports 200+ models including GPT-4o, GPT-4.1, Claude Sonnet 4.5, Gemini 2.0 Flash, DeepSeek V4, Qwen, Kimi K2; Get your API key at https://www.bluesminds.com — OpenAI-compatible endpoint at https://api.bluesminds.com/v1 with free daily credits. VIP models (Claude Opus 4.5, Gemini 2.5 Pro) consume pi credits. |
| [FreeModel.dev](https://freemodel.dev) | `freemodel-dev` | `https://api.freemodel.dev/v1` | `FREEMODEL_DEV_API_KEY` | ✓ OpenAI | $300 free credits on signup — no credit card required. Access GPT-5.4 and GPT-5.5 (OpenAI's latest flagship models) through an OpenAI-compatible API.; Get $300 free API credits at https://freemodel.dev — no payment info required. OpenAI-compatible endpoint. GPT-5.4 and GPT-5.5 models available. |
| [FreeAIAPIKey](https://freeaiapikey.com) | `freeaiapikey` | `https://api.freeaiapikey.com/v1` | `FREEAI_API_KEY` | ✓ OpenAI | Discounted API proxy for 40+ models including GPT-5, Claude Opus 4.6, Claude Sonnet 4.6, Qwen 3.5. Get your API key at https://freeaiapikey.com/dashboard. Base URL: https://freeaiapikey.com/v1. |
| [OpenAdapter](https://openadapter.dev) | `openadapter` | `https://api.openadapter.in/v1` | `OPENADAPTER_API_KEY` | ✓ OpenAI | Free tier with a generous quota and no credit card — 15+ open-source models with daily quota. Get your API key at https://dashboard.openadapter.in.; Use your OpenAdapter API key in Authorization: Bearer sk-cv-<key>. Fully OpenAI-compatible. API base URL: https://api.openadapter.in/v1.; OpenAdapter exposes an OpenAI-compatible chat completions endpoint at https://api.openadapter.in/v1/chat/completions, aggregating… |
| [DIT.ai](https://dit.ai) | `dit` | `https://api.dit.ai/v1` | `DIT_API_KEY` | ✓ OpenAI | Use your dit.ai API key in Authorization: Bearer <key>. Fully OpenAI-compatible — a drop-in replacement, just change the base URL to https://api.dit.ai/v1.; dit.ai (Distributed Intelligence Trade) is an OpenAI-compatible router/gateway with dynamic per-request pricing, exposing /v1/chat/completions at https://api.dit.ai/v1.; spend/savings analytics live in the dit.ai dashboard. |
| [TokenRouter](https://tokenrouter.com) | `tokenrouter` | `https://api.tokenrouter.com/v1` | `TOKENROUTER_API_KEY` | ✓ OpenAI | Free tier includes the MiniMax 3 model. Get your API key at https://tokenrouter.com.; Use your TokenRouter API key in Authorization: Bearer <key>. Fully OpenAI-compatible. API base URL: https://api.tokenrouter.com/v1.; TokenRouter exposes an OpenAI-compatible chat completions endpoint at https://api.tokenrouter.com/v1/chat/completions, plus a working /v1/models catalog. |
| [Token Kiosk](https://agent-router.gaib.ai) | `token-kiosk` | `https://agent-router.gaib.ai/v1` | `TOKEN_KIOSK_API_KEY` | ✓ OpenAI | Use your Token Kiosk API key in Authorization: Bearer <key>. Fully OpenAI-compatible gateway. API base URL: https://agent-router.gaib.ai/v1.; Token Kiosk is a multi-provider agent LLM routing infrastructure exposing an OpenAI-compatible endpoint at https://agent-router.gaib.ai/v1/chat/completions with auto-fallback and latency routing. |
| [SumoPod](https://ai.sumopod.com) | `sumopod` | `https://ai.sumopod.com/v1` | `SUMOPOD_API_KEY` | ✓ OpenAI | Use your SumoPod API key (sk-...) in Authorization: Bearer <key>. Fully OpenAI-compatible. API base URL: https://ai.sumopod.com/v1.; SumoPod exposes an OpenAI-compatible chat completions endpoint at https://ai.sumopod.com/v1/chat/completions, plus a live /v1/models catalog. |
| [X5Lab](https://x5lab.dev) | `x5lab` | `https://api.x5lab.dev/v1` | `X5LAB_API_KEY` | ✓ OpenAI | Use your X5Lab API key (x5-...) in Authorization: Bearer <key>. Fully OpenAI-compatible. API base URL: https://api.x5lab.dev/v1.; X5Lab exposes an OpenAI-compatible chat completions endpoint at https://api.x5lab.dev/v1/chat/completions, plus a live /v1/models catalog. |
| [Chenzk API](https://chenzk.top) | `chenzk` | `https://chenzk.top/v1` | `CHENZK_API_KEY` | ✓ OpenAI | Create an API key at https://chenzk.top/token, then paste it here as a Bearer token. OpenAI-compatible endpoint at https://chenzk.top/v1, with a live /v1/models catalog. |
| [Kenari](https://kenari.id) | `kenari` | `https://kenari.id/v1` | `KENARI_API_KEY` | ✓ OpenAI | Use your Kenari API key (kn-...) in Authorization: Bearer <key>. Fully OpenAI-compatible. API base URL: https://kenari.id/v1.; Kenari exposes an OpenAI-compatible chat completions endpoint at https://kenari.id/v1/chat/completions, plus a live /v1/models catalog covering Claude, GPT, DeepSeek, GLM, Kimi and more. |
| [NavyAI](https://api.navy) | `navy` | `https://api.navy/v1` | `NAVY_API_KEY` | ✓ OpenAI | Free plan is one shared 150K tokens/day pool at 20 RPM. Each model carries a token multiplier, so heavier models drain the pool faster (grok-4 at 10x is ~15K real tokens/day).; Create a free API key from the NavyAI dashboard, then paste it here as a Bearer token.; OpenAI-compatible endpoint at https://api.navy/v1 with a live /v1/models catalog that exposes per-model token_multiplier and premium flags. Upstream req… |
| [AINative Studio](https://ainative.studio) | `ainative` | `https://api.ainative.studio/api/v1` | `AINATIVE_API_KEY` | ✓ OpenAI | Free tier ~10M tokens/month (claimed) across Qwen3, Llama 4, DeepSeek R1 and more.; Create a free API key at ainative.studio (no card), then paste it here as a Bearer token.; OpenAI-compatible endpoint at https://api.ainative.studio/api/v1 with a public /models catalog (84 models). |
| [Routeway](https://routeway.ai) | `routeway` | `https://api.routeway.ai/v1` | `ROUTEWAY_API_KEY` | ✓ OpenAI | Free models (:free suffix) at ~5 RPM / 200 RPD across Llama, Nemotron, Step and Laguna.; Create a free API key at routeway.ai, then paste it here as a Bearer token.; OpenAI-compatible endpoint at https://api.routeway.ai/v1 with a public /models catalog (236 models). Cloudflare fronts the API and requires a browser-style User-Agent. |
| [NaraRouter](https://bynara.id) | `nara` | `https://router.bynara.id/v1` | `NARA_API_KEY` | ✓ OpenAI | Free plan: one 7M tokens/day bucket per account (15 req/min) across the plan's 8 models; others need credit.; Create a free NaraRouter account, link your Telegram (required before /v1 answers), then paste the key here as a Bearer token.; OpenAI-compatible endpoint at https://router.bynara.id/v1. Free-tier models are pinned |
| [Regolo AI](https://regolo.ai) | `regolo` | `https://api.regolo.ai` | `REGOLO_API_KEY` | ✓ OpenAI | Get your Regolo API key from regolo.ai, then paste it here as a Bearer token.; OpenAI-compatible endpoint at https://api.regolo.ai/v1 with dynamic model discovery (19 models). |
| [Void AI](https://voidai.app) | `void-ai` | `https://api.voidai.app/v1` | `VOID_AI_API_KEY` | ✓ OpenAI | The public model catalog marks some models with a free plan requirement, but access is conditional and no numeric quota is confirmed.; Use https://api.voidai.app/v1 only after confirming authentication, account eligibility and terms. Treat this integration as experimental until the blocked documentation becomes public. |
| [HelixMind](https://helixmind.online) | `helixmind` | `https://helixmind.online/v1` | `HELIXMIND_API_KEY` | ✓ OpenAI | Previously circulated 3 RPM/50 RPD and no-card claims were not confirmed during the 2026-08-02 audit; current quota and billing require account verification.; Create a helix- key and use https://helixmind.online/v1. OpenAI requests use Bearer authentication; the Anthropic-compatible messages endpoint accepts x-api-key. |
| [Logfare](https://logfare.ai) | `logfare` | `https://logfare.ai/v1` | `LOGFARE_API_KEY` | ✓ OpenAI | Free OpenAI-compatible inference — no rate limits, no card. Logfare logs every request (prompts, completions, metadata) for internal research; opt out at /consent. Read https://logfare.ai/tos and https://logfare.ai/privacy before use.; Create a free account at https://logfare.ai/register (username/password, no email verification) to get an instant API key, then paste it here as a Bearer token.; Create a free API k… |
| [TabiToken](https://tabitoken.com) | `tabitoken` | `https://tabitoken.com/v1` | `TABITOKEN_API_KEY` | Native / Custom | Create an sk- key at https://tabitoken.com and use https://tabitoken.com. The Anthropic-compatible /v1/messages endpoint (default) takes x-api-key; /v1/chat/completions takes Bearer. |
| [SeekAi](https://seekai.cc) | `seekai` | `https://seekai.cc/v1` | `SEEKAI_API_KEY` | ✓ OpenAI | Signup credit toward available models; Create an API key at https://seekai.cc, then paste it here as a Bearer token.; Create an API key at https://seekai.cc, then paste it here as a Bearer token. OpenAI-compatible base URL: https://seekai.cc/v1. |
| [Cursor API](https://cursor.com/dashboard/api) | `cursor-api` | `https://api.cursor.com/v1` | `CURSOR_API_KEY` | ✓ OpenAI | Paste a Cursor user API key (crsr_...) from cursor.com/dashboard/api.; no IDE or cursor-agent install is needed. Usage bills to the Cursor plan that owns the key.; Same agent protocol and model catalog as the Cursor IDE provider. |
| [OmniRoute](https://github.com/diegosouzapw/OmniRoute) | `omniroute` | `http://localhost:3000/v1` | `OMNIROUTE_API_KEY` | ✓ OpenAI | Open-source MIT AI gateway (352 providers, 1200+ models). Self-hosted OpenAI-compatible endpoint; quota-aware auto-fallback. |
| [Bifrost](https://github.com/maximhq/bifrost) | `bifrost` | `http://localhost:8080/v1` | — | ✓ OpenAI | Open-source Go gateway; adaptive load balancing, guardrails, virtual keys. |
| [Abacus](https://abacus.ai) | `abacus` | `https://routellm.abacus.ai/v1` | `ABACUS_API_KEY` | ✓ OpenAI | Abacus RouteLLM multi-model router. |
| [Merge Gateway](https://docs.merge.dev/merge-gateway) | `merge-gateway` | `https://api-gateway.merge.dev/v1` | `MERGE_GATEWAY_API_KEY` | ✓ OpenAI | Merge.dev gateway: one key for OpenAI, Anthropic, Google, and Bedrock. |
| [NEAR AI Cloud](https://docs.near.ai/) | `near-ai` | `https://cloud-api.near.ai/v1` | `NEARAI_API_KEY` | ✓ OpenAI | NEAR AI Cloud multi-provider inference API. |
| [SCX.ai](https://platform.scx.ai) | `scx` | `https://api.scx.ai/v1` | `SCX_API_KEY` | ✓ OpenAI | SCX.ai OpenAI-compatible model API. |
| [iFlow](https://platform.iflow.cn) | `iflow` | `https://apis.iflow.cn/v1` | `IFLOW_API_KEY` | ✓ OpenAI | iFlow multi-model API (Qwen, GLM, DeepSeek). |
| [LLMTR](https://llmtr.com) | `llmtr` | `https://llmtr.com/v1` | `LLMTR_API_KEY` | ✓ OpenAI | Turkish and multilingual models plus routed open weights. |
| [ai&](https://docs.aiand.com/) | `aiand` | `https://api.aiand.com/v1` | `AIAND_API_KEY` | ✓ OpenAI | ai& API, including Motif Technologies models. |
| [Inco](https://platform.inco.ai) | `inco` | `https://api.inco.ai/v1` | `INCO_API_KEY` | ✓ OpenAI | Inco routed inference for Kimi, GLM, MiniMax, and DeepSeek. |
| [Pendra](https://pendra.ai) | `pendra` | `https://api.pendra.ai/api/v1` | `PENDRA_API_KEY` | ✓ OpenAI | Pendra OpenAI-compatible router. |
| [TensorX](https://docs.tensorx.ai/) | `tensorx` | `https://api.tensorx.ai/v1` | `TENSORX_API_KEY` | ✓ OpenAI | TensorX multi-model API. |
| [Braintrust AI Gateway](https://www.braintrust.dev/docs/deploy/gateway) | `braintrust` | `https://gateway.braintrust.dev/v1` | `BRAINTRUST_API_KEY` | ✓ OpenAI | Hosted Braintrust gateway for multi-provider models, caching, and logs. |
| [Martian Gateway](https://withmartian.com) | `martian` | `https://api.withmartian.com/v1` | `MARTIAN_API_KEY` | ✓ OpenAI | Martian model router. |
| [TrueFoundry AI Gateway](https://www.truefoundry.com/docs/ai-gateway/making-llm-requests-via-gateway) | `truefoundry` | `https://gateway.truefoundry.ai` | `TRUEFOUNDRY_API_KEY` | ✓ OpenAI | SaaS gateway. Base URL has no /v1 suffix; model ids are provider_account/model. |
| [Orq.ai AI Gateway](https://docs.orq.ai/reference/models/list-router-models) | `orq` | `https://api.orq.ai/v3/router` | `ORQ_API_KEY` | ✓ OpenAI | Orq router. https://my.orq.ai/v3/router accepts the same API. |
| [Neon AI Gateway](https://neon.com) | `neon` | `${NEON_AI_GATEWAY_BASE_URL}/v1` | `NEON_AI_GATEWAY_TOKEN` | ✓ OpenAI | Per-branch gateway. Set NEON_AI_GATEWAY_BASE_URL to that branch host. |
| [CrossModel](https://www.crossmodel.ai/docs) | `crossmodel` | `https://api.crossmodel.ai/v1` | `CROSSMODEL_API_KEY` | ✓ OpenAI | CrossModel multi-provider router. |
| [routing.run](https://docs.routing.run/api-reference/models) | `routing-run` | `https://api.routing.run/v1` | `ROUTING_RUN_API_KEY` | ✓ OpenAI | routing.run model router. |
| [Apache APISIX](https://apisix.apache.org) | `apisix` | `Self-hosted / enterprise` | — | ✓ OpenAI | Self-hosted API gateway. The AI plugins can expose an OpenAI-compatible route. |
| [Envoy Agent Router](https://theagentrouter.ai) | `envoy-agent-router` | `Self-hosted / enterprise` | — | ✓ OpenAI | Envoy AI Gateway, now called Agent Router. Not the agentrouter.org service. |
| [XHuoAPI](https://xhuoapi.ai) | `xhuoapi` | `https://api.xhuoapi.ai/v1` | `XHUOAPI_API_KEY` | ✓ OpenAI | Chinese (DeepSeek, Qwen, GLM, Kimi, Doubao) and global models behind one key. Claude models also accept the Anthropic /v1/messages format. Email-only sign-up. |
| [LinkAGI](https://api.linktoagi.com) | `linkagi` | `https://api.linktoagi.com/v1` | `LINKAGI_API_KEY` | ✓ OpenAI | AI API gateway with CNY usage billing, public model pricing and per-key usage logs. Docs: https://docs.linktoagi.com/. Model IDs are selected from its public catalog; model and account-group access may vary. |
| [BetterToken](https://bettertoken.ai) | `bettertoken` | `https://bettertoken.ai/v1` | `BETTERTOKEN_API_KEY` | ✓ OpenAI | OpenAI- and Anthropic-compatible multi-model LLM gateway; pay-as-you-go; docs https://docs.bettertoken.ai |

## Aggregators & Multi-Provider Routers (20)

| Provider | Slug | API Base URL | Default Env Var | Wire Protocol | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| [AIPlug Fallback Router](https://github.com/memoryblock-io/aiplug) | `fallback` | `Multi-provider failover chain` | `—` | ✓ OpenAI | Automatic failover across multiple providers on 429, timeout, or network outage |
| [AIMLAPI](https://aimlapi.com) | `aimlapi` | `https://api.aimlapi.com/v1` | `AIMLAPI_KEY` | ✓ OpenAI | 300+ models; free tier available |
| [Eden AI](https://edenai.co) | `eden-ai` | `https://api.edenai.co/v2` | `EDENAI_API_KEY` | Native / Custom | Multi-provider under one API |
| [LemonData](https://lemondata.ai) | `lemondata` | `https://api.lemondata.ai/v1` | `LEMONDATA_API_KEY` | ✓ OpenAI | 300+ models; $1 free credits |
| [Coze (ByteDance)](https://coze.com) | `coze` | `https://api.coze.com/v1` | `COZE_API_KEY` | ✓ OpenAI | Bot-builder platform with LLM backends |
| [302.AI](https://302.ai) | `302-ai` | `https://api.302.ai/v1` | `AI302_API_KEY` | ✓ OpenAI | OpenCode-supported; unified OpenAI-compatible gateway for 100+ models |
| [FrogBot](https://frogbot.ai) | `frogbot` | `https://app.frogbot.ai/api` | `FROGBOT_API_KEY` | ✓ OpenAI | OpenCode-supported; unified AI subscription for chat, embeddings, audio, and images |
| [AnyAPI AI](https://anyapi.ai) | `anyapi` | `https://api.anyapi.ai/v1` | `ANYAPI_KEY` | ✓ OpenAI | Free plan: 100,000 ANY Tokens/day and 100 RPM for eligible Free/Basic models; no credit card required.; Create and verify an AnyAPI account, then use https://api.anyapi.ai/v1 as the OpenAI-compatible base URL. |
| [Electron Hub](https://www.electronhub.ai) | `electronhub` | `https://api.electronhub.ai/v1` | `ELECTRONHUB_API_KEY` | ✓ OpenAI | Free plan: 5 RPM, $0.25 weekly credits and 10 Neutrinos/day for :free models; family budgets also apply.; Create a free API key at https://app.electronhub.ai, then use https://api.electronhub.ai/v1 as the OpenAI-compatible base URL. |
| [ChatAnywhere](https://chatanywhere.tech) | `chatanywhere` | `https://api.chatanywhere.org/v1` | `CHATANYWHERE_API_KEY` | ✓ OpenAI | Personal, educational or research use only: public documentation cites 10,000 points/day and 200 requests/day per IP/key; do not use for commercial traffic.; Create a ChatAnywhere key linked to GitHub, then use https://api.chatanywhere.org/v1 outside China. Review the non-commercial terms before enabling it. |
| [PiAPI](https://piapi.ai) | `piapi` | `https://api.piapi.ai` | `PIAPI_KEY` | Native / Custom | Multi-vendor model marketplace under one API key. |
| [GoAPI](https://api.getgoapi.com) | `getgoapi` | `https://api.getgoapi.com/v1` | `GETGOAPI_KEY` | Native / Custom | Multi-vendor model marketplace under one API key. |
| [TheB.AI](https://theb.ai) | `thebai` | `https://api.theb.ai/v1` | `THEBAI_API_KEY` | Native / Custom | Bearer API key for the TheB.AI OpenAI-compatible gateway. |
| [Poe](https://creator.poe.com/api-reference) | `poe` | `https://api.poe.com` | `POE_API_KEY` | ✓ OpenAI | Bearer API key for the Poe OpenAI-compatible API.; Poe exposes OpenAI-compatible chat and responses on https://api.poe.com/v1, with authenticated balance checks on /usage/current_balance. |
| [Naga.ac](https://naga.ac) | `naga-ac` | `https://api.naga.ac/v1` | `NAGA_AC_API_KEY` | ✓ OpenAI | Free models include Nemotron 3 Ultra (free) and Llama 3.3 70B Instruct (Free). Paid models require credits. Google/GitHub/Discord signup.; Get API key at naga.ac — Google/GitHub/Discord signup available.; Models marked :free are publicly listed, but no numeric quota is confirmed. Naga's policy warns that free-tier prompts and outputs may be collected or used for training.; Create a Naga AI Bearer key, then use https://api.naga.ac/v1 as the OpenAI-compatible base URL. Never send sensitive data to the free tier without accepting its training policy. |
| [Jiekou.AI](https://docs.jiekou.ai) | `jiekou` | `https://api.jiekou.ai/openai` | `JIEKOU_API_KEY` | ✓ OpenAI | Jiekou.AI multi-vendor model catalog. |
| [AIHubMix](https://aihubmix.com) | `aihubmix` | `https://aihubmix.com/v1` | `AIHUBMIX_API_KEY` | ✓ OpenAI | AIHubMix OpenAI-compatible aggregator for text, image, and audio models. |
| [EmpirioLabs AI](https://docs.empiriolabs.ai) | `empiriolabs` | `https://api.empiriolabs.ai/v1` | `EMPIRIOLABS_API_KEY` | ✓ OpenAI | EmpirioLabs multi-model inference API. |
| [CometAPI](https://apidoc.cometapi.com/guides/change-base-url-to-cometapi) | `cometapi` | `https://api.cometapi.com/v1` | `COMETAPI_KEY` | ✓ OpenAI | CometAPI OpenAI-compatible aggregator. |
| [ModelRush](https://modelrush.ai) | `modelrush` | `https://api.modelrush.ai/v1` | `MODELRUSH_API_KEY` | ✓ OpenAI | Paid, proprietary multi-model API with prepaid credits. OpenAI-compatible chat; images, video, and audio use separate documented endpoints. Model prices vary by capability. Docs: https://modelrush.ai/docs. Spicy image/video models require adult-access confirmation. |

## IaaS, Bare-Metal & GPU Clouds (63)

| Provider | Slug | API Base URL | Default Env Var | Wire Protocol | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| [Groq](https://console.groq.com) | `groq` | `https://api.groq.com/openai/v1` | `GROQ_API_KEY` | ✓ OpenAI | LPU hardware; extremely fast TTFT |
| [Cerebras](https://cerebras.ai) | `cerebras` | `https://api.cerebras.ai/v1` | `CEREBRAS_API_KEY` | ✓ OpenAI | Wafer-scale engine throughput |
| [SambaNova](https://sambanova.ai) | `sambanova` | `https://api.sambanova.ai/v1` | `SAMBANOVA_API_KEY` | ✓ OpenAI | RDU serving for large models |
| [Together AI](https://together.ai) | `together` | `https://api.together.xyz/v1` | `TOGETHER_API_KEY` | ✓ OpenAI | Large catalog + fine-tuning |
| [Fireworks AI](https://fireworks.ai) | `fireworks` | `https://api.fireworks.ai/inference/v1` | `FIREWORKS_API_KEY` | ✓ OpenAI | Serverless low-latency serving |
| [DeepInfra](https://deepinfra.com) | `deepinfra` | `https://api.deepinfra.com/v1/openai` | `DEEPINFRA_API_KEY` | ✓ OpenAI | Aggressive open-model pricing |
| [Nebius AI Studio](https://studio.nebius.ai) | `nebius` | `https://api.studio.nebius.ai/v1` | `NEBIUS_API_KEY` | ✓ OpenAI | EU infrastructure; Token Factory |
| [SiliconFlow](https://siliconflow.com) | `siliconflow` | `https://api.siliconflow.cn/v1` | `SILICONFLOW_API_KEY` | ✓ OpenAI | Excellent cost/performance (CN) |
| [Inception](https://inceptionlabs.ai) | `inception` | `https://api.inceptionlabs.ai/v1` | `INCEPTION_API_KEY` | ✓ OpenAI | Diffusion language models (dLLMs) |
| [Liquid AI](https://liquid.ai) | `liquid` | `https://inference.liquid.ai/v1` | `LIQUID_API_KEY` | ✓ OpenAI | Hybrid efficient architectures |
| [Friendli](https://friendli.ai) | `friendli` | `https://api.friendli.ai/serverless/v1` | `FRIENDLI_API_KEY` | ✓ OpenAI | Custom checkpoints & private instances |
| [Inceptron](https://inceptron.io) | `inceptron` | `Custom endpoint` | — | Native / Custom | Self-configured model hosting |
| [Infermatic](https://infermatic.ai) | `infermatic` | `https://api.totalgpt.ai` | `INFERMATIC_API_KEY` | ✓ OpenAI | Flat-rate community checkpoints |
| [Mancer](https://mancer.tech) | `mancer` | `https://mancer.tech/oai/v1` | `MANCER_API_KEY` | ✓ OpenAI | Creative / roleplay fine-tunes |
| [Morph](https://morphllm.com) | `morph` | `https://api.morphllm.com/v1` | `MORPH_API_KEY` | ✓ OpenAI | Fast code editing & routing |
| [AionLabs](https://aionlabs.ai) | `aionlabs` | `https://api.aionlabs.ai/v1` | `AION_API_KEY` | ✓ OpenAI | Creative multi-turn fine-tunes |
| [HuggingFace Inference](https://huggingface.co) | `huggingface` | `https://router.huggingface.co/v1` | `HUGGINGFACE_API_KEY` | ✓ OpenAI | Huge model catalog; free tier available |
| [NVIDIA NIM](https://build.nvidia.com) | `nvidia-nim` | `https://integrate.api.nvidia.com/v1` | `NVIDIA_API_KEY` | ✓ OpenAI | NVIDIA inference microservices |
| [Hyperbolic](https://app.hyperbolic.xyz) | `hyperbolic` | `https://api.hyperbolic.xyz/v1` | `HYPERBOLIC_API_KEY` | ✓ OpenAI | Decentralized GPU compute |
| [Lepton AI](https://lepton.ai) | `lepton` | `https://api.lepton.ai/v1` | `LEPTON_API_KEY` | ✓ OpenAI | Fast serverless inference |
| [Kluster.ai](https://kluster.ai) | `kluster` | `https://api.kluster.ai/v1` | `KLUSTER_API_KEY` | ✓ OpenAI | Batch inference specialist |
| [Anyscale Endpoints](https://app.endpoints.anyscale.com) | `anyscale` | `https://api.endpoints.anyscale.com/v1` | `ANYSCALE_API_KEY` | ✓ OpenAI | Ray-based model serving |
| [Replicate](https://replicate.com) | `replicate` | `https://api.replicate.com/v1` | `REPLICATE_API_TOKEN` | Native / Custom | Pay-per-run; image/audio/video too |
| [Inference.net](https://inference.net) | `inference-net` | `https://api.inference.net/v1` | `INFERENCE_NET_API_KEY` | ✓ OpenAI | Decentralized inference network |
| [Arcee AI](https://arcee.ai) | `arcee` | `https://conductor.arcee.ai/v1` | `ARCEE_API_KEY` | ✓ OpenAI | Enterprise fine-tuned models |
| [Glhf.chat](https://glhf.chat) | `glhf` | `https://glhf.chat/api/openai/v1` | `GLHF_API_KEY` | ✓ OpenAI | vLLM-backed; run any HF model with hf: prefix |
| [Ollama Cloud](https://ollama.com) | `ollama-cloud` | `https://ollama.com/api` | `OLLAMA_API_KEY` | Native / Custom | OpenCode-supported; remote Ollama host; pull cloud models locally first |
| [OpenVecta](https://openvecta.com) | `openvecta` | `https://api.openvecta.com/v1` | `OPENVECTA_API_KEY` | ✓ OpenAI | Free credits on signup for OpenAI-compatible inference across LLMs, embeddings, and reasoning models |
| [Openference API](https://openference.com) | `openference-api` | `https://api.openference.com/v1` | `OPENFERENCE_API_KEY` | ✓ OpenAI | Free plan: 3-day trial with open-source models — no credit card required |
| [Nube.sh](https://nube.sh) | `nube` | `https://ai.nube.sh/api/v1` | `NUBE_API_KEY` | ✓ OpenAI | OpenAI-compatible gateway (LiteLLM). Bring your own API key — models are resolved live from the account (passthrough). |
| [Lambda AI](https://lambda.ai) | `lambda-ai` | `https://api.lambda.ai/v1` | `LAMBDA_AI_API_KEY` | ✓ OpenAI | Hosted inference API for open-weight and partner models. |
| [nScale](https://nscale.com) | `nscale` | `https://inference.api.nscale.com/v1` | `NSCALE_API_KEY` | ✓ OpenAI | $5 free credits on signup for inference testing |
| [PublicAI](https://publicai.co) | `publicai` | `https://api.publicai.co/v1` | `PUBLICAI_API_KEY` | ✓ OpenAI | Requires an API key — one-time signup credit, then paid |
| [Featherless AI](https://featherless.ai) | `featherless-ai` | `https://api.featherless.ai/v1` | `FEATHERLESS_AI_API_KEY` | ✓ OpenAI | Free tier available — no credit card required |
| [Predibase](https://predibase.com) | `predibase` | `https://serving.app.predibase.com/v1` | `PREDIBASE_API_KEY` | ✓ OpenAI | $25 free trial credits (30-day validity) |
| [Bytez](https://bytez.com) | `bytez` | `https://api.bytez.com/models/v2/openai/v1` | `BYTEZ_API_KEY` | ✓ OpenAI | $1 free credits, refreshes every 4 weeks |
| [MonsterAPI](https://monsterapi.ai) | `monsterapi` | `https://api.monsterapi.ai/v1` | `MONSTERAPI_KEY` | ✓ OpenAI | One-time signup trial credits for decentralized GPU inference (no recurring free plan). No credit card required.; Get API key at monsterapi.ai |
| [ModelScope](https://modelscope.cn) | `modelscope` | `https://api-inference.modelscope.cn/v1` | `MODELSCOPE_API_KEY` | ✓ OpenAI | Free tier via ModelScope API-Inference — Alibaba account required. |
| [BytePlus ModelArk](https://console.byteplus.com/ark) | `byteplus` | `https://ark.ap-southeast.bytepluses.com/api/v3` | `BYTEPLUS_API_KEY` | ✓ OpenAI | Free credits for new accounts. Seed 2.0, Kimi K2 Thinking, GLM 4.7, GPT-OSS-120B available. |
| [Pollinations AI](https://pollinations.ai) | `pollinations` | `https://gen.pollinations.ai/v1` | `POLLINATIONS_API_KEY` | ✓ OpenAI | Free keyless tier: openai, openai-fast, openai-large, qwen-coder, mistral, deepseek, grok, gemini-flash-lite-3.1, perplexity-fast, perplexity-reasoning. Premium models (claude, gemini, midijourney) require a Pollinations API key from enter.pollinations.ai.; Anonymous/keyless access to the documented free models is best-effort. |
| [Crusoe](https://docs.crusoecloud.com/managed-inference/overview) | `crusoe` | `https://api.inference.crusoecloud.com/v1` | `CRUSOE_API_KEY` | ✓ OpenAI | Crusoe managed inference for open-weight models. |
| [Vultr Inference](https://www.vultr.com) | `vultr` | `https://api.vultrinference.com/v1` | `VULTR_API_KEY` | ✓ OpenAI | Vultr serverless inference, OpenAI-compatible. |
| [CoralBricks](https://www.coralbricks.ai) | `coralbricks` | `https://inference.coralbricks.ai/v1` | `CORAL_API_KEY` | ✓ OpenAI | CoralBricks serverless inference. |
| [Jalapeno Cloud](https://www.jalapeno-cloud.ai) | `jalapeno` | `https://api.jalapeno-cloud.ai/v1` | `JALAPENO_API_KEY` | ✓ OpenAI | Jalapeno Cloud hosted open-weight models. |
| [Berget.AI](https://berget.ai) | `berget` | `https://api.berget.ai/v1` | `BERGET_API_KEY` | ✓ OpenAI | Swedish inference API for open-weight models. |
| [AMD Token Factory](https://developer.amd.com.cn/radeon/tokenfactory) | `amd-token-factory` | `https://developer.amd.com.cn/radeon/api/v1` | `AMD_API_KEY` | ✓ OpenAI | AMD Radeon Token Factory OpenAI-compatible API. |
| [EBCloud](https://www.ebcloud.com) | `ebcloud` | `https://maas-api.ebcloud.com/v1` | `EBCLOUD_API_KEY` | ✓ OpenAI | EBCloud MaaS inference endpoint. |
| [D.Run](https://www.d.run) | `drun` | `https://chat.d.run/v1` | `DRUN_API_KEY` | ✓ OpenAI | D.Run public model inference (China). |
| [Lilac](https://docs.getlilac.com/inference/models) | `lilac` | `https://api.getlilac.com/v1` | `LILAC_API_KEY` | ✓ OpenAI | Lilac hosted open-weight inference. |
| [RunInfra](https://runinfra.ai) | `runinfra` | `https://api.runinfra.ai/v1` | `RUNINFRA_GATEWAY_KEY` | ✓ OpenAI | RunInfra gateway for open-weight models. |
| [AKI.IO](https://aki.io) | `aki` | `https://aki.io/v1` | `AKI_IO_API_KEY` | ✓ OpenAI | AKI.IO OpenAI-compatible inference. |
| [DInference](https://dinference.com) | `dinference` | `https://api.dinference.com/v1` | `DINFERENCE_API_KEY` | ✓ OpenAI | DInference hosted chat models. |
| [Ambient](https://ambient.xyz) | `ambient` | `https://api.ambient.xyz/v1` | `AMBIENT_API_KEY` | ✓ OpenAI | Ambient.xyz hosted inference. |
| [Gcore Everywhere Inference](https://docs.gcore.com/edge-ai/everywhere-inference/ai-models/query-deployed-model) | `gcore` | `https://model-<deployment>-<project>-<account>.ai.gcore.dev/v1` | `GCORE_API_KEY` | ✓ OpenAI | Per-deployment OpenAI endpoint. When auth is on, send the key in X-API-Key. |
| [RunPod Serverless](https://docs.runpod.io/serverless/vllm/openai-compatibility) | `runpod` | `https://api.runpod.ai/v2/{endpoint_id}/openai/v1` | `RUNPOD_API_KEY` | ✓ OpenAI | Replace {endpoint_id}. The model id is the name served by that vLLM worker. |
| [Tinfoil](https://docs.tinfoil.sh) | `tinfoil` | `https://inference.tinfoil.sh/v1` | `TINFOIL_API_KEY` | ✓ OpenAI | Confidential inference with an OpenAI-compatible chat API. |
| [Salad AI Gateway](https://docs.salad.com/ai-gateway/explanation/overview) | `salad` | `https://ai.salad.cloud/v1` | `SALAD_API_KEY` | ✓ OpenAI | Salad pay-per-token AI Gateway (beta). |
| [Infercom](https://api.infercom.ai) | `infercom` | `https://api.infercom.ai/v1` | `INFERCOM_API_KEY` | ✓ OpenAI | Infercom hosted OpenAI-compatible inference. |
| [WAYSCloud](https://docs.wayscloud.services) | `wayscloud` | `https://api.wayscloud.services/v1` | `WAYSCLOUD_API_KEY` | ✓ OpenAI | Nordic inference API. Auth uses X-API-Key; function calling is not implemented yet. |
| [Lyceum](https://docs.lyceum.technology/docs/inference/serverless) | `lyceum` | `https://api.lyceum.technology/openai/v1` | `LYCEUM_API_KEY` | ✓ OpenAI | Lyceum serverless OpenAI-compatible inference. |
| [InferX](https://www.inferx.net) | `inferx` | `https://model.inferx.net/v1` | `INFERX_API_KEY` | ✓ OpenAI | InferX serverless endpoints. Requests need a tenant-scoped API key. |
| [IteraCompute](https://iteracompute.com/docs.html) | `iteracompute` | `https://api.iteracompute.com/v1` | `ITERACOMPUTE_API_KEY` | ✓ OpenAI | IteraCompute hosted models. Access depends on the API key or contract. |
| [CloudRift](https://www.cloudrift.ai) | `cloudrift` | `https://inference.cloudrift.ai/v1` | `CLOUDRIFT_API_KEY` | ✓ OpenAI | CloudRift OpenAI-compatible inference. |

## Enterprise Cloud & Sovereign Infrastructure (43)

| Provider | Slug | API Base URL | Default Env Var | Wire Protocol | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| [AkashML](https://akash.network) | `akashml` | `https://api.akashml.com/v1` | `AKASHML_API_KEY` | ✓ OpenAI | Decentralized GPU marketplace |
| [AtlasCloud](https://atlascloud.ai) | `atlascloud` | `https://api.atlascloud.ai/v1` | `ATLASCLOUD_API_KEY` | ✓ OpenAI | Language + image + video APIs |
| [Chutes](https://chutes.ai) | `chutes` | `https://llm.chutes.ai/v1` | `CHUTES_API_KEY` | ✓ OpenAI | Serverless custom model deploy |
| [Cloudflare Workers AI](https://cloudflare.com) | `cloudflare-workers-ai` | `https://api.cloudflare.com/client/v4/accounts/{id}/ai/v1` | `CLOUDFLARE_API_TOKEN` | ✓ OpenAI | Edge inference; neuron-second billing; needs account ID |
| [DigitalOcean](https://digitalocean.com) | `digitalocean` | `https://inference.do-ai.run/v1/` | `DIGITALOCEAN_API_KEY` | ✓ OpenAI | Integrates with App Platform |
| [GMICloud](https://gmicloud.ai) | `gmicloud` | `https://api.gmi-serving.com/v1` | `GMI_API_KEY` | ✓ OpenAI | Enterprise H100 GPU cloud |
| [io.net](https://io.net) | `io-net` | `https://api.intelligence.io.solutions/api/v1` | `IO_NET_API_KEY` | ✓ OpenAI | DePIN GPU clusters |
| [NextBit](https://nextbit256.com) | `nextbit` | `https://api.nextbit256.com/v1` | `NEXTBIT_API_KEY` | ✓ OpenAI | EU data centers (Spain) |
| [Novita](https://novita.ai) | `novita` | `https://api.novita.ai/openai/v1` | `NOVITA_API_KEY` | ✓ OpenAI | Model APIs + agent sandboxes |
| [Parasail](https://parasail.io) | `parasail` | `https://api.saas.parasail.io/v1` | `PARASAIL_API_KEY` | ✓ OpenAI | Serverless + dedicated instances |
| [Phala](https://phala.network) | `phala` | `POST /v1/chat/completions` | `PHALA_API_KEY` | Native / Custom | TEE confidential execution |
| [Poolside](https://poolside.ai) | `poolside` | `https://divers.poolsi.de/openai/v1/` | `POOLSIDE_API_KEY` | ✓ OpenAI | Code generation focus |
| [Venice](https://venice.ai) | `venice` | `https://api.venice.ai/api/v1` | `VENICE_API_KEY` | ✓ OpenAI | Privacy-first; web3 auth |
| [Wafer](https://wafer.ai) | `wafer` | `https://pass.wafer.ai/v1` | `WAFER_API_KEY` | ✓ OpenAI | Fast serverless; Claude Code compatible |
| [Azure OpenAI](https://azure.microsoft.com) | `azure-openai` | `https://<resource>.openai.azure.com/openai/v1` | `AZURE_OPENAI_API_KEY` | ✓ OpenAI | Enterprise Microsoft integration |
| [Google Vertex AI](https://cloud.google.com/vertex-ai) | `vertex-ai` | `https://us-central1-aiplatform.googleapis.com/v1/projects` | `GOOGLE_APPLICATION_CREDENTIALS` | ✓ OpenAI | VPC, IAM, enterprise procurement |
| [Amazon Bedrock](https://aws.amazon.com/bedrock) | `bedrock` | `https://bedrock-runtime.<region>.amazonaws.com` | `AWS_ACCESS_KEY_ID` | Native / Custom | AWS-native; IAM & VPC integration |
| [Baseten](https://baseten.co) | `baseten` | `https://model-{id}.api.baseten.co/v1` | `BASETEN_API_KEY` | ✓ OpenAI | MLOps with Truss packaging |
| [Clarifai](https://clarifai.com) | `clarifai` | `Custom endpoints` | `CLARIFAI_API_KEY` | Native / Custom | Data labeling & classification |
| [Scaleway](https://console.scaleway.com) | `scaleway` | `https://api.scaleway.ai/v1` | `SCALEWAY_API_KEY` | ✓ OpenAI | European cloud; GDPR-compliant |
| [OVHcloud AI](https://www.ovhcloud.com/en/public-cloud/ai-endpoints/) | `ovhcloud` | `https://oai.endpoints.kepler.ai.cloud.ovh.net/v1` | `OVH_AI_API_KEY` | ✓ OpenAI | EU-hosted open models |
| [GitHub Models](https://github.com/marketplace/models) | `github-models` | `https://models.inference.ai.azure.com` | `GITHUB_TOKEN` | ✓ OpenAI | Free tier with GitHub PAT |
| [Modal](https://modal.com) | `modal` | `https://<app>.modal.run/v1` | `MODAL_TOKEN_ID` | ✓ OpenAI | Serverless GPU; deploy your own models |
| [Azure Cognitive Services](https://azure.microsoft.com/products/ai-services) | `azure-cognitive-services` | `https://<resource>.cognitiveservices.azure.com/openai/v1` | `AZURE_COGNITIVE_SERVICES_API_KEY` | ✓ OpenAI | OpenCode-supported; separate from Azure OpenAI; set AZURE_COGNITIVE_SERVICES_RESOURCE_NAME |
| [GitLab Duo](https://about.gitlab.com/gitlab-duo/) | `gitlab-duo` | `https://gitlab.com/api/v4/ai` | `GITLAB_TOKEN` | Native / Custom | OpenCode-supported; OAuth or PAT; Premium/Ultimate; set GITLAB_INSTANCE_URL for self-hosted; GitLab personal access token for the public Code Suggestions API. Configure a self-hosted base URL when not using gitlab.com. |
| [GitHub Copilot](https://github.com/features/copilot) | `github-copilot` | `https://api.githubcopilot.com` | `GITHUB_TOKEN` | ✓ OpenAI | OpenCode-supported; OAuth via /connect; separate from GitHub Models marketplace API |
| [SAP AI Core](https://www.sap.com/products/artificial-intelligence/ai-core.html) | `sap-ai-core` | `https://api.ai.<region>.<landscape>.ml.hana.ondemand.com/v2` | `AICORE_SERVICE_KEY` | Native / Custom | OpenCode-supported; 40+ models via BTP; service key JSON auth |
| [STACKIT AI Model Serving](https://www.stackit.de/en/product/stackit-ai-model-serving) | `stackit` | `https://api.openai-compat.model-serving.eu01.onstackit.cloud/v1` | `STACKIT_API_KEY` | ✓ OpenAI | OpenCode-supported; EU sovereign hosting for Llama, Mistral, Qwen |
| [Snowflake Cortex](https://docs.snowflake.com/en/user-guide/snowflake-cortex/cortex-llm-rest-api) | `snowflake-cortex` | `https://<account>.snowflakecomputing.com/api/v2/cortex/v1` | `SNOWFLAKE_CORTEX_TOKEN` | ✓ OpenAI | OpenCode-supported; OAuth or PAT; Claude/OpenAI families with tool calling |
| [IBM watsonx.ai Gateway](https://www.ibm.com/products/watsonx-ai) | `watsonx` | `https://us-south.ml.cloud.ibm.com/ml/v1` | `WATSONX_API_KEY` | Native / Custom | Use your watsonx bearer token. Base URL can be https://<region>.ml.cloud.ibm.com/ml/gateway/v1/ or a self-managed /ml/gateway/v1 endpoint.; The watsonx model gateway exposes OpenAI-compatible /chat/completions and /models under /ml/gateway/v1. |
| [OCI Generative AI](https://www.oracle.com/artificial-intelligence/generative-ai) | `oci` | `https://inference.generativeai.us-chicago-1.oci.oraclecloud.com` | `OCI_API_KEY` | Native / Custom | Use your OCI Generative AI API key or IAM bearer token. Base URL can be https://inference.generativeai.<region>.oci.oraclecloud.com/openai/v1/.; OCI exposes OpenAI-compatible chat and responses endpoints. |
| [Vertex AI Partners](https://cloud.google.com/vertex-ai) | `vertex-partner` | `https://us-central1-aiplatform.googleapis.com/v1/projects` | `VERTEX_PARTNER_API_KEY` | Native / Custom | Provide the same Service Account JSON used for Vertex AI partner models. |
| [Heroku AI](https://www.heroku.com) | `heroku` | `https://us.inference.heroku.com/v1` | `HEROKU_API_KEY` | ✓ OpenAI | Enterprise or regional cloud inference. |
| [Databricks](https://www.databricks.com) | `databricks` | `https://adb-0000000000000000.0.azuredatabricks.net/serving-endpoints` | `DATABRICKS_API_KEY` | ✓ OpenAI | Enterprise or regional cloud inference. |
| [DataRobot](https://docs.datarobot.com) | `datarobot` | `https://app.datarobot.com/api/v2` | `DATAROBOT_API_KEY` | Native / Custom | Use your DataRobot API token. Optional Base URL can be the account root (for LLM Gateway) or a deployment URL under /api/v2/deployments/<id>.; The default gateway catalogs active models from /genai/llmgw/catalog/. Deployment URLs are also supported for direct OpenAI-compatible chat requests. |
| [Dasha Compute](https://www.getdasha.com/compute) | `dasha-compute` | `Open alpha` | — | Native / Custom | OpenAI-compatible API on a network of Apple-silicon Macs; providers paid per job in USDC. |
| [Hetzner](https://docs.hetzner.com/general/company-and-policy/experiments/inference/) | `hetzner` | `https://inference.hetzner.com/api/v1` | `HETZNER_API_KEY` | ✓ OpenAI | Hetzner experimental OpenAI-compatible inference API. |
| [evroc](https://docs.evroc.com/products/think/) | `evroc` | `https://models.think.evroc.com/v1` | `EVROC_API_KEY` | ✓ OpenAI | evroc Think sovereign inference in the EU. |
| [CloudFerro Sherlock](https://docs.sherlock.cloudferro.com/) | `cloudferro` | `https://api-sherlock.cloudferro.com/openai/v1` | `CLOUDFERRO_SHERLOCK_API_KEY` | ✓ OpenAI | CloudFerro Sherlock EU inference, including Bielik. |
| [SCNet Token Plan](https://www.scnet.cn/ac/openapi/doc/2.0/moduleapi/plans/token-plan.html) | `scnet` | `https://api.scnet.cn/api/llm/v1` | `SCNET_API_KEY` | ✓ OpenAI | China SCNet supercomputing token-plan LLM API. |
| [IONOS AI Model Hub](https://docs.ionos.com/cloud/ai/ai-model-hub/how-tos/tool-integration) | `ionos` | `https://openai.inference.de-txl.ionos.com/v1` | `IONOS_API_TOKEN` | ✓ OpenAI | IONOS Cloud OpenAI-compatible Model Hub in Germany. |
| [Infomaniak AI Services](https://www.infomaniak.com/en/hosting/ai-services/open-source-models) | `infomaniak` | `https://api.infomaniak.com/2/ai/{product_id}/openai/v1` | `INFOMANIAK_API_KEY` | ✓ OpenAI | Swiss AI Services. Replace {product_id} with your AI product id. |
| [Yandex Cloud AI Studio](https://yandex.cloud/en/docs/ai-studio/) | `yandex` | `https://ai.api.cloud.yandex.net/v1` | `YANDEX_API_KEY` | ✓ OpenAI | OpenAI-compatible. Model URIs look like gpt://<folder_ID>/yandexgpt/latest. |

## Local Runtimes & Offline Servers (28)

| Provider | Slug | API Base URL | Default Env Var | Wire Protocol | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| [Mock Transport](https://github.com/memoryblock-io/aiplug) | `mock` | `In-memory (zero network)` | `—` | ✓ OpenAI | Built-in offline testing, stream chunk simulation, zero network calls |
| [Ollama](https://ollama.com) | `ollama` | `http://localhost:11434/v1` | — | ✓ OpenAI | Easiest local setup; 50+ models |
| [LM Studio](https://lmstudio.ai) | `lm-studio` | `http://localhost:1234/v1` | — | ✓ OpenAI | Best GUI; drag-and-drop models |
| [llama.cpp](https://github.com/ggml-org/llama.cpp) | `llama-cpp` | `http://localhost:8080/v1` | — | ✓ OpenAI | Foundation for most local tools |
| [Jan.ai](https://jan.ai) | `jan` | `http://localhost:1337/v1` | — | ✓ OpenAI | 100% offline desktop app |
| [vLLM](https://github.com/vllm-project/vllm) | `vllm` | `http://localhost:8000/v1` | — | ✓ OpenAI | Production-grade local serving |
| [LocalAI](https://localai.io) | `localai` | `http://localhost:8080/v1` | — | ✓ OpenAI | Drop-in OpenAI API replacement |
| [Atomic Chat](https://atomicchat.ai) | `atomic-chat` | `http://127.0.0.1:1337/v1` | — | ✓ OpenAI | OpenCode-supported; desktop app with local OpenAI-compatible server |
| [MLX Gemma 26B](https://github.com/ml-explore/mlx) | `mlx-gemma` | `http://localhost:${MLX_GEMMA_PORT}/v1` | — | ✓ OpenAI | No API key required. Runs mlx-lm server locally on port 11435. Requires uv and mlx-lm installed. Model: mlx-community/gemma-4-26B-A4B-it-qat-q4_0-mlx-aligned (~15.9GB peak memory). |
| [MLX Qwen 3.8 27B](https://github.com/ml-explore/mlx) | `mlx-qwen` | `http://localhost:${MLX_QWEN_PORT}/v1` | — | ✓ OpenAI | No API key required. Runs mlx-lm server locally on port 11436. Requires uv and mlx-lm installed. Model: maglun/Qwen3.8-27B-MLX-Mixed-3.80bpw (~13.1GB peak memory). |
| [Lemonade Server](https://lemonade-server.ai) | `lemonade` | `http://localhost:13305/api/v1` | — | ✓ OpenAI | API key optional. Configure the local Lemonade OpenAI-compatible base URL (default: http://localhost:13305/api/v1). |
| [Llamafile](https://github.com/Mozilla-Ocho/llamafile) | `llamafile` | `http://127.0.0.1:8080/v1` | — | ✓ OpenAI | API key optional. Configure the local Llamafile OpenAI-compatible base URL (default: http://127.0.0.1:8080/v1). |
| [NVIDIA Triton](https://developer.nvidia.com/triton-inference-server) | `triton` | `http://localhost:8000/v1` | — | ✓ OpenAI | API key optional. Configure the Triton OpenAI-compatible base URL (default: http://localhost:8000/v1). |
| [Docker Model Runner](https://docs.docker.com/ai/model-runner) | `docker-model-runner` | `http://localhost:12434/v1` | — | ✓ OpenAI | API key optional. Configure the local Docker Model Runner OpenAI-compatible base URL (default: http://localhost:12434/v1). |
| [XInference](https://inference.readthedocs.io) | `xinference` | `http://localhost:9997/v1` | — | ✓ OpenAI | API key optional. Configure the local XInference OpenAI-compatible base URL (default: http://localhost:9997/v1). |
| [oobabooga](https://github.com/oobabooga/text-generation-webui) | `oobabooga` | `http://localhost:5000/v1` | — | ✓ OpenAI | API key optional. Configure the local oobabooga OpenAI-compatible base URL (default: http://localhost:5000/v1). |
| [SD WebUI](https://github.com/AUTOMATIC1111/stable-diffusion-webui) | `sdwebui` | `http://localhost:7860` | — | Native / Custom | No API key required. Configure the local WebUI base URL (default: http://localhost:7860). |
| [ComfyUI](https://github.com/comfyanonymous/ComfyUI) | `comfyui` | `http://localhost:8188` | — | Native / Custom | No API key required. Configure the local ComfyUI base URL (default: http://localhost:8188). |
| [Muse Code (Meta)](https://github.com/meta-llama/llama-stack) | `muse-code` | `http://localhost:8321/v1` | — | ✓ OpenAI | Use your META_API_KEY env var as a Bearer token. Muse Code CLI uses the OpenAI Responses API wire format (POST /responses).; Muse Code is OpenAI-compatible. |
| [SGLang](https://docs.sglang.io) | `sglang` | `http://localhost:30000/v1` | — | ✓ OpenAI | Local OpenAI-compatible server. Default port 30000. Model id is the served model. |
| [LMDeploy](https://lmdeploy.readthedocs.io/en/stable/llm/api_server.html) | `lmdeploy` | `http://localhost:23333/v1` | — | ✓ OpenAI | Local OpenAI-compatible api_server. Default port 23333. |
| [KoboldCpp](https://github.com/LostRuins/koboldcpp) | `koboldcpp` | `http://localhost:5001/v1` | — | ✓ OpenAI | Local GGUF server. OpenAI routes are under /v1. Default port 5001. |
| [TabbyAPI](https://github.com/theroyallab/tabbyAPI) | `tabbyapi` | `http://localhost:5000/v1` | — | ✓ OpenAI | Local exllama server. Default port 5000, the same port oobabooga uses. |
| [Sonar Engine](https://sonar.dphn.ai) | `sonar-engine` | `http://127.0.0.1:2242/v1` | — | ✓ OpenAI | Local inference server, formerly Aphrodite Engine. OpenAI-compatible on port 2242. |
| [GPT4All](https://github.com/nomic-ai/gpt4all/wiki/Local-API-Server) | `gpt4all` | `http://localhost:4891/v1` | — | ✓ OpenAI | GPT4All desktop local server. Enable it in Settings. Default port 4891. |
| [OpenVINO Model Server](https://docs.openvino.ai) | `openvino` | `http://localhost:8000/v1` | — | ✓ OpenAI | Local OpenVINO Model Server OpenAI front end. Default REST port 8000, also used by vLLM. Model id is the name configured on the server. |
| [MLX-LM](https://github.com/ml-explore/mlx-lm) | `mlx-lm` | `http://localhost:8080/v1` | — | ✓ OpenAI | Generic mlx_lm.server on port 8080. Separate from the MLX Gemma and MLX Qwen entries, which use their own ports. |
| [Privatemode AI](https://docs.privatemode.ai) | `privatemode` | `http://localhost:8080/v1` | `PRIVATEMODE_API_KEY` | ✓ OpenAI | Confidential inference. The OpenAI client talks to the local encryption proxy on port 8080, not the hosted URL directly. |

## Search & Web Retrieval APIs (19)

| Provider | Slug | API Base URL | Default Env Var | Wire Protocol | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| [Perplexity Search](https://docs.perplexity.ai/guides/search-quickstart) | `perplexity-search` | `https://api.perplexity.ai` | `PERPLEXITY_SEARCH_API_KEY` | Native / Custom | Same API key as Perplexity (pplx-...) |
| [Serper Search](https://serper.dev) | `serper-search` | `https://google.serper.dev` | `SERPER_SEARCH_API_KEY` | Native / Custom | API key from serper.dev dashboard |
| [Brave Search](https://brave.com/search/api) | `brave-search` | `https://api.search.brave.com/res/v1` | `BRAVE_SEARCH_API_KEY` | Native / Custom | Subscription token from Brave Search API dashboard |
| [Exa Search](https://exa.ai) | `exa-search` | `https://api.exa.ai` | `EXA_SEARCH_API_KEY` | Native / Custom | API key from dashboard.exa.ai |
| [Tavily Search](https://tavily.com) | `tavily-search` | `https://api.tavily.com` | `TAVILY_SEARCH_API_KEY` | Native / Custom | API key from app.tavily.com (format: tvly-...) |
| [AnySearch](https://anysearch.com) | `anysearch-search` | `https://api.anysearch.com` | `ANYSEARCH_SEARCH_API_KEY` | Native / Custom | Optional API key from anysearch.com (as_sk_...) - free 1000/day; keyless tier has lower limits |
| [Firecrawl](https://firecrawl.dev) | `firecrawl` | `https://api.firecrawl.dev/v1` | `FIRECRAWL_API_KEY` | Native / Custom | API key from firecrawl.dev/app/api-keys (or set your self-hosted Firecrawl base URL); Free tier: 1,000 credits/month. Powers /v1/web/fetch and /v1/search. |
| [Google Programmable Search](https://developers.google.com/custom-search/v1/overview) | `google-pse-search` | `https://www.googleapis.com/customsearch/v1` | `GOOGLE_PSE_SEARCH_API_KEY` | Native / Custom | Requires a Google API key and your Programmable Search Engine ID (cx) |
| [Nimble Search](https://docs.nimbleway.com/nimble-sdk/web-tools/search) | `nimble-search` | `https://api.webit.live` | `NIMBLE_SEARCH_API_KEY` | Native / Custom | Bearer API key from the Nimble dashboard |
| [Linkup Search](https://docs.linkup.so) | `linkup-search` | `https://api.linkup.so` | `LINKUP_SEARCH_API_KEY` | Native / Custom | Bearer API key from the Linkup dashboard |
| [SearchAPI](https://www.searchapi.io/docs/google) | `searchapi-search` | `https://www.searchapi.io/api/v1/search` | `SEARCHAPI_KEY` | Native / Custom | API key from SearchAPI (query param or Bearer auth) |
| [You.com Search](https://you.com/business/api) | `youcom-search` | `https://api.ydc-index.io` | `YOUCOM_SEARCH_API_KEY` | Native / Custom | X-API-Key from the You.com platform dashboard |
| [SearXNG Search](https://docs.searxng.org) | `searxng-search` | `http://localhost:8080` | `SEARXNG_SEARCH_API_KEY` | Native / Custom | API key is optional. Set your SearXNG base URL. Some instances may require a bearer token for access. |
| [X Search (Grok)](https://docs.x.ai/developers/tools/x-search) | `x-search` | `https://api.x.ai/v1` | `X_SEARCH_API_KEY` | Native / Custom | SuperGrok OAuth (xai-oauth) or xAI API key. This is Grok X Search, not the X Developer MCP. |
| [Xquik X Search](https://docs.xquik.com) | `xquik-search` | `https://api.xquik.com` | `XQUIK_SEARCH_API_KEY` | Native / Custom | Xquik API key (xq_...). Search is metered per returned post; the catalog estimate uses 5 results. |
| [Ollama Search](https://ollama.com/settings/keys) | `ollama-search` | `https://ollama.com/api` | `OLLAMA_SEARCH_API_KEY` | Native / Custom | Same API key as Ollama Cloud (from ollama.com/settings/keys) |
| [Context7 (library docs)](https://context7.com) | `context7` | `https://context7.com` | `CONTEXT7_API_KEY` | Native / Custom | API key optional (ctx7sk-...) — anonymous tier works without a key; a key raises the rate limit |
| [Jina Reader (r.jina.ai)](https://jina.ai/reader) | `jina-reader` | `https://r.jina.ai` | `JINA_READER_API_KEY` | Native / Custom | Bearer API key for r.jina.ai URL-to-markdown (/v1/web/fetch only). Does not serve /v1/embeddings or /v1/rerank. The same Jina token as Foundation API works; Reader / r.jina.ai only — not embeddings or rerank. Free tier: 1M fetches/month. |
| [TinyFish Fetch](https://docs.tinyfish.ai/fetch-api) | `tinyfish` | `https://api.tinyfish.ai` | `TINYFISH_API_KEY` | Native / Custom | X-API-Key from agent.tinyfish.ai/api-keys; Fetch does not use TinyFish credits. |

## Audio, Speech-to-Text & Text-to-Speech (15)

| Provider | Slug | API Base URL | Default Env Var | Wire Protocol | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| [Deepgram](https://deepgram.com) | `deepgram` | `https://api.deepgram.com/v1` | `DEEPGRAM_API_KEY` | Native / Custom | Speech-to-text or text-to-speech API. See official docs for keys and model IDs. |
| [AssemblyAI](https://assemblyai.com) | `assemblyai` | `https://api.assemblyai.com/v2` | `ASSEMBLYAI_API_KEY` | Native / Custom | Speech-to-text or text-to-speech API. See official docs for keys and model IDs. |
| [Soniox](https://soniox.com) | `soniox` | `https://api.soniox.com` | `SONIOX_API_KEY` | Native / Custom | Speech-to-text or text-to-speech API. See official docs for keys and model IDs. |
| [ElevenLabs](https://elevenlabs.io) | `elevenlabs` | `https://api.elevenlabs.io/v1` | `ELEVENLABS_API_KEY` | Native / Custom | Speech-to-text or text-to-speech API. See official docs for keys and model IDs. |
| [Cartesia](https://cartesia.ai) | `cartesia` | `https://api.cartesia.ai` | `CARTESIA_API_KEY` | Native / Custom | Speech-to-text or text-to-speech API. See official docs for keys and model IDs. |
| [Fish Audio](https://fish.audio) | `fishaudio` | `https://api.fish.audio` | `FISHAUDIO_API_KEY` | Native / Custom | Speech-to-text or text-to-speech API. See official docs for keys and model IDs. |
| [PlayHT](https://play.ht) | `playht` | `https://api.play.ht/api/v2` | `PLAYHT_API_KEY` | Native / Custom | Speech-to-text or text-to-speech API. See official docs for keys and model IDs. |
| [Inworld](https://inworld.ai) | `inworld` | `https://api.inworld.ai` | `INWORLD_API_KEY` | Native / Custom | Speech-to-text or text-to-speech API. See official docs for keys and model IDs. |
| [AWS Polly](https://aws.amazon.com/polly) | `aws-polly` | `https://polly.us-east-1.amazonaws.com` | `AWS_POLLY_API_KEY` | Native / Custom | Use AWS Secret Access Key as API key; set providerSpecificData.accessKeyId and optional region. |
| [Gladia](https://gladia.io) | `gladia` | `https://api.gladia.io/v2` | `GLADIA_API_KEY` | Native / Custom | Speech-to-text or text-to-speech API. See official docs for keys and model IDs. |
| [Rev AI](https://www.rev.ai) | `rev-ai` | `https://api.rev.ai` | `REV_AI_API_KEY` | Native / Custom | Speech-to-text or text-to-speech API. See official docs for keys and model IDs. |
| [Speechmatics](https://www.speechmatics.com) | `speechmatics` | `https://asr.api.speechmatics.com/v2` | `SPEECHMATICS_API_KEY` | Native / Custom | Free tier — 8 hours/month, no credit card required. Batch (async) mode only. |
| [Hume AI](https://dev.hume.ai/docs/text-to-speech-tts/overview) | `hume` | `https://api.hume.ai` | `HUME_API_KEY` | Native / Custom | Speech and voice API, including Octave TTS. |
| [Rime](https://docs.rime.ai) | `rime` | `https://users.rime.ai/v1` | `RIME_API_KEY` | Native / Custom | Text-to-speech API. |
| [Resemble AI](https://docs.resemble.ai/welcome) | `resemble` | `https://app.resemble.ai/api/v2` | `RESEMBLE_API_KEY` | Native / Custom | Voice cloning and TTS. Voices are project-specific; this is not an OpenAI chat API. |

## Image & Video Generation (20)

| Provider | Slug | API Base URL | Default Env Var | Wire Protocol | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| [Veo AI Free](https://veoaifree.com) | `veoaifree-web` | `https://veoaifree.com/wp-admin/admin-ajax.php` | — | ✓ OpenAI | Free video generation — VEO 3.1, Seedance. 6 requests/hour.; No auth required. Rate limited to 6 requests/hour per IP. |
| [Agnes AI](https://agnes-ai.com) | `agnes` | `https://apihub.agnes-ai.com/v1` | `AGNES_API_KEY` | ✓ OpenAI | Permanently free API - no credit card required.; Get API key at agnes-ai.com |
| [Runway](https://docs.dev.runwayml.com) | `runwayml` | `https://api.dev.runwayml.com/v1` | `RUNWAYML_API_KEY` | Native / Custom | Use your Runway API key in Authorization: Bearer <key>.; Runway video generation is task-based. |
| [KIE.AI](https://kie.ai) | `kie` | `https://api.kie.ai/v1` | `KIE_API_KEY` | ✓ OpenAI | Image or video generation API. |
| [Haiper](https://haiper.ai) | `haiper` | `https://api.haiper.ai/v1` | `HAIPER_API_KEY` | ✓ OpenAI | Get API key at haiper.ai/haiper-api |
| [Leonardo AI](https://leonardo.ai) | `leonardo` | `https://cloud.leonardo.ai/api/rest/v1` | `LEONARDO_API_KEY` | ✓ OpenAI | Get API key at leonardo.ai/developer |
| [Ideogram](https://ideogram.ai) | `ideogram` | `https://api.ideogram.ai` | `IDEOGRAM_API_KEY` | ✓ OpenAI | Get API key at ideogram.ai/docs/api |
| [Magnific](https://www.magnific.com) | `magnific` | `https://api.magnific.com/v1/ai/mystic` | `MAGNIFIC_API_KEY` | ✓ OpenAI | One-time ~€5 API credit for new accounts; pay-per-use afterward.; Get an API key at magnific.com/user/api-keys (header x-magnific-api-key). Legacy Freepik developer keys still work. |
| [Suno](https://suno.ai) | `suno` | `https://studio-api.suno.ai/api/generate/v2` | `SUNO_API_KEY` | ✓ OpenAI | Paste session cookie from suno.ai (Clerk auth) |
| [Udio](https://udio.com) | `udio` | `https://www.udio.com/api/generate-proxy` | `UDIO_API_KEY` | ✓ OpenAI | Paste session cookie from udio.com (Supabase auth) |
| [Fal.ai](https://fal.ai) | `fal-ai` | `https://fal.run` | `FAL_AI_API_KEY` | Native / Custom | Image or video generation API. |
| [Stability AI](https://stability.ai) | `stability-ai` | `https://api.stability.ai` | `STABILITY_AI_API_KEY` | Native / Custom | Image or video generation API. |
| [Black Forest Labs](https://blackforestlabs.ai) | `black-forest-labs` | `https://api.bfl.ai` | `BLACK_FOREST_LABS_API_KEY` | Native / Custom | Image or video generation API. |
| [Recraft](https://recraft.ai) | `recraft` | `https://external.api.recraft.ai/v1` | `RECRAFT_API_KEY` | Native / Custom | Image or video generation API. |
| [Topaz](https://topazlabs.com) | `topaz` | `https://api.topazlabs.com` | `TOPAZ_API_KEY` | Native / Custom | Image or video generation API. |
| [Segmind](https://segmind.com) | `segmind` | `https://api.segmind.com/v1` | `SEGMIND_API_KEY` | Native / Custom | Free trial credits on signup, no credit card required (per Segmind's public docs).; Use your Segmind API key in the x-api-key header.; Segmind exposes 200+ hosted image and video models (Flux, SDXL, SD3, Kandinsky, Wan, Hunyuan, LTX, Kling, ...) under a single POST /v1/<model> REST call per model. |
| [DeepAI](https://deepai.org) | `deepai` | `https://api.deepai.org` | `DEEPAI_API_KEY` | Native / Custom | Use your DeepAI API key. Get one at deepai.org — requires a Pro subscription ($9.99/mo).; DeepAI uses per-endpoint REST calls (e.g. /api/text2img) instead of OpenAI chat/completions. |
| [Luma AI](https://docs.lumalabs.ai/docs/api) | `luma` | `https://api.lumalabs.ai/dream-machine/v1` | `LUMA_API_KEY` | Native / Custom | Dream Machine video generation API. |
| [Bria AI](https://docs.bria.ai/image-generation) | `bria` | `https://engine.prod.bria-api.com/v1` | `BRIA_API_KEY` | Native / Custom | Image generation and editing API. |
| [Runware](https://docs.runware.ai) | `runware` | `https://api.runware.ai/v1` | `RUNWARE_API_KEY` | Native / Custom | Multimodal task-array API, not OpenAI chat completions. |

## Dedicated Embeddings & Vector Providers (5)

| Provider | Slug | API Base URL | Default Env Var | Wire Protocol | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| [Voyage AI](https://www.voyageai.com) | `voyage` | `https://api.voyageai.com/v1` | `VOYAGE_API_KEY` | Native / Custom | Top-tier retrieval embeddings & rerankers |
| [Jina AI (Foundation API)](https://jina.ai) | `jina-ai` | `https://api.jina.ai/v1` | `JINA_AI_API_KEY` | Native / Custom | 10M free tokens on signup (non-commercial), no credit card required; Bearer API key for api.jina.ai — embeddings, rerank, classify, segment, and search. Dashboard keys take precedence over JINA_AI_API_KEY. This is not the Reader / r.jina.ai card and does not fetch URLs. |
| [Nomic](https://nomic.ai) | `nomic` | `https://api-atlas.nomic.ai/v1` | `NOMIC_API_KEY` | Native / Custom | Free Nomic Embed API. Open-source embeddings, no credit card required.; Get API key at atlas.nomic.ai |
| [Mixedbread AI](https://www.mixedbread.com) | `mixedbread` | `https://api.mixedbread.com/v1` | `MIXEDBREAD_API_KEY` | Native / Custom | Free-tier API key via signup, no credit card required.; Bearer API key for the Mixedbread embeddings API. |
| [Pinecone Inference](https://docs.pinecone.io/guides/index-data/indexing-overview) | `pinecone` | `https://api.pinecone.io` | `PINECONE_API_KEY` | Native / Custom | Embedding and rerank API, not a chat completions endpoint. |

## OAuth & Developer Platforms (22)

| Provider | Slug | API Base URL | Default Env Var | Wire Protocol | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| [GitHub Enterprise Copilot](https://docs.github.com/en/copilot) | `ghe-copilot` | `GitHub Enterprise host (device-flow OAuth)` | — | Native / Custom | Enter your GHE instance URL (e.g., https://ghe.company.com) in provider settings, then authenticate via device flow. |
| [xAI OAuth (Grok)](https://x.ai) | `xai-oauth` | `OAuth (provider-specific)` | — | Native / Custom | Sign in with xAI to use api.x.ai models such as Grok 4.5. This is separate from Grok Build JWT sessions, which use cli-chat-proxy.grok.com and grok-build model aliases. |
| [Openference](https://openference.com) | `openference` | `https://api.openference.com/v1` | — | ✓ OpenAI | Free plan: 3-day trial with open-source models — no credit card required; Sign in with your Openference account to route requests through api.openference.com. An active plan is required for inference — OAuth may authenticate but return 402 without one. |
| [Grok Build](https://x.ai) | `grok-cli` | `https://cli-chat-proxy.grok.com/v1` | — | ✓ OpenAI | Sign in with your browser, or paste your ~/.grok/auth.json (or the JWT access token) from the Grok Build CLI; refresh_token is rotated automatically either way. |
| [Qoder](https://qoder.com) | `qoder` | `https://api.qoder.com/v1` | — | ✓ OpenAI | OAuth / IDE subscription. Sign in through the official CLI or app; no separate API key in most cases. |
| [Antigravity CLI](https://antigravity.google) | `agy` | `OAuth (provider-specific)` | — | Native / Custom | Import your Antigravity CLI (`agy`) login (paste/upload its token file), auto-detect a local CLI login, or sign in with Google. Shares the Antigravity backend (incl. Claude models). |
| [Kiro AI](https://kiro.dev) | `kiro` | `https://codewhisperer.us-east-1.amazonaws.com/generateAssistantResponse` | — | Native / Custom | Free tier: 50 credits/month (~25K–100K tokens). ⚠️ Kiro ToS prohibits third-party proxy/harness use. |
| [Amazon Q](https://aws.amazon.com/q/developer) | `amazon-q` | `OAuth (provider-specific)` | — | Native / Custom | Uses the same AWS Builder ID or imported refresh-token flow as Kiro, but keeps Amazon Q connections separate. |
| [Claude Code](https://docs.anthropic.com/en/docs/claude-code) | `claude-code` | `https://api.anthropic.com/v1` | — | Native / Custom | OAuth / IDE subscription. Sign in through the official CLI or app; no separate API key in most cases. |
| [Antigravity](https://antigravity.google) | `antigravity` | `OAuth (provider-specific)` | — | Native / Custom | OAuth / IDE subscription. Sign in through the official CLI or app; no separate API key in most cases. |
| [OpenAI Codex](https://developers.openai.com/codex) | `codex` | `https://chatgpt.com/backend-api/codex` | — | ✓ OpenAI | OAuth / IDE subscription. Sign in through the official CLI or app; no separate API key in most cases. |
| [Cursor IDE](https://cursor.com) | `cursor` | `https://api2.cursor.sh` | — | Native / Custom | OAuth / IDE subscription. Sign in through the official CLI or app; no separate API key in most cases. |
| [Zed IDE](https://zed.dev) | `zed` | `OAuth (provider-specific)` | — | Native / Custom | Zed stores LLM provider credentials (OpenAI, Anthropic, Google, Mistral, xAI) in the OS keychain. Use the Import button below to discover and import them automatically. |
| [Zed Hosted Models](https://zed.dev) | `zed-hosted` | `https://cloud.zed.dev` | — | ✓ OpenAI | Sign in with your Zed account (native-app sign-in). Distinct from the 'Zed IDE' credential-import entry above: this proxies chat completions through Zed's own hosted model aggregator (cloud.zed.dev), fronting A… |
| [Trae](https://trae.ai) | `trae` | `https://core-normal.trae.ai/api/remote/v1` | — | ✓ OpenAI | Trae is an AI-native IDE by ByteDance (SOLO remote agent). Authorize via trae.ai in the popup, or sign in at solo.trae.ai and paste the Cloud-IDE-JWT (sent as 'Authorization: Cloud-IDE-JWT <token>', ~14-day lifetime) as the access token; web_id/biz_user_id/user_unique_id/scope/tenant/region propagate via providerSpecificData. No headless refresh for pasted tokens — re-paste on expiry. |
| [Kimi Code CLI](https://www.kimi.com/code) | `kimi-coding` | `OAuth (provider-specific)` | — | Native / Custom | Sign in with the same Kimi account used by Kimi Code CLI. |
| [Kilo Code](https://kilocode.ai) | `kilocode` | `https://api.kilo.ai/api/openrouter` | — | ✓ OpenAI | OAuth / IDE subscription. Sign in through the official CLI or app; no separate API key in most cases. |
| [Cline](https://cline.bot) | `cline` | `https://api.cline.bot/api/v1` | — | ✓ OpenAI | OAuth / IDE subscription. Sign in through the official CLI or app; no separate API key in most cases. |
| [ClinePass](https://cline.bot/cline-pass) | `clinepass` | `https://api.cline.bot/api/v1` | — | ✓ OpenAI | ClinePass is Cline's $9.99/mo subscription bundling 10 open coding models. Sign in with your Cline account (same login as the Cline CLI/IDE), or paste a direct ClinePass API key (app.cline.bot → Settings → API Keys). A ClinePass subscription unlocks the cline-pass/* models. Reuses the Cline WorkOS OAuth flow. |
| [Devin Desktop](https://devin.ai) | `devin-desktop` | `https://server.codeium.com` | — | ✓ OpenAI | Paste an existing Devin API key from an authenticated Devin session. Key export availability and steps vary by Devin version and account. |
| [Devin CLI](https://cli.devin.ai) | `devin-cli` | `OAuth (provider-specific)` | — | Native / Custom | Requires the Devin CLI binary. Run `devin auth login` to authenticate, or provide your WINDSURF_API_KEY. Install: https://cli.devin.ai |
| [CodeBuddy CN](https://copilot.tencent.com) | `codebuddy-cn` | `https://copilot.tencent.com/v2` | — | ✓ OpenAI | Tencent CodeBuddy CN (copilot.tencent.com). Sign in via the official CLI device-code flow, or paste a direct API key (sent as Authorization: Bearer). Catalog: GLM / Kimi / MiniMax / DeepSeek / Hunyuan. |

## Session & Web-Based Endpoints (34)

| Provider | Slug | API Base URL | Default Env Var | Wire Protocol | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| [ChatGPT Web (Clean Room)](https://chatgpt.com) | `chatgpt-web` | `https://chatgpt.com` | — | ✓ OpenAI | Paste Playwright-compatible storage-state JSON exported from a logged-in chatgpt.com browser context. Cookie headers and individual token values are not accepted. |
| [ChatGPT Web (Codex)](https://chatgpt.com) | `chatgpt-web-codex` | `https://chatgpt.com` | — | ✓ OpenAI | Paste the full ChatGPT Cookie header. |
| [Grok Web (Subscription)](https://grok.com) | `grok-web` | `https://grok.com/rest/app-chat/conversations/new` | — | ✓ OpenAI | Paste the full grok.com cookie line from DevTools → Application → Cookies. Include both `sso` and `sso-rw` (e.g. `sso=...; sso-rw=...`) — Grok's anti-bot rejects `sso` on its own. |
| [Gemini Web (Free)](https://gemini.google.com) | `gemini-web` | `https://gemini.google.com/app` | — | ✓ OpenAI | Paste the full cookie header, the __Secure-1PSID value, or the JSON export containing cookies from gemini.google.com. Include __Secure-1PSIDTS and __Secure-1PSIDCC when available. |
| [Perplexity Web (Pro/Max)](https://www.perplexity.ai) | `perplexity-web` | `https://www.perplexity.ai/rest/sse/perplexity_ask` | — | ✓ OpenAI | Paste your __Secure-next-auth.session-token cookie value from perplexity.ai |
| [Blackbox Web (Subscription)](https://app.blackbox.ai) | `blackbox-web` | `https://app.blackbox.ai/api/chat` | — | ✓ OpenAI | Paste your __Secure-authjs.session-token value or full cookie header from app.blackbox.ai |
| [Muse Spark Web (Meta AI)](https://www.meta.ai) | `muse-spark-web` | `https://www.meta.ai/api/graphql` | — | ✓ OpenAI | Free with login — Meta AI platform with Llama models.; Paste your ecto_1_sess cookie AND the ecto1:... WS auth token from meta.ai. Capture the ecto1: token in DevTools → Network → WS → the clippy request's Authorization query param. Example: ecto_1_sess=4240a308...NVDg0; ecto1:ABCD... |
| [Claude Web](https://claude.ai) | `claude-web` | `https://claude.ai/api/organizations` | — | ✓ OpenAI | Paste your session cookie from claude.ai |
| [DeepSeek Web](https://chat.deepseek.com) | `deepseek-web` | `https://chat.deepseek.com/api/v0/chat/completion` | — | ✓ OpenAI | Paste your userToken from chat.deepseek.com — DevTools → Application → Local Storage → userToken |
| [Microsoft Copilot Web](https://copilot.microsoft.com) | `copilot-web` | `Web cookie / browser session` | — | Native / Custom | Paste the access_token from an authenticated copilot.microsoft.com request (DevTools → Network → Authorization), or export a HAR while logged in |
| [Microsoft 365 Copilot (BizChat)](https://m365.cloud.microsoft/chat) | `copilot-m365-web` | `Web cookie / browser session` | — | Native / Custom | Sign in at m365.cloud.microsoft/chat, then open DevTools → Network → filter 'WS' → click the Chathub WebSocket connection. Copy both the access_token query parameter AND the account-specific Chathub path segment from its request URL (wss://…/Chathub/<path>?…&access_token=…). It is NOT an Authorization: Bearer header on an XHR/Fetch request. The token is short-lived; this is an unofficial integration. Optional: sto… |
| [t3.chat (Pro/Free)](https://t3.chat) | `t3-web` | `https://t3.chat/api/chat` | — | ✓ OpenAI | Free tier gives limited model access. Pro ($8/month) unlocks 50+ models.; Open t3.chat in your browser, log in, then open DevTools → Application → Local Storage → https://t3.chat. Copy the value of 'convex-session-id'. Also open DevTools → Network, copy the Cookie header from any request. Paste both values here. See provider setup docs for a step-by-step guide. |
| [Inner.ai (Subscription)](https://app.innerai.com) | `inner-ai` | `https://chatapi.innerai.com/chat` | — | ✓ OpenAI | Paste your token cookie and email separated by a space: open DevTools → Application → Cookies → .innerai.com, copy the token value, then append a space and your Inner.ai login email. Example: eyJhbG... user@example.com |
| [Adapta.org (Adapta One Web)](https://agent.adapta.one) | `adapta-web` | `https://agent.adapta.one/api/chat/stream/v1` | — | ✓ OpenAI | Paste your __client cookie value from .clerk.agent.adapta.one (DevTools → Application → Cookies) |
| [Arena (Free)](https://arena.ai) | `lmarena` | `https://arena.ai/nextjs-api/stream/create-evaluation` | — | ✓ OpenAI | Free model comparison platform (formerly LMArena) at arena.ai — Direct-chat catalog of chat models (GPT, Claude, Gemini, Llama, …). No subscription required.; Paste the full Cookie header from arena.ai (DevTools → Network → request → Cookie). Include arena-auth-prod-v1.0/.1… and cf_clearance/__cf_bm when present.; if Arena still 403s, set providerSpecificData.recaptchaV3Toke… |
| [Tencent Yuanbao (Free)](https://yuanbao.tencent.com) | `yuanbao-web` | `https://yuanbao.tencent.com/api/chat` | — | ✓ OpenAI | Free consumer web session — DeepSeek V3/R1 and Hunyuan / Hunyuan-T1, optional web search. No subscription required. Rate limits apply.; Log in to yuanbao.tencent.com, then paste the full Cookie header (DevTools → Network → any /api request → Request Headers → Cookie). It must contain hy_user and hy_token. |
| [Tencent AI Studio (Free)](https://aistudio.tencent.ai) | `tencent-aistudio-web` | `https://aistudio.tencent.ai/api/chat` | — | ✓ OpenAI | Free web session on Tencent AI Studio (aistudio.tencent.ai) — Direct chat with Hunyuan models (hy3-g, HunyuanDefault, Hunyuan3D). Cookie authentication.; Log in to aistudio.tencent.ai, open DevTools -> Network, copy any request Cookie header containing session tokens. |
| [HuggingChat (Free)](https://huggingface.co/chat) | `huggingchat` | `https://huggingface.co/chat/conversation` | — | ✓ OpenAI | Free LLM chat — no subscription required. Rate limits apply.; Paste the full Cookie header from huggingface.co/chat (DevTools → Network → /chat/conversation → Request Headers → Cookie). It should include hf-chat and may also include token / aws-waf-token. |
| [Poe Web (Subscription)](https://poe.com) | `poe-web` | `Web cookie / browser session` | — | Native / Custom | Paste your p-b cookie value from poe.com (DevTools → Application → Cookies → p-b) |
| [Venice Web (Privacy)](https://venice.ai) | `venice-web` | `Web cookie / browser session` | — | Native / Custom | Paste your session cookie from venice.ai (DevTools → Application → Cookies) |
| [v0 Vercel Web (Code Gen)](https://v0.dev) | `v0-vercel-web` | `Web cookie / browser session` | — | Native / Custom | Paste your session cookie from v0.dev (DevTools → Application → Cookies) |
| [Kimi Web](https://www.kimi.ai) | `kimi-web` | `https://www.kimi.ai` | — | ✓ OpenAI | Paste access_token from www.kimi.ai DevTools → Application → Local Storage. A legacy kimi-auth cookie is also accepted. |
| [Dola Web (ByteDance)](https://www.dola.com) | `doubao-web` | `https://www.dola.com/chat/completion` | — | ✓ OpenAI | Paste the full Cookie header from www.dola.com. It should include sessionid, ttwid, and s_v_web_id. If s_v_web_id is unavailable, fp=verify_... from a chat/completion request URL can be used as a fallback. |
| [Gemini Business (Enterprise)](https://business.gemini.google) | `gemini-business` | `https://business.gemini.google/home` | — | ✓ OpenAI | Free for Google Workspace enterprise accounts — enterprise Gemini models (Pro, Flash, image, video) via direct StreamGenerate HTTP API. No subscription required, just enterprise SSO.; From your enterprise account: open business.gemini.google/home/cid/{your-cid}, then copy __Secure-1PSID and __Secure-1PSIDTS cookies from DevTools → Application → Cookies. Paste as a cookie header below. |
| [ZenMux Free (Web)](https://zenmux.ai) | `zenmux-free` | `https://zenmux.ai/api/anthropic/v1` | — | ✓ OpenAI | Free tier (5 Flows/5h, 38.64 Flows/week) — DeepSeek V3.2, GLM 4.7 Flash Free and more. No subscription required.; Login at zenmux.ai, then export all cookies using EditThisCookie or Cookie-Editor and paste the full Cookie header string here. Refresh every ~30 days. |
| [TinyCMS Web (Free/Sub)](https://site.tinycms.xyz) | `tinycms-web` | `https://gov.freegpt.win/api/openai/oneapi/v1` | — | ✓ OpenAI | Free tier has access to GPT 5.4, Gemini 3.5, and Grok 4.20 models. No login required. Subscription grants 300 requests/day for advanced models.; Go to site.tinycms.xyz, open DevTools → Application → Local Storage, copy the value of 'app-config-uuid' (starts with 'R'), and paste it here. |
| [Z.ai Web](https://chat.z.ai) | `zai-web` | `https://chat.z.ai` | — | ✓ OpenAI | Consumer web session for the four models currently visible in chat.z.ai. Distinct from the API-key zai/glm providers.; Copy the "token" value from chat.z.ai → DevTools → Application → Local Storage. Do not copy cookies |
| [PromptQL (Unofficial/Experimental)](https://prompt.ql.app) | `promptql` | `https://data.prompt.ql.app/promptql/playground-v2-hge/v1/graphql` | — | ✓ OpenAI | Paste the Bearer JWT from prompt.ql.app DevTools → Network → graphql → Authorization (token only). Optional projectId + session Cookie for refresh. |
| [Notion AI Web (Unofficial/Experimental)](https://www.notion.so) | `notion-web` | `https://app.notion.com/api/v3/runInferenceTranscript` | — | ✓ OpenAI | Paste only the token_v2 cookie VALUE from app.notion.com (DevTools → Application → Cookies → token_v2). Do not paste token_v2= or the full Cookie header. Workspace is auto-detected; space_id / notion_user_id are optional. |
| [Adobe Firefly (Image/Video)](https://firefly.adobe.com) | `adobe-firefly` | `Web cookie / browser session` | — | Native / Custom | RECOMMENDED: firefly.adobe.com signed-in → F12 → Network → click firefly-3p.ff.adobe.io (generate-async or models/discovery) → Request Headers → Authorization → copy the token AFTER 'Bearer ' (starts with eyJ…). Cookie-only from firefly.adobe.com mints a GUEST token → 401/403; only multi-domain IMS cookies (adobelogin.com) or that Bearer JWT work. Unofficial/experimental media + Limits. |
| [HyperAgent (Unofficial/Experimental)](https://hyperagent.com) | `hyperagent` | `https://hyperagent.com/api/threads` | — | ✓ OpenAI | Paste the full Cookie header from hyperagent.com (DevTools → Network → any request → Request Headers → Cookie). Session cookies power chat + billing usage. |
| [Conol (Unofficial/Experimental)](https://conol.ai) | `conol-web` | `https://conol.ai/api/sessions` | — | ✓ OpenAI | Use browser sign-in, or paste the full Cookie header from conol.ai. The __Secure-better-auth.session_token cookie is required. |
| [MaxAI](https://www.maxai.co) | `maxai` | `https://api.maxai.me` | — | ✓ OpenAI | Sign in once (email code or browser) to mint a MaxAI access token. |
| [UC (uncensored.com)](https://uncensored.com) | `uc` | `https://internal-6.pubyar.com` | — | ✓ OpenAI | Sign in once with an email code to bootstrap a UC (uncensored.com) subscription session.; you only re-run the email login about once a month when the subscription session rolls over. |

## Free & No-Auth Endpoints (10)

| Provider | Slug | API Base URL | Default Env Var | Wire Protocol | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| [Devin CLI Agentic Bridge](https://docs.devin.ai/work-with-devin/devin-cli) | `devin-cli-agentic` | `No-auth public endpoint` | — | Native / Custom | Authentication is owned by the official Devin CLI in its isolated bridge volume.; This provider accepts only the official Devin CLI over local ACP stdio and never falls back to another provider. |
| [OpenCode Free](https://opencode.ai) | `opencode` | `https://opencode.ai/zen/v1` | — | ✓ OpenAI | No API key required — public OpenCode endpoint with Kimi, GLM, Qwen, MiMo, MiniMax models.; No API key required — uses OpenCode's public free endpoint.; OpenCode Free uses the public OpenCode endpoint (https://opencode.ai/zen/v1). No signup or API key needed. Rate limits apply. |
| [DuckDuckGo AI Chat](https://duckduckgo.com/duckchat) | `duckduckgo-web` | `https://duck.ai/duckchat/v1/chat` | — | ✓ OpenAI | Free — anonymous access to multiple AI models via DuckDuckGo.; No credentials required — DuckDuckGo AI Chat is anonymous and free. |
| [Cloudflare AI Playground](https://playground.ai.cloudflare.com) | `cloudflare-playground` | `https://playground.ai.cloudflare.com` | — | ✓ OpenAI | Free — Cloudflare's AI Playground: GLM 5.2, Kimi K2.7 Code, DeepSeek V4 Pro, gpt-oss-120B and 16 more. No account, no API key.; No credentials required — anonymous browser sessions over a reverse-engineered cf_agent WebSocket protocol (Playwright transport).; Cloudflare AI Playground uses a reverse-engineered anonymous WebSocket protocol (no official API). Requires Playwright with a Chromium browser on first reque… |
| [Chipotle Pepper AI (Free)](https://amelia.chipotle.com) | `chipotle` | `https://amelia.chipotle.com` | — | ✓ OpenAI | Free — Chipotle's Pepper AI (IPsoft Amelia). Anonymous sessions, no API key. Rate-limited.; No credentials required. Uses Chipotle's public support chatbot via reverse-engineered SockJS/STOMP protocol. |
| [Augment (Auggie CLI)](https://augmentcode.com) | `auggie` | `No-auth public endpoint` | — | Native / Custom | Local passthrough — runs the Augment CLI (`auggie`) on this machine.; Augment (Auggie CLI) requires the `auggie` binary installed and authenticated locally (`auggie login`). |
| [ZCode (GLM Coding Plan)](https://zcode.z.ai) | `zcode` | `No-auth public endpoint` | — | Native / Custom | The local ZCode app-server uses the existing builtin:zai-coding-plan login.; ZCode runs locally through its native app-server. |
| [OpenAI Codex (App-Server)](https://developers.openai.com/codex/cli) | `codex-app-server` | `No-auth public endpoint` | — | Native / Custom | The Codex CLI app-server manages its own ChatGPT sign-in (~/.codex/auth.json, auto-refreshed). Use u201cSign in with ChatGPTu201d if the CLI is not yet authenticated.; OpenAI Codex (App-Server) drives the Codex CLI's local app-server (JSON-RPC over WebSocket). Requires the codex CLI reachable at the… |
| [UncloseAI](https://uncloseai.com) | `uncloseai` | `https://hermes.ai.unturf.com/v1` | — | ✓ OpenAI | Free forever — no signup, no credit card. OpenAI-compatible endpoints.; No auth required. API accepts any non-empty string as key for identification. If older built-in models return 404, use Available Models → Import from /models or Auto-Sync; verified live model: solidrust/Hermes-3-Llama-3.1-8B-AWQ.; UncloseAI needs no API key. API accepts any non-empty string as key for identification. If older built-in models r… |
| [AI Horde](https://aihorde.net) | `aihorde` | `https://oai.aihorde.net/v1` | — | ✓ OpenAI | Crowdsourced inference from volunteer GPUs. Throughput is a shared queue, not a quota: there is no RPM/RPD cap, but waits grow when the network is busy.; No API key required — uses AI Horde's documented anonymous key. Adding a free aihorde.net key is optional and only buys higher queue priority (kudos).; AI Horde routes to volunteer-run workers, so chat and image jobs can take minutes and tool calling is unavailab… |

## Domain-Specific & Specialized AI (6)

| Provider | Slug | API Base URL | Default Env Var | Wire Protocol | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| [NLP Cloud](https://nlpcloud.com) | `nlpcloud` | `https://api.nlpcloud.io/v1` | `NLP_CLOUD_API_KEY` | Native / Custom | NER, summarization, chat; custom API format |
| [Puter.js](https://puter.com) | `puter` | `https://api.puter.com/ai/chat` | — | Native / Custom | No API key needed; web/Node.js SDK |
| [v0 (Vercel)](https://v0.dev) | `v0-vercel` | `https://api.v0.dev/v1` | `V0_VERCEL_API_KEY` | ✓ OpenAI | Specialized API. See official docs for setup. |
| [Dify](https://dify.ai) | `dify` | `https://api.dify.ai` | `DIFY_API_KEY` | ✓ OpenAI | Free open-source AI app builder + RAG platform.; Get API key from your Dify instance. |
| [Jev API Pro](https://jevapi.pro) | `jev-api-pro` | `https://jevapi.pro/api/v1` | `JEV_API_PRO_API_KEY` | Native / Custom | Independent REST API for TypeSafe's Jev decision model (via OpenRouter); POST /decisions returns a typed label, confidence, and needsReview flag. Custom API format; keys need a paid access period. |
| [Jev Agent](https://jev-agent.com/api-access) | `jev-agent` | `https://jev-agent.com/api/v1` | `JEV_AGENT_KEY` | Native / Custom | Independent Jev AI model API (unofficial relay for TypeSafe Jev / System One). Free jv_live_ key: 5 credits/month (1 credit = 1k input tokens). POST /systemone, /classify, /decisions. Not affiliated with TypeSafe AI. |

## Cloud Coding & Autonomous Agents (3)

| Provider | Slug | API Base URL | Default Env Var | Wire Protocol | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| [Google Jules](https://jules.google) | `jules` | `https://jules.google` | `JULES_API_KEY` | Native / Custom | Jules API key for creating and managing cloud coding tasks. |
| [Devin](https://devin.ai) | `devin` | `https://api.devin.ai` | `DEVIN_API_KEY` | Native / Custom | Devin API key for cloud agent sessions. |
| [Codex Cloud](https://openai.com/codex) | `codex-cloud` | `https://chatgpt.com/backend-api/codex` | `CODEX_CLOUD_API_KEY` | Native / Custom | OpenAI API key with Codex Cloud task access. |

## Using Any Provider

### In TypeScript / JavaScript

```typescript
import { AIPlug } from 'aiplug';

// By provider slug
const ai = AIPlug.create({
  transport: 'groq',
  apiKey: process.env.GROQ_API_KEY,
  model: 'llama-3.3-70b-versatile',
});

// Or using unified model specifier
const ai2 = AIPlug.fromModel('together/meta-llama/Llama-3.3-70B-Instruct-Turbo', {
  apiKey: process.env.TOGETHER_API_KEY,
});
```

### In the CLI

```bash
# Configure any provider interactively
aiplug transport add mistral

# Switch active provider
aiplug transport use mistral

# Health check
aiplug transport test mistral
```

### OpenAI-Compatible HTTP Server

Run `aiplug serve` and point any standard OpenAI SDK at `http://localhost:3711/v1`.
