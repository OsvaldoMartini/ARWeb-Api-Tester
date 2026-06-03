/**
 * Design tokens for the dark "banking" theme. Consumed by the desktop app's
 * Tailwind config and CSS variables so the look is centralized and easy to retheme.
 */
export const tokens = {
  color: {
    bg: '#0b1020',
    surface: '#121a2e',
    surfaceAlt: '#1a2440',
    border: '#243049',
    text: '#e6ebf5',
    textMuted: '#94a3b8',
    primary: '#3b82f6',
    success: '#16a34a',
    warning: '#d97706',
    danger: '#dc2626',
  },
  radius: { sm: '6px', md: '10px', lg: '16px' },
  font: { sans: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif' },
} as const;

export type Tokens = typeof tokens;
