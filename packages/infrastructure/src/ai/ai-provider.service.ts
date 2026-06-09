import type { AiProvider } from '@arweb/domain';
import type { Logger } from '@arweb/common';

export interface AiCompletionRequest {
  provider: AiProvider;
  model: string;
  system: string;
  prompt: string;
  /** Override base URL — used for Ollama, Azure OpenAI, custom endpoints. */
  baseUrl?: string;
}

export interface AiGateway {
  complete(req: AiCompletionRequest): Promise<string>;
  ask(system: string, prompt: string): Promise<string>;
}

const DEFAULT_MODELS: Record<string, string> = {
  'openai':        'gpt-4o-mini',
  'anthropic':     'claude-3-5-haiku-20241022',
  'gemini':        'gemini-1.5-flash',
  'azure-openai':  'gpt-4o-mini',
  'ollama':        'llama3.2',
  'together':      'meta-llama/Llama-3-8b-chat-hf',
  'custom-openai': 'gpt-4o-mini',
};

/**
 * Provider-independent AI gateway (Phase 11).
 * Rules enforced here:
 *  - AI may only SUGGEST; it never calls real APIs directly.
 *  - Every AI-suggested endpoint/field must still pass RealApiCatalogValidator upstream.
 *  - Falls back to a deterministic rule-based reply when no key is configured.
 */
export class AiProviderService implements AiGateway {
  private readonly keys     = new Map<string, string>();
  private readonly baseUrls = new Map<string, string>();
  private readonly models   = new Map<string, string>();
  private defaultProvider: AiProvider = 'openai';

  constructor(private readonly logger: Logger) {}

  /** Load or update a provider's credentials. Pass null key to disable. */
  configure(
    provider: AiProvider,
    key: string | null | undefined,
    baseUrl?: string | null,
    model?: string | null,
  ): void {
    if (key)     this.keys.set(provider, key);    else this.keys.delete(provider);
    if (baseUrl) this.baseUrls.set(provider, baseUrl); else this.baseUrls.delete(provider);
    if (model)   this.models.set(provider, model);
  }

  setDefaultProvider(provider: AiProvider): void {
    this.defaultProvider = provider;
  }

  /** Expose the current default provider credentials for tool-use callers. */
  getDefaultConfig(): { provider: AiProvider; key: string | null; model: string; baseUrl?: string } {
    return {
      provider: this.defaultProvider,
      key:      this.keys.get(this.defaultProvider) ?? null,
      model:    this.models.get(this.defaultProvider) ?? DEFAULT_MODELS[this.defaultProvider] ?? 'gpt-4o-mini',
      baseUrl:  this.baseUrls.get(this.defaultProvider),
    };
  }

  /**
   * Return the best available provider that has a key configured.
   * Prefers the default provider; falls back to the first one with a key.
   * Returns null if nothing is configured.
   */
  getActiveProvider(): { provider: AiProvider; key: string; model: string; baseUrl?: string } | null {
    const configuredProviders = Array.from(this.keys.keys());
    this.logger.info('[ai-service] getActiveProvider()', {
      defaultProvider:     this.defaultProvider,
      configuredProviders,
      defaultHasKey:       this.keys.has(this.defaultProvider),
    });

    const tryProvider = (p: AiProvider) => {
      const key = this.keys.get(p);
      if (!key) return null;
      return { provider: p, key, model: this.models.get(p) ?? DEFAULT_MODELS[p] ?? 'gpt-4o-mini', baseUrl: this.baseUrls.get(p) };
    };

    // 1. Prefer the configured default.
    const fromDefault = tryProvider(this.defaultProvider);
    if (fromDefault) {
      this.logger.info('[ai-service] → using default provider', { provider: this.defaultProvider });
      return fromDefault;
    }

    // 2. Fall back to any provider that has a key.
    for (const [p] of this.keys) {
      const found = tryProvider(p as AiProvider);
      if (found) {
        this.logger.info('[ai-service] → fallback to first available provider', { provider: p });
        return found;
      }
    }

    this.logger.warn('[ai-service] → NO provider available (keys map is empty)');
    return null;
  }

  /** Test a specific provider with a simple prompt. Throws on failure. */
  async completeForProvider(provider: AiProvider, prompt: string): Promise<string> {
    const key = this.keys.get(provider) ?? null;
    if (!key && provider !== 'ollama') throw new Error(`No API key configured for ${provider}`);
    return this.complete({
      provider,
      model:   this.models.get(provider) ?? DEFAULT_MODELS[provider] ?? 'gpt-4o-mini',
      baseUrl: this.baseUrls.get(provider),
      system:  'You are a test assistant.',
      prompt,
    });
  }

  /** Convenience: ask using the default provider. */
  async ask(system: string, prompt: string): Promise<string> {
    return this.complete({
      provider: this.defaultProvider,
      model:    this.models.get(this.defaultProvider) ?? DEFAULT_MODELS[this.defaultProvider] ?? 'gpt-4o-mini',
      baseUrl:  this.baseUrls.get(this.defaultProvider),
      system,
      prompt,
    });
  }

  async complete(req: AiCompletionRequest): Promise<string> {
    const key = this.keys.get(req.provider) ?? null;
    this.logger.info('[ai-service] complete() called', {
      provider:            req.provider,
      model:               req.model,
      keyPresent:          !!key,
      configuredProviders: Array.from(this.keys.keys()),
      promptPreview:       req.prompt.slice(0, 80),
    });
    if (!key && req.provider !== 'ollama') {
      this.logger.warn('[ai-service] complete() → NO KEY → ruleBasedFallback', { provider: req.provider });
      return this.ruleBasedFallback(req.prompt);
    }
    try {
      this.logger.info('[ai-service] complete() → calling provider', { provider: req.provider, model: req.model });
      switch (req.provider) {
        case 'anthropic':    return await this.callAnthropic(req, key!);
        case 'gemini':       return await this.callGemini(req, key!);
        case 'ollama':       return await this.callOllama(req);
        default:             return await this.callOpenAiCompatible(req, key!);
      }
    } catch (e) {
      this.logger.error('AI call failed', { provider: req.provider, error: e instanceof Error ? e.message : String(e) });
      return this.ruleBasedFallback(req.prompt);
    }
  }

  // ── Provider implementations ──────────────────────────────────────────────

  private async callOpenAiCompatible(req: AiCompletionRequest, key: string): Promise<string> {
    const base = req.baseUrl ?? this.baseUrls.get(req.provider) ?? 'https://api.openai.com';
    const res = await fetch(`${base}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({
        model:       req.model,
        messages:    [{ role: 'system', content: req.system }, { role: 'user', content: req.prompt }],
        max_tokens:  1024,
        temperature: 0.7,
      }),
    });
    if (!res.ok) throw new Error(`OpenAI-compatible API error ${res.status}: ${await res.text()}`);
    const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
    return data.choices?.[0]?.message?.content?.trim() ?? '';
  }

  private async callAnthropic(req: AiCompletionRequest, key: string): Promise<string> {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:     req.model,
        max_tokens: 1024,
        system:    req.system,
        messages:  [{ role: 'user', content: req.prompt }],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic API error ${res.status}: ${await res.text()}`);
    const data = await res.json() as { content?: Array<{ text?: string }> };
    return data.content?.[0]?.text?.trim() ?? '';
  }

  private async callGemini(req: AiCompletionRequest, key: string): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${req.model}:generateContent?key=${key}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents:          [{ parts: [{ text: req.prompt }] }],
        systemInstruction: { parts: [{ text: req.system }] },
      }),
    });
    if (!res.ok) throw new Error(`Gemini API error ${res.status}: ${await res.text()}`);
    const data = await res.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
  }

  private async callOllama(req: AiCompletionRequest): Promise<string> {
    const base = req.baseUrl ?? this.baseUrls.get('ollama') ?? 'http://localhost:11434';
    const res = await fetch(`${base}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model:    req.model,
        messages: [{ role: 'system', content: req.system }, { role: 'user', content: req.prompt }],
        stream:   false,
      }),
    });
    if (!res.ok) throw new Error(`Ollama API error ${res.status}: ${await res.text()}`);
    const data = await res.json() as { message?: { content?: string } };
    return data.message?.content?.trim() ?? '';
  }

  private ruleBasedFallback(prompt: string): string {
    return `Offline assistant: I received "${prompt.slice(0, 120)}". Configure an AI provider in Settings for full answers.`;
  }
}
