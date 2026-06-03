/** Banking taxonomy (Phase 6) — 25 categories x 5 subcategories in Pilot 1. */

export interface BusinessCategory {
  id: string;
  name: string; // human-readable, e.g. "Payments & Transfers"
  description: string | null;
  keywords: string[]; // used to auto-map endpoints
  order: number;
}

export interface BusinessSubcategory {
  id: string;
  categoryId: string;
  name: string;
  keywords: string[];
  order: number;
}

export interface BusinessTestCase {
  id: string;
  categoryId: string;
  subcategoryId: string | null;
  title: string;
  description: string | null;
  /** endpoints (by id) this test case is expected to touch */
  endpointIds: string[];
  createdAt: string;
}

/** Pilot 3 demo banking context — simulated client data so the tool demos offline. */
export interface DemoBankingContext {
  id: string;
  name: string; // e.g. "Mario Rossi - Private Client"
  json: string; // serialized context payload
  updatedAt: string;
}
