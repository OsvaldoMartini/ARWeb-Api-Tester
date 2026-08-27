import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bot, BookOpen, Settings } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { useAppStore } from '@/store/appStore';
import { sidecar, type AgentInfo } from '@/services/sidecarClient';

export function HomePage() {
  const sidecarStatus = useAppStore((s) => s.sidecarStatus);
  const [agents, setAgents] = useState<AgentInfo[]>([]);

  useEffect(() => {
    sidecar.getAgents().then(setAgents).catch(() => undefined);
  }, []);

  const wired   = agents.filter((a) => a.capabilityCount > 0).length;
  const total   = agents.length;

  return (
    <div>
      <PageHeader
        title="AR Conversational"
        subtitle="Banking conversation simulator — employee and client perspectives powered by real API catalog data."
      />

      {/* status card */}
      <div className="card mb-6 flex items-center justify-between">
        <div>
          <div className="text-sm font-medium">Sidecar status</div>
          <div className="text-xs text-text-muted">ARAPI backend connection · port 8787</div>
        </div>
        <span className={
          'badge ' +
          (sidecarStatus === 'online'  ? 'badge-passed'   :
           sidecarStatus === 'offline' ? 'badge-failed'   : 'badge-unmapped')
        }>
          {sidecarStatus}
        </span>
      </div>

      {/* agent summary */}
      {agents.length > 0 && (
        <div className="card mb-6">
          <div className="mb-3 text-sm font-medium">
            Agent coverage — {wired}/{total} agents wired to catalog
          </div>
          <div className="grid grid-cols-2 gap-2">
            {agents.map((a) => (
              <div key={a.id} className="flex items-center gap-2 text-xs">
                <span className={a.capabilityCount > 0 ? 'text-success' : 'text-text-muted opacity-50'}>
                  {a.capabilityCount > 0 ? '✓' : '○'}
                </span>
                <span className={a.capabilityCount === 0 ? 'opacity-40' : ''}>{a.name}</span>
                {a.capabilityCount > 0 && (
                  <span className="text-text-muted">{a.capabilityCount}</span>
                )}
              </div>
            ))}
          </div>
          {wired === 0 && (
            <p className="mt-3 text-xs text-text-muted">
              No endpoints assigned yet — import an OpenAPI spec in ARAPI first.
            </p>
          )}
        </div>
      )}

      {/* quick nav */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { to: '/assistant', icon: Bot,      label: 'AR Conversational', desc: 'Start a banking conversation.' },
          { to: '/catalog',   icon: BookOpen,  label: 'API Catalog',       desc: 'Browse endpoints used by agents.' },
          { to: '/settings',  icon: Settings,  label: 'Settings',          desc: 'Configure AI providers.' },
        ].map(({ to, icon: Icon, label, desc }) => (
          <Link key={to} to={to} className="card hover:ring-1 hover:ring-primary/40 transition-all">
            <Icon size={22} className="mb-2 text-primary" />
            <div className="font-medium text-sm">{label}</div>
            <div className="text-xs text-text-muted mt-1">{desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
