export interface Environment {
  id: string;
  name: string;
  baseUrl: string;
  description: string | null;
  /** Default HTTP headers injected into every API_CALL for this environment. */
  headers: Record<string, string>;
  isDefault: boolean;
  /** Built-in environments (e.g. mock) cannot be deleted. */
  isBuiltIn: boolean;
  createdAt: string;
  updatedAt: string;
}
