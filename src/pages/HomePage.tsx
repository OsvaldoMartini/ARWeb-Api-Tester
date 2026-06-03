import { Link } from 'react-router-dom';
import { NAV_ITEMS } from '@/lib/nav';
import { PageHeader } from '@/components/ui/PageHeader';
import { useAppStore } from '@/store/appStore';

export function HomePage() {
  const sidecarStatus = useAppStore((s) => s.sidecarStatus);
  // Skip Home itself when rendering the quick-action grid.
  const cards = NAV_ITEMS.filter((n) => n.path !== '/');

  return (
    <div>
      <PageHeader
        title="ARWEB API Tester"
        subtitle="No-code banking API testing — import real specs, map them to business categories, and run validated BotJobs. No login required."
      />

      <div className="card mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">Engine status</div>
            <div className="text-xs text-text-muted">
              Business logic runs in the local Node sidecar.
            </div>
          </div>
          <span
            className={
              'badge ' +
              (sidecarStatus === 'online'
                ? 'badge-passed'
                : sidecarStatus === 'offline'
                  ? 'badge-failed'
                  : 'badge-unmapped')
            }
          >
            {sidecarStatus}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(({ path, label, description, icon: Icon }) => (
          <Link key={path} to={path} className="card transition-colors hover:border-primary">
            <div className="mb-2 flex items-center gap-2">
              <Icon size={18} className="text-primary" />
              <span className="font-medium">{label}</span>
            </div>
            <p className="text-sm text-text-muted">{description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
