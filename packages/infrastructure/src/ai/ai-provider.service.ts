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
    if (!key && req.provider !== 'ollama') {
      this.logger.info('AI provider not configured; using rule-based fallback', { provider: req.provider });
      return this.ruleBasedFallback(req.prompt);
    }
    try {
      this.logger.info('AI completion', { provider: req.provider, model: req.model });
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
