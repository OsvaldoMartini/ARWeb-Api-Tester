import { create } from 'zustand';
import { sidecar } from '@/services/sidecarClient';

export type ConversationMode = 'employee' | 'client';
export type SidecarStatus = 'unknown' | 'online' | 'offline';

interface AppState {
  mode: ConversationMode;
  setMode: (mode: ConversationMode) => void;
  sidecarStatus: SidecarStatus;
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
