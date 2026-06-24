import {
  Home,
  Bot,
  BookOpen,
  Settings,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  path: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { path: '/',          label: 'Home',             description: 'Overview and agent status.',                                  icon: Home },
  { path: '/assistant', label: 'AR Conversational', description: 'Simulate banking conversations from employee and client perspectives.', icon: Bot },
  { path: '/catalog',   label: 'API Catalog',       description: 'Browse imported endpoints used by the agents.',              icon: BookOpen },
  { path: '/settings',  label: 'Settings',          description: 'AI providers and connection preferences.',                   icon: Settings },
];
