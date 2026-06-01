// All prompt templates live here so both providers share identical Cantonese instructions.

import type { DialogueContext, NarrationContext, RumorRewriteContext } from './aiProvider';

const CANTONESE_NARRATOR_SYSTEM =
  '你係廣東話文字RPG旁白。用繁體中文廣東話書寫。短句，有畫面感，唔超過80字。唔改遊戲數值，唔提技能職業，唔提玩家係天選之人。';

const CANTONESE_NPC_SYSTEM =
  '你係廣東話NPC角色。用繁體中文廣東話書寫。根據同玩家嘅關係決定語氣。唔超過50字。唔做承諾，唔直接改變數值。';

const CANTONESE_JUDGE_SYSTEM =
  '你係遊戲行動裁判。只回傳JSON，唔係其他文字。判斷玩家嘅行動係咪符合呢個世界嘅物理同能力範圍。';

const CANTONESE_RUMOR_SYSTEM =
  '你係廣東話說書人。用繁體中文廣東話口語改寫傳聞。唔超過60字。保持原有真實性。';

export function buildNarrationPrompt(ctx: NarrationContext): { system: string; user: string } {
  const memoriesText = ctx.recentMemories.length
    ? ctx.recentMemories.join('；')
    : '（無特別記憶）';
  const rumorsText = ctx.activeRumors.length ? ctx.activeRumors.join('；') : '（無傳聞）';

  return {
    system: CANTONESE_NARRATOR_SYSTEM,
    user: [
      `世界：${ctx.worldType} / 地點：${ctx.location} / ${ctx.timePhase} / 張力${ctx.tension}`,
      `玩家「${ctx.playerName}」做咗：「${ctx.playerAction}」`,
      `故事節點：${ctx.currentBeat}`,
      `重要記憶：${memoriesText}`,
      `近期傳聞：${rumorsText}`,
      '',
      '請寫一段短旁白，描述行動後嘅畫面同感覺。',
    ].join('\n'),
  };
}

export function buildDialoguePrompt(ctx: DialogueContext): { system: string; user: string } {
  const memoriesText = ctx.importantMemories.length
    ? ctx.importantMemories.join('；')
    : '（無特別印象）';

  return {
    system: CANTONESE_NPC_SYSTEM,
    user: [
      `你係${ctx.npcName}（${ctx.npcRole}），性格：${ctx.npcMood}。`,
      `對玩家態度：${ctx.disposition}（信任${ctx.trustLevel}/10）`,
      `你記得：${memoriesText}`,
      ctx.relevantRumor ? `相關傳聞：${ctx.relevantRumor}` : '',
      `玩家向你做：「${ctx.playerAction}」`,
      '',
      '請用你嘅口吻回應一句或兩句。',
    ]
      .filter(Boolean)
      .join('\n'),
  };
}

export function buildValidationPrompt(
  action: string,
  combatContext: string,
  worldType: string,
  stats: { 體魄: number; 機敏: number },
): { system: string; user: string } {
  return {
    system: CANTONESE_JUDGE_SYSTEM,
    user: [
      `世界：${worldType}，玩家體魄${stats.體魄}，機敏${stats.機敏}`,
      `戰況：${combatContext}`,
      `玩家想做：「${action}」`,
      '',
      '回傳JSON格式（唔加其他文字）：',
      '{"valid":true/false,"reason":"廣東話原因","suggestedEngineAction":"快攻|重擊|防守|推開|null"}',
    ].join('\n'),
  };
}

export function buildRumorPrompt(ctx: RumorRewriteContext): { system: string; user: string } {
  return {
    system: CANTONESE_RUMOR_SYSTEM,
    user: [
      `原傳聞：「${ctx.originalText}」`,
      `真實性：${ctx.truthState} / 來源：${ctx.source} / 世界：${ctx.worldType}`,
      '',
      `用${ctx.source}嘅口吻改寫呢個傳聞。`,
    ].join('\n'),
  };
}
