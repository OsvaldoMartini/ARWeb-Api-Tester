import type { ConversationMode } from '@arweb/domain';
import type { RealApiCatalogValidator, AgentPlan } from '@arweb/application';

export interface AgentContext {
  mode: ConversationMode;
  validator: RealApiCatalogValidator;
  /** demo banking data injected so agents can answer offline */
  demoContext?: Record<string, unknown>;
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
 *  3. validates the plan through RealApiCatalogValidator,
 *  4. returns a supported answer + evidence, or a clear limitation.
 */
export abstract class BaseAgent {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly mode: 'employee' | 'client' | 'both';
  /** keywords used by the router to score relevance */
  abstract readonly keywords: string[];
  /** endpoint ids this agent is allowed to plan with (its CapabilityMap slice) */
  abstract readonly capabilityEndpointIds: string[];

  /** Build the plan this agent would run for the question. Override per agent. */
  protected buildPlan(_question: string): AgentPlan {
    return { steps: this.capabilityEndpointIds.map((endpointId) => ({ endpointId })) };
  }

  async handle(question: string, ctx: AgentContext): Promise<AgentResult> {
    const plan = this.buildPlan(question);
    const issues = await ctx.validator.validateAgentPlan(plan);
    const limitations: string[] = [];

    if (issues.length > 0) {
      // Anti-hallucination: never pretend an endpoint exists.
      limitations.push(
        'Some capabilities are not available in the imported catalog: ' +
          issues.map((i) => i.message).join('; '),
      );
    }

    const evidence = plan.steps
      .filter((s) => !issues.some((i) => i.context?.['endpointId'] === s.endpointId))
      .map((s) => ({ endpointId: s.endpointId, method: '', path: '' }));

    const answer =
      evidence.length > 0
        ? this.composeAnswer(question, ctx.mode)
        : 'I cannot answer this with the currently imported APIs.';

    return { agentId: this.id, agentName: this.name, answer, evidence, limitations };
  }

  /** Business-friendly in client mode, technical in employee mode. */
  protected composeAnswer(question: string, mode: ConversationMode): string {
    const lead = mode === 'client' ? this.name : `[${this.id}]`;
    return `${lead}: I can help with "${question}". (Wire a real AI provider in Settings to expand this answer.)`;
  }
}
