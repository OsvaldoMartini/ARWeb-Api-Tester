import type { HttpMethod } from '../enums/index.js';

/**
 * API catalog entities. These are the ground truth that RealApiCatalogValidator
 * checks every plan/command against — nothing outside this catalog may be used.
 */

export interface ApiSpec {
  id: string;
  title: string;
  version: string;
  sourcePath: string; // file the spec was imported from
  rawFormat: 'json' | 'yaml';
  importedAt: string; // ISO
  endpointCount: number;
}

export interface ApiEndpoint {
  id: string;
  specId: string;
  operationId: string | null;
  method: HttpMethod;
  path: string; // e.g. /accounts/{accountId}/balance
  summary: string | null;
  description: string | null;
  tags: string[];
  /** business category id this endpoint was auto-mapped to (nullable until mapped) */
  categoryId: string | null;
}

export type ParameterLocation = 'path' | 'query' | 'header' | 'cookie' | 'body';

export interface ApiParameter {
  id: string;
  endpointId: string;
  name: string;
  location: ParameterLocation;
  required: boolean;
  schemaType: string | null; // string | integer | object ...
  example: string | null;
}

/** A field that an endpoint is documented to return (used by EXTRACT_JSON_PATH / assertions). */
export interface ApiOutputField {
  id: string;
  endpointId: string;
  jsonPath: string; // e.g. $.data.balance.amount
  schemaType: string | null;
  description: string | null;
}

/** Declared/known dependency between endpoints (e.g. need accountId from list call). */
export interface ApiDependency {
  id: string;
  endpointId: string;
  dependsOnEndpointId: string;
  reason: string | null;
}
