/**
 * Enumerations shared by the whole domain.
 * Command types use a string union (not a TS `enum`) so new types can be added
 * without breaking persisted data — Pilot 1's "extensible without enum changes".
 */

export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'] as const;
export type HttpMethod = (typeof HTTP_METHODS)[number];

/** MVP command set (Phase 8). The full set will grow toward the 33 from Pilot 1. */
export const MVP_COMMAND_TYPES = [
  'API_CALL',
  'SET_VARIABLE',
  'ASSERT_STATUS_CODE',
  'ASSERT_FIELD_VALUE',
  'ASSERT_JSON_PATH_EXISTS',
  'EXTRACT_JSON_PATH',
  'IF',
  'ELSE',
  'LOOP',
  'FOR_EACH',
  'READ_CSV',
  'READ_EXCEL',
  'WAIT',
  'AI_GENERATE_DATA',
  'CALL_COMPONENT',
  'STOP_ON_FAILURE',
] as const;
export type CommandType = (typeof MVP_COMMAND_TYPES)[number] | (string & {});

export type ExecutionStatus = 'pending' | 'running' | 'passed' | 'failed' | 'error' | 'skipped';

export type MappingStatus = 'mapped' | 'unmapped' | 'validated' | 'failed' | 'passed';

/** Two conversation modes from Pilot 3. */
export type ConversationMode = 'employee' | 'client';

/** Supported AI providers (Phase 11). */
export const AI_PROVIDERS = [
  'openai',
  'anthropic',
  'gemini',
  'azure-openai',
  'ollama',
  'together',
  'custom-openai',
] as const;
export type AiProvider = (typeof AI_PROVIDERS)[number];
