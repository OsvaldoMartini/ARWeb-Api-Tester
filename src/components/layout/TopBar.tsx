import { useLocation } from 'react-router-dom';
import { NAV_ITEMS } from '@/lib/nav';
import { useAppStore } from '@/store/appStore';
import { cn } from '@arweb/shared-ui';

const STATUS_STYLE: Record<string, string> = {
  online: 'bg-success',
  offline: 'bg-danger',
  unknown: 'bg-warning',
};

export function TopBar() {
  const { pathname } = useLocation();
  // Fallback label keeps this defined even if a route isn't in NAV_ITEMS
  // (satisfies noUncheckedIndexedAccess without a non-null assertion).
  const current = NAV_ITEMS.find((n) => n.path === pathname);
  const label = current?.label ?? 'ARWEB API Tester';

  const mode = useAppStore((s) => s.mode);
  const setMode = useAppStore((s) => s.setMode);
  const sidecarStatus = useAppStore((s) => s.sidecarStatus);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface px-5">
      <h1 className="text-sm font-semibold">{label}</h1>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1 rounded-md border border-border p-0.5">
          {(['employee', 'client'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                'rounded px-2.5 py-1 text-xs capitalize transition-colors',
                mode === m ? 'bg-primary text-white' : 'text-text-muted hover:text-text',
              )}
            >
              {m}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs text-text-muted">
          <span className={cn('h-2 w-2 rounded-full', STATUS_STYLE[sidecarStatus])} />
          sidecar {sidecarStatus}
        </div>
      </div>
    </header>
  );
}
