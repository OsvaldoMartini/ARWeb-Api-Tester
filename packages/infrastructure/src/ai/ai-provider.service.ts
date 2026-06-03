import type { AiProvider } from '@arweb/domain';
import type { Logger } from '@arweb/common';

/**
 * Provider-independent AI gateway (Phase 11). Rules enforced here:
 *  - AI may only SUGGEST; it never calls real APIs.
 *  - Every AI-suggested endpoint/field must still pass RealApiCatalogValidator
 *    upstream before use.
 *  - When no key is configured, falls back to a deterministic rule-based reply
 *    so the app is fully usable offline.
 */
export interface AiCompletionRequest {
  provider: AiProvider;
  model: string;
  system: string;
  prompt: string;
}

export interface AiGateway {
  complete(req: AiCompletionRequest): Promise<string>;
}

export class AiProviderService implements AiGateway {
  constructor(
    private readonly logger: Logger,
    private readonly apiKeyResolver: (provider: AiProvider) => string | null,
  ) {}

  async complete(req: AiCompletionRequest): Promise<string> {
    const key = this.apiKeyResolver(req.provider);
    if (!key) {
      this.logger.info('AI provider not configured; using rule-based fallback', { provider: req.provider });
      return this.ruleBasedFallback(req.prompt);
    }
    // TODO: dispatch to the concrete provider SDK (openai/anthropic/gemini/...).
    // Each provider implements the same { complete } contract behind this gateway.
    this.logger.info('AI completion requested', { provider: req.provider, model: req.model });
    return this.ruleBasedFallback(req.prompt);
  }

  private ruleBasedFallback(prompt: string): string {
    return `Offline assistant: I received "${prompt.slice(0, 120)}". Configure an AI provider in Settings for full answers.`;
  }
}
