import type {
  ActionValidationResult,
  AiProvider,
  DialogueContext,
  NarrationContext,
  NarrationResult,
  RumorRewriteContext,
} from './aiProvider';
import { buildDialoguePrompt, buildNarrationPrompt, buildRumorPrompt, buildValidationPrompt } from './prompts';

const ENDPOINT = 'https://api.anthropic.com/v1/messages';
const MODEL_FULL = 'claude-haiku-4-5-20251001';
const MODEL_LOW = 'claude-haiku-4-5-20251001';
const ANTHROPIC_VERSION = '2023-06-01';

async function message(
  apiKey: string,
  model: string,
  system: string,
  user: string,
  maxTokens: number,
): Promise<string> {
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Claude ${response.status}: ${body.slice(0, 200)}`);
  }

  const data = await response.json() as { content: Array<{ type: string; text: string }> };
  return data.content.find((block) => block.type === 'text')?.text?.trim() ?? '';
}

export function createClaudeProvider(apiKey: string, lowTokenMode: boolean): AiProvider {
  const model = lowTokenMode ? MODEL_LOW : MODEL_FULL;

  return {
    async generateNarration(ctx: NarrationContext): Promise<NarrationResult> {
      const { system, user } = buildNarrationPrompt(ctx);
      const text = await message(apiKey, model, system, user, lowTokenMode ? 120 : 200);
      return { storyText: text, tone: 'neutral' };
    },

    async generateDialogue(ctx: DialogueContext): Promise<string> {
      const { system, user } = buildDialoguePrompt(ctx);
      return message(apiKey, model, system, user, lowTokenMode ? 80 : 120);
    },

    async interpretCustomAction(
      action: string,
      combatContext: string,
      worldType: string,
      stats: { 體魄: number; 機敏: number },
    ): Promise<ActionValidationResult> {
      const { system, user } = buildValidationPrompt(action, combatContext, worldType, stats);
      const raw = await message(apiKey, model, system, user, 120);
      return parseValidationJson(raw, action);
    },

    async rewriteRumor(ctx: RumorRewriteContext): Promise<string> {
      const { system, user } = buildRumorPrompt(ctx);
      return message(apiKey, model, system, user, lowTokenMode ? 80 : 120);
    },
  };
}

function parseValidationJson(raw: string, action: string): ActionValidationResult {
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('no json');
    const parsed = JSON.parse(match[0]) as {
      valid?: boolean;
      reason?: string;
      suggestedEngineAction?: string;
    };
    return {
      valid: Boolean(parsed.valid),
      reason: parsed.reason ?? '',
      suggestedEngineAction: parsed.suggestedEngineAction,
    };
  } catch {
    return { valid: true, reason: `AI 未能判斷「${action}」，交由本地引擎處理。` };
  }
}
