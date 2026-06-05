import type Database from 'better-sqlite3';
import type {
  ApiSpec,
  ApiEndpoint,
  ApiParameter,
  ApiOutputField,
  HttpMethod,
  ParameterLocation,
} from '@arweb/domain';
import type { CatalogReadPort, CatalogWritePort } from '@arweb/application';

// ── Row shapes ───────────────────────────────────────────────────────────────

interface SpecRow {
  id: string; title: string; version: string; source_path: string;
  raw_format: string; imported_at: string; endpoint_count: number;
}
interface EndpointRow {
  id: string; spec_id: string; operation_id: string | null; method: string;
  path: string; summary: string | null; description: string | null;
  tags: string; category_id: string | null;
}
interface ParamRow {
  id: string; endpoint_id: string; name: string; location: string;
  required: number; schema_type: string | null; example: string | null;
}
interface OutputRow {
  id: string; endpoint_id: string; json_path: string;
  schema_type: string | null; description: string | null;
}

// ── Repository ───────────────────────────────────────────────────────────────

export class SqliteCatalogRepository implements CatalogReadPort, CatalogWritePort {
  private readonly getEpStmt: Database.Statement;
  private readonly findEpStmt: Database.Statement;
  private readonly getParamsStmt: Database.Statement;
  private readonly getOutputsStmt: Database.Statement;
  private readonly listEpsStmt: Database.Statement;
  private readonly listSpecsStmt: Database.Statement;
  private readonly upsertSpecStmt: Database.Statement;
  private readonly upsertEpStmt: Database.Statement;
  private readonly upsertParamStmt: Database.Statement;
  private readonly upsertOutputStmt: Database.Statement;

  constructor(private readonly db: Database.Database) {
    this.getEpStmt       = db.prepare('SELECT * FROM api_endpoints WHERE id = ?');
    this.findEpStmt      = db.prepare('SELECT * FROM api_endpoints WHERE method = ? AND path = ?');
    this.getParamsStmt   = db.prepare('SELECT * FROM api_parameters WHERE endpoint_id = ?');
    this.getOutputsStmt  = db.prepare('SELECT * FROM api_output_fields WHERE endpoint_id = ?');
    this.listEpsStmt     = db.prepare('SELECT * FROM api_endpoints ORDER BY path, method');
    this.listSpecsStmt   = db.prepare('SELECT * FROM api_specs ORDER BY imported_at DESC');
    this.upsertSpecStmt  = db.prepare(
      'INSERT OR REPLACE INTO api_specs (id,title,version,source_path,raw_format,imported_at,endpoint_count) VALUES (?,?,?,?,?,?,?)',
    );
    this.upsertEpStmt    = db.prepare(
      'INSERT OR REPLACE INTO api_endpoints (id,spec_id,operation_id,method,path,summary,description,tags,category_id) VALUES (?,?,?,?,?,?,?,?,?)',
    );
    this.upsertParamStmt = db.prepare(
      'INSERT OR REPLACE INTO api_parameters (id,endpoint_id,name,location,required,schema_type,example) VALUES (?,?,?,?,?,?,?)',
    );
    this.upsertOutputStmt = db.prepare(
      'INSERT OR REPLACE INTO api_output_fields (id,endpoint_id,json_path,schema_type,description) VALUES (?,?,?,?,?)',
    );
  }

  // ── Read ──

  async getEndpointById(id: string): Promise<ApiEndpoint | null> {
    const row = this.getEpStmt.get(id) as EndpointRow | undefined;
    return row ? toEndpoint(row) : null;
  }

  async findEndpointByMethodAndPath(method: string, path: string): Promise<ApiEndpoint | null> {
    const row = this.findEpStmt.get(method.toUpperCase(), path) as EndpointRow | undefined;
    return row ? toEndpoint(row) : null;
  }

  async getParameters(endpointId: string): Promise<ApiParameter[]> {
    return (this.getParamsStmt.all(endpointId) as ParamRow[]).map(toParam);
  }

  async getOutputFields(endpointId: string): Promise<ApiOutputField[]> {
    return (this.getOutputsStmt.all(endpointId) as OutputRow[]).map(toOutput);
  }

  async listEndpoints(): Promise<ApiEndpoint[]> {
    return (this.listEpsStmt.all() as EndpointRow[]).map(toEndpoint);
  }

  /** Not in CatalogReadPort but available for server routes. */
  async listSpecs(): Promise<ApiSpec[]> {
    return (this.listSpecsStmt.all() as SpecRow[]).map(toSpec);
  }

  // ── Write ──

  async saveSpec(spec: ApiSpec): Promise<void> {
    this.upsertSpecStmt.run(
      spec.id, spec.title, spec.version, spec.sourcePath,
      spec.rawFormat, spec.importedAt, spec.endpointCount,
    );
  }

  async saveEndpoints(endpoints: ApiEndpoint[]): Promise<void> {
    const stmt = this.upsertEpStmt;
    this.db.transaction(() => {
      for (const ep of endpoints) {
        stmt.run(
          ep.id, ep.specId, ep.operationId, ep.method, ep.path,
          ep.summary, ep.description, JSON.stringify(ep.tags), ep.categoryId,
        );
      }
    })();
  }

  async saveParameters(params: ApiParameter[]): Promise<void> {
    const stmt = this.upsertParamStmt;
    this.db.transaction(() => {
      for (const p of params) {
        stmt.run(p.id, p.endpointId, p.name, p.location, p.required ? 1 : 0, p.schemaType, p.example);
      }
    })();
  }

  async saveOutputFields(fields: ApiOutputField[]): Promise<void> {
    const stmt = this.upsertOutputStmt;
    this.db.transaction(() => {
      for (const f of fields) {
        stmt.run(f.id, f.endpointId, f.jsonPath, f.schemaType, f.description);
      }
    })();
  }

  async clearAll(): Promise<void> {
    this.db.transaction(() => {
      this.db.prepare('DELETE FROM api_output_fields').run();
      this.db.prepare('DELETE FROM api_parameters').run();
      this.db.prepare('DELETE FROM api_endpoints').run();
      this.db.prepare('DELETE FROM api_specs').run();
    })();
  }
}

// ── Row mappers ──────────────────────────────────────────────────────────────

function toSpec(r: SpecRow): ApiSpec {
  return {
    id: r.id, title: r.title, version: r.version,
    sourcePath: r.source_path, rawFormat: r.raw_format as 'json' | 'yaml',
    importedAt: r.imported_at, endpointCount: r.endpoint_count,
  };
}

function toEndpoint(r: EndpointRow): ApiEndpoint {
  return {
    id: r.id, specId: r.spec_id, operationId: r.operation_id,
    method: r.method as HttpMethod, path: r.path,
    summary: r.summary, description: r.description,
    tags: JSON.parse(r.tags) as string[],
    categoryId: r.category_id,
  };
}

function toParam(r: ParamRow): ApiParameter {
  return {
    id: r.id, endpointId: r.endpoint_id, name: r.name,
    location: r.location as ParameterLocation,
    required: r.required === 1,
    schemaType: r.schema_type, example: r.example,
  };
}

function toOutput(r: OutputRow): ApiOutputField {
  return {
    id: r.id, endpointId: r.endpoint_id, jsonPath: r.json_path,
    schemaType: r.schema_type, description: r.description,
  };
}
