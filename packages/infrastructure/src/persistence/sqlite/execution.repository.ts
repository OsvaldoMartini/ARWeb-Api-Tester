import type Database from 'better-sqlite3';
import type { ExecutionRun, ExecutionStepResult, CommandType, ExecutionStatus, AssertionResult } from '@arweb/domain';
import type { ExecutionRepository } from '@arweb/application';

// ── Row shapes ───────────────────────────────────────────────────────────────

interface RunRow {
  id: string; bot_job_id: string; started_at: string; finished_at: string | null;
  status: string; target: string; total_steps: number; passed_steps: number; failed_steps: number;
}
interface StepRow {
  id: string; run_id: string; step_id: string; command_type: string; status: string;
  request: string | null; response: string | null; duration_ms: number;
  error_message: string | null; assertion_results: string; created_at: string;
}

// ── Repository ───────────────────────────────────────────────────────────────

export class SqliteExecutionRepository implements ExecutionRepository {
  constructor(private readonly db: Database.Database) {}

  async createRun(run: ExecutionRun): Promise<void> {
    this.db.prepare(
      'INSERT INTO execution_runs (id,bot_job_id,started_at,finished_at,status,target,total_steps,passed_steps,failed_steps) VALUES (?,?,?,?,?,?,?,?,?)',
    ).run(
      run.id, run.botJobId, run.startedAt, run.finishedAt,
      run.status, run.target, run.totalSteps, run.passedSteps, run.failedSteps,
    );
  }

  async updateRun(run: ExecutionRun): Promise<void> {
    this.db.prepare(
      'UPDATE execution_runs SET finished_at=?,status=?,total_steps=?,passed_steps=?,failed_steps=? WHERE id=?',
    ).run(run.finishedAt, run.status, run.totalSteps, run.passedSteps, run.failedSteps, run.id);
  }

  async addStepResult(result: ExecutionStepResult): Promise<void> {
    this.db.prepare(
      'INSERT INTO execution_step_results (id,run_id,step_id,command_type,status,request,response,duration_ms,error_message,assertion_results,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
    ).run(
      result.id, result.runId, result.stepId, result.commandType, result.status,
      result.request, result.response, result.durationMs, result.errorMessage,
      JSON.stringify(result.assertionResults), result.createdAt,
    );
  }

  async listRuns(botJobId?: string): Promise<ExecutionRun[]> {
    const rows = botJobId
      ? (this.db.prepare('SELECT * FROM execution_runs WHERE bot_job_id = ? ORDER BY started_at DESC').all(botJobId) as RunRow[])
      : (this.db.prepare('SELECT * FROM execution_runs ORDER BY started_at DESC').all() as RunRow[]);
    return rows.map(toRun);
  }

  async getStepResults(runId: string): Promise<ExecutionStepResult[]> {
    const rows = this.db
      .prepare('SELECT * FROM execution_step_results WHERE run_id = ? ORDER BY created_at')
      .all(runId) as StepRow[];
    return rows.map(toStep);
  }
}

// ── Row mappers ──────────────────────────────────────────────────────────────

function toRun(r: RunRow): ExecutionRun {
  return {
    id: r.id, botJobId: r.bot_job_id, startedAt: r.started_at, finishedAt: r.finished_at,
    status: r.status as ExecutionStatus, target: r.target as 'real' | 'mock',
    totalSteps: r.total_steps, passedSteps: r.passed_steps, failedSteps: r.failed_steps,
  };
}

function toStep(r: StepRow): ExecutionStepResult {
  return {
    id: r.id, runId: r.run_id, stepId: r.step_id,
    commandType: r.command_type as CommandType,
    status: r.status as ExecutionStatus,
    request: r.request, response: r.response,
    durationMs: r.duration_ms, errorMessage: r.error_message,
    assertionResults: JSON.parse(r.assertion_results) as AssertionResult[],
    createdAt: r.created_at,
  };
}
