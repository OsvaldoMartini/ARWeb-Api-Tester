import type { ConversationMode } from '@arweb/domain';
import type { RealApiCatalogValidator } from '@arweb/application';
import type { BaseAgent, AgentResult } from './base-agent.js';

/**
 * BankingAgentRouter (Pilot 3) — scores the question against each agent's keywords
 * and dispatches to the best match. The user can also pick an agent explicitly
 * (specialist selector UX), in which case routing is skipped.
 */
export class BankingAgentRouter {
  constructor(private readonly agents: BaseAgent[]) {}

  list(): { id: string; name: string; description: string; mode: string }[] {
    return this.agents.map((a) => ({ id: a.id, name: a.name, description: a.description, mode: a.mode }));
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
    opts: { mode: ConversationMode; validator: RealApiCatalogValidator; agentId?: string },
  ): Promise<AgentResult> {
    const agent = opts.agentId
      ? (this.agents.find((a) => a.id === opts.agentId) ?? this.route(question, opts.mode))
      : this.route(question, opts.mode);
    return agent.handle(question, { mode: opts.mode, validator: opts.validator });
  }
}
