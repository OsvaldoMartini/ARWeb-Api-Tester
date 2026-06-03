import { readdir, readFile } from 'node:fs/promises';
import { join, extname, basename } from 'node:path';
import type { ApiSpec, ApiEndpoint, ApiParameter, ApiOutputField, HttpMethod } from '@arweb/domain';
import type { CatalogWritePort, OpenApiImporter, ImportResultDto } from '@arweb/application';
import { type Logger, uuid, nowIso } from '@arweb/common';

const IGNORED_DIRS = new Set(['node_modules', 'dist', 'build', '.git', '.vs', 'bin', 'obj']);
const SPEC_EXT = new Set(['.json', '.yaml', '.yml']);
const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

/**
 * OpenApiCatalogImporter (Phase 4) — replaces Pilot 1's C# importer.
 * Recursively scans a folder, parses OpenAPI/Swagger files, extracts endpoints,
 * parameters and response fields, and persists them via the catalog write port.
 */
export class OpenApiCatalogImporter implements OpenApiImporter {
  constructor(
    private readonly catalog: CatalogWritePort,
    private readonly logger: Logger,
  ) {}

  async importFolder(folderPath: string): Promise<ImportResultDto> {
    const files = await this.scan(folderPath);
    const result: ImportResultDto = { specsImported: 0, endpointsImported: 0, failures: [] };

    for (const file of files) {
      try {
        const parsed = await this.parseSpec(file);
        const { spec, endpoints, parameters, outputFields } = this.extract(file, parsed);
        await this.catalog.saveSpec(spec);
        await this.catalog.saveEndpoints(endpoints);
        await this.catalog.saveParameters(parameters);
        await this.catalog.saveOutputFields(outputFields);
        result.specsImported += 1;
        result.endpointsImported += endpoints.length;
      } catch (e) {
        const error = e instanceof Error ? e.message : String(e);
        this.logger.warn('Failed to import spec', { file, error });
        result.failures.push({ file, error });
      }
    }
    return result;
  }

  private async scan(dir: string): Promise<string[]> {
    const out: string[] = [];
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (IGNORED_DIRS.has(entry.name)) continue;
        out.push(...(await this.scan(full)));
      } else if (SPEC_EXT.has(extname(entry.name).toLowerCase())) {
        out.push(full);
      }
    }
    return out;
  }

  /** Uses @apidevtools/swagger-parser when available (resolves $refs); else JSON.parse. */
  private async parseSpec(file: string): Promise<Record<string, unknown>> {
    const raw = await readFile(file, 'utf8');
    try {
      // Lazy import keeps the package optional during early scaffolding.
      const mod = await import('@apidevtools/swagger-parser');
      const SwaggerParser = (mod.default ?? mod) as { dereference: (s: string) => Promise<unknown> };
      return (await SwaggerParser.dereference(file)) as Record<string, unknown>;
    } catch {
      // Fallback: only JSON specs can be parsed without the YAML-capable parser.
      if (extname(file).toLowerCase() === '.json') return JSON.parse(raw) as Record<string, unknown>;
      throw new Error('YAML parsing requires @apidevtools/swagger-parser (run npm install).');
    }
  }

  private extract(
    file: string,
    doc: Record<string, unknown>,
  ): { spec: ApiSpec; endpoints: ApiEndpoint[]; parameters: ApiParameter[]; outputFields: ApiOutputField[] } {
    const info = (doc['info'] ?? {}) as Record<string, unknown>;
    const specId = uuid();
    const paths = (doc['paths'] ?? {}) as Record<string, Record<string, unknown>>;

    const endpoints: ApiEndpoint[] = [];
    const parameters: ApiParameter[] = [];
    const outputFields: ApiOutputField[] = [];

    for (const [path, ops] of Object.entries(paths)) {
      for (const method of METHODS) {
        const op = ops[method.toLowerCase()] as Record<string, unknown> | undefined;
        if (!op) continue;
        const endpointId = uuid();
        endpoints.push({
          id: endpointId,
          specId,
          operationId: (op['operationId'] as string) ?? null,
          method,
          path,
          summary: (op['summary'] as string) ?? null,
          description: (op['description'] as string) ?? null,
          tags: (op['tags'] as string[]) ?? [],
          categoryId: null,
        });

        for (const p of (op['parameters'] as Record<string, unknown>[]) ?? []) {
          parameters.push({
            id: uuid(),
            endpointId,
            name: String(p['name'] ?? ''),
            location: (String(p['in'] ?? 'query') as ApiParameter['location']),
            required: Boolean(p['required']),
            schemaType: ((p['schema'] as Record<string, unknown>)?.['type'] as string) ?? null,
            example: p['example'] != null ? String(p['example']) : null,
          });
        }

        // Output fields: flatten the 200 response JSON schema (one level for MVP).
        const responses = (op['responses'] ?? {}) as Record<string, unknown>;
        const ok = (responses['200'] ?? responses['201'] ?? {}) as Record<string, unknown>;
        const schema = this.responseSchema(ok);
        for (const jsonPath of this.flattenSchema(schema)) {
          outputFields.push({ id: uuid(), endpointId, jsonPath, schemaType: null, description: null });
        }
      }
    }

    const spec: ApiSpec = {
      id: specId,
      title: (info['title'] as string) ?? basename(file),
      version: (info['version'] as string) ?? '0.0.0',
      sourcePath: file,
      rawFormat: extname(file).toLowerCase() === '.json' ? 'json' : 'yaml',
      importedAt: nowIso(),
      endpointCount: endpoints.length,
    };
    return { spec, endpoints, parameters, outputFields };
  }

  private responseSchema(resp: Record<string, unknown>): Record<string, unknown> | null {
    const content = (resp['content'] as Record<string, unknown>) ?? {};
    const appJson = (content['application/json'] as Record<string, unknown>) ?? {};
    return (appJson['schema'] as Record<string, unknown>) ?? null;
  }

  private flattenSchema(schema: Record<string, unknown> | null, prefix = '$'): string[] {
    if (!schema) return [];
    const props = (schema['properties'] as Record<string, Record<string, unknown>>) ?? {};
    const out: string[] = [];
    for (const [key, value] of Object.entries(props)) {
      const path = `${prefix}.${key}`;
      out.push(path);
      if (value['type'] === 'object') out.push(...this.flattenSchema(value, path));
    }
    return out;
  }
}
