import type Database from 'better-sqlite3';
import type {
  BotJob,
  BotJobBlock,
  BotJobCommand,
  BotVariable,
  CommandType,
} from '@arweb/domain';
import type { BotJobRepository } from '@arweb/application';

// ── Row shapes ───────────────────────────────────────────────────────────────

interface JobRow {
  id: string; name: string; description: string | null;
  category_id: string | null; created_at: string; updated_at: string;
}
interface BlockRow {
  id: string; bot_job_id: string; name: string; ord: number;
}
interface CommandRow {
  id: string; block_id: string; ord: number;
  type: string; config: string; enabled: number;
}
interface VarRow {
  id: string; bot_job_id: string; name: string;
  initial_value: string | null; secret: number;
}

// ── Repository ───────────────────────────────────────────────────────────────

export class SqliteBotJobRepository implements BotJobRepository {
  constructor(private readonly db: Database.Database) {}

  async list(): Promise<BotJob[]> {
    const rows = this.db.prepare('SELECT * FROM bot_jobs ORDER BY updated_at DESC').all() as JobRow[];
    return rows.map(toJob);
  }

  async getById(id: string): Promise<BotJob | null> {
    const row = this.db.prepare('SELECT * FROM bot_jobs WHERE id = ?').get(id) as JobRow | undefined;
    return row ? toJob(row) : null;
  }

  async getBlocks(botJobId: string): Promise<BotJobBlock[]> {
    const rows = this.db
      .prepare('SELECT * FROM bot_job_blocks WHERE bot_job_id = ? ORDER BY ord')
      .all(botJobId) as BlockRow[];
    return rows.map(toBlock);
  }

  async getCommands(blockId: string): Promise<BotJobCommand[]> {
    const rows = this.db
      .prepare('SELECT * FROM bot_job_commands WHERE block_id = ? ORDER BY ord')
      .all(blockId) as CommandRow[];
    return rows.map(toCommand);
  }

  async getVariables(botJobId: string): Promise<BotVariable[]> {
    const rows = this.db
      .prepare('SELECT * FROM bot_variables WHERE bot_job_id = ?')
      .all(botJobId) as VarRow[];
    return rows.map(toVar);
  }

  async save(
    job: BotJob,
    blocks: BotJobBlock[],
    commands: BotJobCommand[],
    vars: BotVariable[],
  ): Promise<void> {
    const upsertJob = this.db.prepare(
      'INSERT OR REPLACE INTO bot_jobs (id,name,description,category_id,created_at,updated_at) VALUES (?,?,?,?,?,?)',
    );
    const upsertBlock = this.db.prepare(
      'INSERT OR REPLACE INTO bot_job_blocks (id,bot_job_id,name,ord) VALUES (?,?,?,?)',
    );
    const upsertCmd = this.db.prepare(
      'INSERT OR REPLACE INTO bot_job_commands (id,block_id,ord,type,config,enabled) VALUES (?,?,?,?,?,?)',
    );
    const upsertVar = this.db.prepare(
      'INSERT OR REPLACE INTO bot_variables (id,bot_job_id,name,initial_value,secret) VALUES (?,?,?,?,?)',
    );

    this.db.transaction(() => {
      upsertJob.run(job.id, job.name, job.description, job.categoryId, job.createdAt, job.updatedAt);
      for (const b of blocks)   upsertBlock.run(b.id, b.botJobId, b.name, b.order);
      for (const c of commands) upsertCmd.run(c.id, c.blockId, c.order, c.type, JSON.stringify(c.config), c.enabled ? 1 : 0);
      for (const v of vars)     upsertVar.run(v.id, v.botJobId, v.name, v.initialValue, v.secret ? 1 : 0);
    })();
  }

  async remove(id: string): Promise<void> {
    this.db.prepare('DELETE FROM bot_jobs WHERE id = ?').run(id);
  }
}

// ── Row mappers ──────────────────────────────────────────────────────────────

function toJob(r: JobRow): BotJob {
  return { id: r.id, name: r.name, description: r.description, categoryId: r.category_id, createdAt: r.created_at, updatedAt: r.updated_at };
}
function toBlock(r: BlockRow): BotJobBlock {
  return { id: r.id, botJobId: r.bot_job_id, name: r.name, order: r.ord };
}
function toCommand(r: CommandRow): BotJobCommand {
  return {
    id: r.id, blockId: r.block_id, order: r.ord,
    type: r.type as CommandType,
    config: JSON.parse(r.config) as Record<string, unknown>,
    enabled: r.enabled === 1,
  };
}
function toVar(r: VarRow): BotVariable {
  return { id: r.id, botJobId: r.bot_job_id, name: r.name, initialValue: r.initial_value, secret: r.secret === 1 };
}
