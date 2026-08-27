import { Loader2 } from 'lucide-react';

export function LoadingSpinner({ text = 'Loading…' }: { text?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-text-muted">
      <Loader2 size={16} className="animate-spin" />
      {text}
    </div>
  );
}
