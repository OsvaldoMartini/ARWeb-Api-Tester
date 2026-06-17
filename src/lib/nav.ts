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
  Globe,
  Sparkles,
  GitBranch,
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
  { path: '/assistant', label: 'AR Conversational Banking', description: 'Simulate banking conversations from employee and client perspectives.', icon: Bot },
  { path: '/test-cases', label: 'Test Cases', description: 'Manage reusable test definitions.', icon: ClipboardList },
  { path: '/builder', label: 'Bot Builder', description: 'Ask AI to create BotJobs, search the catalog, and run tests.', icon: Sparkles },
  { path: '/designer', label: 'BotJob Designer', description: 'Compose command sequences visually.', icon: Workflow },
  { path: '/environments', label: 'Environments', description: 'Named targets: dev, staging, prod — pick one when running BotJobs.', icon: Globe },
  { path: '/execute', label: 'Execute Tests', description: 'Run BotJobs and inspect the audit trail.', icon: PlayCircle },
  { path: '/mock', label: 'Mock Server', description: 'Local mock server for offline testing.', icon: Server },
  { path: '/reports', label: 'Reports', description: 'Export HTML / CSV / Bash artifacts.', icon: BarChart3 },
  { path: '/settings', label: 'Settings', description: 'AI providers, ports and preferences.', icon: Settings },
  { path: '/separation', label: 'Separation Progress', description: 'Live tracker for the ARAPI / AR Conversational split. (temporary)', icon: GitBranch },
];
