/** DTOs crossing the React <-> sidecar boundary. Keep them flat & serializable. */

export interface ImportRequestDto {
  folderPath: string;
}

export interface ImportResultDto {
  specsImported: number;
  endpointsImported: number;
  failures: { file: string; error: string }[];
}

export interface CatalogEndpointDto {
  id: string;
  method: string;
  path: string;
  summary: string | null;
  tags: string[];
  categoryId: string | null;
  mappingStatus: 'mapped' | 'unmapped';
}

export interface RunRequestDto {
  botJobId: string;
  target: 'real' | 'mock';
}

export interface RunSummaryDto {
  runId: string;
  status: string;
  totalSteps: number;
  passedSteps: number;
  failedSteps: number;
  startedAt: string;
  finishedAt: string | null;
}

export interface AgentAnswerDto {
  agentId: string;
  agentName: string;
  answer: string;
  /** real endpoints used to build the answer (anti-hallucination evidence) */
  evidence: { method: string; path: string }[];
  /** limitations shown explicitly to build trust (Pilot 3) */
  limitations: string[];
}
