import type {
  ActionValidationResult,
  AiProvider,
  DialogueContext,
  NarrationContext,
  NarrationResult,
  RumorRewriteContext,
} from './aiProvider';

// No-op provider used when AI is disabled.
// All methods return empty results so callers can treat them uniformly.
export const offProvider: AiProvider = {
  async generateNarration(_ctx: NarrationContext): Promise<NarrationResult> {
    return { storyText: '', tone: 'neutral' };
  },

  async generateDialogue(_ctx: DialogueContext): Promise<string> {
    return '';
  },

  async interpretCustomAction(
    _action: string,
    _combatContext: string,
    _worldType: string,
    _stats: { 體魄: number; 機敏: number },
  ): Promise<ActionValidationResult> {
    return { valid: true, reason: '' };
  },

  async rewriteRumor(ctx: RumorRewriteContext): Promise<string> {
    return ctx.originalText;
  },
};
