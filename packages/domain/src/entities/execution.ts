import type { CommandType, ExecutionStatus } from '../enums/index.js';

/** Execution history — full audit trail (Pilot 1). */

export interface ExecutionRun {
  id: string;
  botJobId: string;
  startedAt: string;
  finishedAt: string | null;
  status: ExecutionStatus;
  target: 'real' | 'mock';
  totalSteps: number;
  passedSteps: number;
  failedSteps: number;
}

export interface AssertionResult {
  description: string;
  passed: boolean;
  expected?: unknown;
  actual?: unknown;
}

export interface ExecutionStepResult {
  id: string;
  runId: string;
  stepId: string; // the BotJobCommand id
  commandType: CommandType;
  status: ExecutionStatus;
  request: string | null; // serialized request
  response: string | null; // serialized response
  durationMs: number;
  errorMessage: string | null;
  assertionResults: AssertionResult[];
  createdAt: string;
}
