import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';

interface Phase {
  id: number;
  name: string;
  status: 'pending' | 'in-progress' | 'done' | 'blocked';
  note: string;
}

interface ProgressData {
  updated: string;
  phases: Phase[];
}

const STATUS_CLASS: Record<Phase['status'], string> = {
  pending:       'badge-unmapped',
  'in-progress': 'badge-mapped',
  done:          'badge-passed',
  blocked:       'badge-failed',
};

const STATUS_LABEL: Record<Phase['status'], string> = {
  pending:       'pending',
  'in-progress': 'in progress',
  done:          'done',
  blocked:       'blocked',
};

export function SeparationProgressPage() {
  const [data,  setData]  = useState<ProgressData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await fetch('/api/separation/progress');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 10_000);
    return () => clearInterval(id);
  }, []);

  const done  = data?.phases.filter((p) => p.status === 'done').length ?? 0;
  const total = data?.phases.length ?? 0;

  return (
    <div>
      <PageHeader title="Separation Progress" subtitle="Live tracker — splitting ARWeb into ARAPI Tester + AR Conversational. Auto-refreshes every 10 s." />
      {error && <div className="card mb-4 text-sm text-danger">{error}</div>}
      {data && (
        <>
          <div className="card mb-6 flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Overall progress</div>
              <div className="text-xs text-text-muted">Last updated: {data.updated}</div>
            </div>
            <span className="text-lg font-bold">{done} / {total} phases done</span>
          </div>
          <div className="space-y-3">
            {data.phases.map((phase) => (
              <div key={phase.id} className="card flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-muted font-mono shrink-0">Phase {phase.id}</span>
                    <span className="font-medium text-sm">{phase.name}</span>
                  </div>
                  {phase.note && <div className="text-xs text-text-muted mt-1">{phase.note}</div>}
                </div>
                <span className={`badge ${STATUS_CLASS[phase.status]} shrink-0`}>{STATUS_LABEL[phase.status]}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
