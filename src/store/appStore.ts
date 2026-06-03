import { create } from 'zustand';
import { sidecar } from '@/services/sidecarClient';

export type ConversationMode = 'employee' | 'client';
export type SidecarStatus = 'unknown' | 'online' | 'offline';

interface AppState {
  /** Pilot 3's two conversation modes. Drives AI Assistant tone + agent set. */
  mode: ConversationMode;
  setMode: (mode: ConversationMode) => void;

  /** Liveness of the Node sidecar (business-logic process). */
  sidecarStatus: SidecarStatus;
  /** Pings /health and updates `sidecarStatus`. Never throws. */
  checkSidecar: () => Promise<void>;
}

export const useAppStore = create<AppState>((set) => ({
  mode: 'employee',
  setMode: (mode) => set({ mode }),

  sidecarStatus: 'unknown',
  checkSidecar: async () => {
    try {
      const h = await sidecar.health();
      set({ sidecarStatus: h.ok ? 'online' : 'offline' });
    } catch {
      set({ sidecarStatus: 'offline' });
    }
  },
}));
