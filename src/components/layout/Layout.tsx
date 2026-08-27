import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { ErrorBoundary } from './ErrorBoundary';
import { useAppStore } from '@/store/appStore';

export function Layout() {
  const checkSidecar = useAppStore((s) => s.checkSidecar);

  // Poll sidecar liveness so the TopBar indicator stays honest. The sidecar may
  // start a beat after the window, so we check immediately and then on interval.
  useEffect(() => {
    void checkSidecar();
    const id = window.setInterval(() => void checkSidecar(), 5000);
    return () => window.clearInterval(id);
  }, [checkSidecar]);

  return (
    <div className="flex h-full">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="min-h-0 flex-1 overflow-y-auto p-6">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
