import { BaseAgent } from '../base-agent.js';

/** Client-facing statements, documents and secure messages. */
export class ClientMessagesAndDocumentsAgent extends BaseAgent {
  readonly id = 'client-messages-docs';
  readonly name = 'Messages & Documents';
  readonly description = 'Client-facing statements, documents and secure messages.';
  readonly mode = 'client' as const;
  readonly keywords = ['statement','document','message','letter','download'];
  /** Populated at runtime from the CapabilityMap once a catalog is imported. */
  readonly capabilityEndpointIds: string[] = [];
}
