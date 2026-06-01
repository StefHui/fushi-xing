import type {
  ActionValidationResult,
  AiProvider,
  DialogueContext,
  NarrationContext,
  NarrationResult,
  RumorRewriteContext,
} from './aiProvider';
import { buildDialoguePrompt, buildNarrationPrompt, buildRumorPrompt, buildValidationPrompt } from './prompts';

const ENDPOINT = 'https://api.openai.com/v1/chat/completions';
const MODEL_FULL = 'gpt-4o-mini';
const MODEL_LOW = 'gpt-4o-mini';

async function chat(
  apiKey: string,
  model: string,
  system: string,
  user: string,
  maxTokens: number,
): Promise<string> {
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI ${response.status}: ${body.slice(0, 200)}`);
  }

  const data = await response.json() as { choices: Array<{ message: { content: string } }> };
  return data.choices[0]?.message?.content?.trim() ?? '';
}

export function createOpenAiProvider(apiKey: string, lowTokenMode: boolean): AiProvider {
  const model = lowTokenMode ? MODEL_LOW : MODEL_FULL;

  return {
    async generateNarration(ctx: NarrationContext): Promise<NarrationResult> {
      const { system, user } = buildNarrationPrompt(ctx);
      const text = await chat(apiKey, model, system, user, lowTokenMode ? 120 : 200);
      return { storyText: text, tone: 'neutral' };
    },

    async generateDialogue(ctx: DialogueContext): Promise<string> {
      const { system, user } = buildDialoguePrompt(ctx);
      return chat(apiKey, model, system, user, lowTokenMode ? 80 : 120);
    },

    async interpretCustomAction(
      action: string,
      combatContext: string,
      worldType: string,
      stats: { 體魄: number; 機敏: number },
    ): Promise<ActionValidationResult> {
      const { system, user } = buildValidationPrompt(action, combatContext, worldType, stats);
      const raw = await chat(apiKey, model, system, user, 120);
      return parseValidationJson(raw, action);
    },

    async rewriteRumor(ctx: RumorRewriteContext): Promise<string> {
      const { system, user } = buildRumorPrompt(ctx);
      return chat(apiKey, model, system, user, lowTokenMode ? 80 : 120);
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
    // Fallback: if JSON parse fails, treat as valid and let engine decide
    return { valid: true, reason: `AI 未能判斷「${action}」，交由本地引擎處理。` };
  }
}
