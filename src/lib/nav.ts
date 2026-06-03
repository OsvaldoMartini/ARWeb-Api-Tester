import {
  Home,
  Upload,
  BookOpen,
  Layers,
  Bot,
  ClipboardList,
  Workflow,
  PlayCircle,
  Server,
  BarChart3,
  Settings,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  /** Route path (also used as React Router path). */
  path: string;
  /** Sidebar label. */
  label: string;
  /** Short description shown on Home cards. */
  description: string;
  icon: LucideIcon;
}

/**
 * The 11 main navigation destinations (roadmap Phase 13). This is the single
 * source of truth — both the Sidebar and the Router map over it, so adding a
 * page later means adding one entry here plus one page component.
 */
export const NAV_ITEMS: NavItem[] = [
  { path: '/', label: 'Home', description: 'Overview and quick actions.', icon: Home },
  { path: '/import', label: 'Import APIs', description: 'Scan folders / OpenAPI specs into the catalog.', icon: Upload },
  { path: '/catalog', label: 'API Catalog', description: 'Browse imported endpoints, params and fields.', icon: BookOpen },
  { path: '/categories', label: 'Business Categories', description: '25 banking categories mapped to real endpoints.', icon: Layers },
  { path: '/assistant', label: 'AI Assistant', description: 'Ask the multi-agent banking router.', icon: Bot },
  { path: '/test-cases', label: 'Test Cases', description: 'Manage reusable test definitions.', icon: ClipboardList },
  { path: '/designer', label: 'BotJob Designer', description: 'Compose command sequences visually.', icon: Workflow },
  { path: '/execute', label: 'Execute Tests', description: 'Run BotJobs and inspect the audit trail.', icon: PlayCircle },
  { path: '/mock', label: 'Mock Server', description: 'Local mock server for offline testing.', icon: Server },
  { path: '/reports', label: 'Reports', description: 'Export HTML / CSV / Bash artifacts.', icon: BarChart3 },
  { path: '/settings', label: 'Settings', description: 'AI providers, ports and preferences.', icon: Settings },
];
