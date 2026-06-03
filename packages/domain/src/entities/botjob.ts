import type { CommandType } from '../enums/index.js';

/**
 * BotJob = a reusable, no-code test workflow (Pilot 1).
 * A BotJob has Blocks (visual groups); each Block has ordered Commands.
 */

export interface BotJob {
  id: string;
  name: string;
  description: string | null;
  categoryId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BotJobBlock {
  id: string;
  botJobId: string;
  name: string;
  order: number;
}

export interface BotJobCommand {
  id: string;
  blockId: string;
  order: number;
  type: CommandType;
  /**
   * Command configuration. Shape depends on `type`; validated by the engine and
   * RealApiCatalogValidator. For API_CALL this MUST include a real `endpointId`.
   */
  config: Record<string, unknown>;
  enabled: boolean;
}

export interface BotVariable {
  id: string;
  botJobId: string;
  name: string; // referenced as ${name}
  initialValue: string | null;
  secret: boolean;
}

/** A reusable component = a named, callable sub-workflow (CALL_COMPONENT). */
export interface Component {
  id: string;
  name: string;
  description: string | null;
}

export interface ComponentCommand {
  id: string;
  componentId: string;
  order: number;
  type: CommandType;
  config: Record<string, unknown>;
}

/** Data-driven testing input (Excel/CSV). */
export interface DataSetDefinition {
  id: string;
  botJobId: string;
  name: string;
  sourceType: 'csv' | 'excel';
  sourcePath: string;
  columns: string[];
}
