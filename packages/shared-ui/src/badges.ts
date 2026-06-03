import type { MappingStatus } from '@arweb/domain';

/** Status badge styling map (Phase 13 UX: mapped/unmapped/validated/passed/failed). */
export const badgeClass: Record<MappingStatus, string> = {
  mapped: 'badge badge-mapped',
  unmapped: 'badge badge-unmapped',
  validated: 'badge badge-validated',
  passed: 'badge badge-passed',
  failed: 'badge badge-failed',
};
