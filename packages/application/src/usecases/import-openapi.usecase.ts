import type { Logger, Result } from '@arweb/common';
import { ok } from '@arweb/common';
import type { ImportResultDto } from '../dto/index.js';

/**
 * Use-case interface for importing an OpenAPI folder. The concrete importer lives
 * in infrastructure; this keeps the orchestration testable and UI-agnostic.
 */
export interface OpenApiImporter {
  importFolder(folderPath: string): Promise<ImportResultDto>;
}

export class ImportOpenApiUseCase {
  constructor(
    private readonly importer: OpenApiImporter,
    private readonly logger: Logger,
  ) {}

  async execute(folderPath: string): Promise<Result<ImportResultDto>> {
    this.logger.info('Starting OpenAPI import', { folderPath });
    const result = await this.importer.importFolder(folderPath);
    this.logger.info('Import finished', {
      specs: result.specsImported,
      endpoints: result.endpointsImported,
      failures: result.failures.length,
    });
    return ok(result);
  }
}
