import { type ReactNode } from 'react';

export function EmptyState({
  icon,
  title,
  body,
}: {
  icon?: ReactNode;
  title: string;
  body?: string;
}) {
  return (
    <div className="card flex flex-col items-center gap-2 py-10 text-center text-text-muted">
      {icon && <div className="text-3xl">{icon}</div>}
      <p className="text-sm font-medium text-text">{title}</p>
      {body && <p className="max-w-xs text-xs">{body}</p>}
    </div>
  );
}
