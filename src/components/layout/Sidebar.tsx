import { NavLink } from 'react-router-dom';
import { NAV_ITEMS } from '@/lib/nav';
import { cn } from '@arweb/shared-ui';

export function Sidebar() {
  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-border bg-surface">
      <div className="flex items-center gap-2 px-4 py-4">
        <div className="grid h-8 w-8 place-items-center rounded-md bg-primary text-sm font-bold text-white">
          AR
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold">ARAPI</div>
          <div className="text-xs text-text-muted">API Tester</div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-2">
        {NAV_ITEMS.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            // `end` only on the index route so "/" isn't always active.
            end={path === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-primary/15 text-primary'
                  : 'text-text-muted hover:bg-surface-alt hover:text-text',
              )
            }
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-border px-4 py-3 text-xs text-text-muted">
        No login required
      </div>
    </aside>
  );
}
