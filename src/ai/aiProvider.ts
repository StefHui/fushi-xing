// Central interface for all AI providers.
// Providers must never mutate game state — only return text and structured hints.

export interface NarrationContext {
  worldType: string;
  location: string;
  timePhase: string;
  tension: number;
  playerName: string;
  playerAction: string;
  currentBeat: string;
  recentMemories: string[]; // max 5
  activeRumors: string[];   // max 3
}

export interface NarrationResult {
  storyText: string;
  tone: 'neutral' | 'tense' | 'warm' | 'dark';
}

export interface DialogueContext {
  npcName: string;
  npcRole: string;
  npcMood: string;
  disposition: string;
  trustLevel: number;
  importantMemories: string[]; // importance >= 2, max 3
  relevantRumor?: string;
  playerAction: string;
}

export interface ActionValidationResult {
  valid: boolean;
  reason: string;
  suggestedEngineAction?: string;
}

export interface RumorRewriteContext {
  originalText: string;
  truthState: string;
  source: string;
  worldType: string;
}

export interface AiProvider {
  generateNarration(context: NarrationContext): Promise<NarrationResult>;
  generateDialogue(context: DialogueContext): Promise<string>;
  interpretCustomAction(
    action: string,
    combatContext: string,
    worldType: string,
    stats: { 體魄: number; 機敏: number },
  ): Promise<ActionValidationResult>;
  rewriteRumor(context: RumorRewriteContext): Promise<string>;
}
