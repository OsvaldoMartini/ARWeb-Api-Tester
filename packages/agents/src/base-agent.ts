import type { ConversationMode } from '@arweb/domain';
import type { RealApiCatalogValidator, AgentPlan } from '@arweb/application';

export interface AgentContext {
  mode: ConversationMode;
  validator: RealApiCatalogValidator;
  /** Injected by the router when an AI provider is configured. */
  askAi?: (system: string, prompt: string) => Promise<string>;
}

export interface AgentResult {
  agentId: string;
  agentName: string;
  answer: string;
  evidence: { endpointId: string; method: string; path: string }[];
  limitations: string[];
}

/**
 * Base class every banking agent extends. An agent:
 *  1. receives the user question,
 *  2. builds an API execution plan from ITS OWN capability endpoints,
 *  3. validates the plan through RealApiCatalogValidator (anti-hallucination),
 *  4. composes an answer — via AI when configured, rule-based when not,
 *  5. returns the answer + evidence + limitations.
 */
export abstract class BaseAgent {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly mode: 'employee' | 'client' | 'both';
  abstract readonly keywords: string[];
  abstract readonly capabilityEndpointIds: string[];

  /** Called by the router after catalog import to wire real endpoint IDs. */
  setCapabilityEndpoints(ids: string[]): void {
    this.capabilityEndpointIds.splice(0, this.capabilityEndpointIds.length, ...ids);
  }

  protected buildPlan(_question: string): AgentPlan {
    return { steps: this.capabilityEndpointIds.map((endpointId) => ({ endpointId })) };
  }

  async handle(question: string, ctx: AgentContext): Promise<AgentResult> {
    const plan   = this.buildPlan(question);
    const issues = await ctx.validator.validateAgentPlan(plan);
    const limitations: string[] = [];

    if (issues.length > 0) {
      limitations.push(
        'Some capabilities are not available in the imported catalog: ' +
          issues.map((i) => i.message).join('; '),
      );
    }

    const evidence = plan.steps
      .filter((s) => !issues.some((i) => i.context?.['endpointId'] === s.endpointId))
      .map((s) => ({ endpointId: s.endpointId, method: '', path: '' }));

    const answer = await this.composeAnswer(question, ctx, evidence);

    return { agentId: this.id, agentName: this.name, answer, evidence, limitations };
  }

  protected async composeAnswer(
    question: string,
    ctx: AgentContext,
    _evidence: { endpointId: string }[],
  ): Promise<string> {
    const lead = ctx.mode === 'client' ? this.name : `[${this.id}]`;

    if (!ctx.askAi) {
      return `${lead}: I can help with "${question}". (Configure an AI provider in Settings for a full answer.)`;
    }

    const system = [
      `You are ${this.name}, a specialized banking assistant.`,
      this.description,
      'Answer concisely and professionally.',
      'Never invent API endpoints, data fields, or facts you do not know about.',
      ctx.mode === 'client'
        ? 'Use plain business language — avoid technical terms.'
        : 'You may use technical terms appropriate for banking professionals.',
    ].join(' ');

    return await ctx.askAi(system, question);
  }
}
