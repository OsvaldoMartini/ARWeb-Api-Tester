import type { ConversationMode, ApiEndpoint } from '@arweb/domain';
import type { RealApiCatalogValidator } from '@arweb/application';
import type { BaseAgent, AgentResult } from './base-agent.js';

/**
 * BankingAgentRouter (Pilot 3) — scores the question against each agent's keywords
 * and dispatches to the best match. The user can also pick an agent explicitly
 * (specialist selector UX), in which case routing is skipped.
 */
export class BankingAgentRouter {
  constructor(private readonly agents: BaseAgent[]) {}

  list(): { id: string; name: string; description: string; mode: string; capabilityCount: number }[] {
    return this.agents.map((a) => ({
      id: a.id,
      name: a.name,
      description: a.description,
      mode: a.mode,
      capabilityCount: a.capabilityEndpointIds.length,
    }));
  }

  /**
   * Auto-wire each agent's capabilityEndpointIds from an imported catalog.
   * An endpoint is assigned to an agent when any of the agent's keywords match
   * the endpoint's tags, path segments, or summary — same scorer as Phase 6.
   * One endpoint may be assigned to multiple agents.
   */
  populateFromCatalog(endpoints: ApiEndpoint[]): void {
    for (const agent of this.agents) {
      const matched = endpoints.filter((ep) => {
        const tokens = [
          ...(ep.tags ?? []),
          ...ep.path.split('/').filter((s) => s && !s.startsWith('{')),
          ...(ep.summary ?? '').split(/\s+/),
        ].map((s) => s.toLowerCase());
        return agent.keywords.some((kw) => {
          const kl = kw.toLowerCase();
          return tokens.some((t) => t.includes(kl) || kl.includes(t));
        });
      });
      agent.setCapabilityEndpoints(matched.map((ep) => ep.id));
    }
  }

  /** Returns a summary of which endpoints each agent owns — for the UI. */
  capabilitySummary(): { agentId: string; agentName: string; endpointCount: number }[] {
    return this.agents.map((a) => ({
      agentId: a.id,
      agentName: a.name,
      endpointCount: a.capabilityEndpointIds.length,
    }));
  }

  route(question: string, mode: ConversationMode): BaseAgent {
    const q = question.toLowerCase();
    const candidates = this.agents.filter((a) => a.mode === 'both' || a.mode === mode);
    let best = candidates[0];
    let bestScore = -1;
    for (const agent of candidates) {
      const score = agent.keywords.reduce((acc, kw) => (q.includes(kw.toLowerCase()) ? acc + 1 : acc), 0);
      if (score > bestScore) {
        bestScore = score;
        best = agent;
      }
    }
    return best!;
  }

  async ask(
    question: string,
    opts: {
      mode: ConversationMode;
      validator: RealApiCatalogValidator;
      agentId?: string;
      ai?: { ask: (system: string, prompt: string) => Promise<string> };
    },
  ): Promise<AgentResult> {
    const agent = opts.agentId
      ? (this.agents.find((a) => a.id === opts.agentId) ?? this.route(question, opts.mode))
      : this.route(question, opts.mode);
    return agent.handle(question, {
      mode:      opts.mode,
      validator: opts.validator,
      askAi:     opts.ai ? (s, p) => opts.ai!.ask(s, p) : undefined,
    });
  }
}
