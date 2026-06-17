import { AlertCircle } from 'lucide-react';

export function ErrorAlert({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
      <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
}
