import { create } from 'zustand';

import { createClaudeProvider } from '../ai/claudeProvider';
import { createOpenAiProvider } from '../ai/openaiProvider';
import { offProvider } from '../ai/offProvider';
import { offlineProvider } from '../ai/offlineProvider';
import type { AiProvider } from '../ai/aiProvider';
import { loadSettings, saveSettings } from '../storage/settingsRepository';

export type AiProviderName = 'openai' | 'claude' | 'off';
export type GameMode = 'offline' | 'ai-enhanced';

interface SettingsStore {
  provider: AiProviderName;
  openaiKey: string;
  claudeKey: string;
  aiEnabled: boolean;
  lowTokenMode: boolean;
  gameMode: GameMode;
  isLoaded: boolean;

  initialize: () => Promise<void>;
  setProvider: (provider: AiProviderName) => Promise<void>;
  setOpenaiKey: (key: string) => Promise<void>;
  setClaudeKey: (key: string) => Promise<void>;
  setAiEnabled: (enabled: boolean) => Promise<void>;
  setLowTokenMode: (low: boolean) => Promise<void>;
  setGameMode: (mode: GameMode) => Promise<void>;
  getActiveProvider: () => AiProvider;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  provider: 'off',
  openaiKey: '',
  claudeKey: '',
  aiEnabled: false,
  lowTokenMode: true,
  gameMode: 'offline',
  isLoaded: false,

  initialize: async () => {
    const persisted = await loadSettings();
    set({ ...persisted, isLoaded: true });
  },

  setProvider: async (provider) => {
    set({ provider });
    await saveSettings({ ...get(), provider });
  },

  setOpenaiKey: async (key) => {
    set({ openaiKey: key });
    await saveSettings({ ...get(), openaiKey: key });
  },

  setClaudeKey: async (key) => {
    set({ claudeKey: key });
    await saveSettings({ ...get(), claudeKey: key });
  },

  setAiEnabled: async (enabled) => {
    set({ aiEnabled: enabled });
    await saveSettings({ ...get(), aiEnabled: enabled });
  },

  setLowTokenMode: async (low) => {
    set({ lowTokenMode: low });
    await saveSettings({ ...get(), lowTokenMode: low });
  },

  setGameMode: async (mode) => {
    set({ gameMode: mode });
    await saveSettings({ ...get(), gameMode: mode });
  },

  getActiveProvider: () => {
    const { gameMode, aiEnabled, provider, openaiKey, claudeKey, lowTokenMode } = get();
    // Offline mode: always use rich template-based provider
    if (gameMode === 'offline') return offlineProvider;
    // AI-Enhanced mode: use configured API provider, fall back to offline if unconfigured
    if (!aiEnabled || provider === 'off') return offlineProvider;
    if (provider === 'openai') {
      if (!openaiKey.trim()) return offlineProvider;
      return createOpenAiProvider(openaiKey.trim(), lowTokenMode);
    }
    if (provider === 'claude') {
      if (!claudeKey.trim()) return offlineProvider;
      return createClaudeProvider(claudeKey.trim(), lowTokenMode);
    }
    return offlineProvider;
  },
}));
