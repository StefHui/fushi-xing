// workEngine.ts
// Resolves work actions: time cost, reward, NPC encounter, combat trigger.

import type { Choice, GameState, JournalEntry, NpcProfile, StoryNode } from '../types/game';
import { getLocationDef } from './locationEngine';

export interface WorkResult {
  game: GameState;
  triggerCombat: boolean;
}

// ─── Work Definitions ─────────────────────────────────────────────────────────

interface WorkDef {
  id: string;
  timeCost: number;        // hours (1-8)
  baseReward: number;      // copper
  rewardVariance: number;  // +/- random range
  successChance: number;   // 0-1
  combatChance: number;    // 0-1
  skillGain: Partial<{ 體魄: number; 心神: number; 機敏: number; 口才: number; 運道: number }>;
  successTexts: string[];
  failTexts: string[];
  npcEncounterChance: number;
}

const WORK_DEFS: Record<string, WorkDef> = {
  劈柴: {
    id: '劈柴',
    timeCost: 2,
    baseReward: 8,
    rewardVariance: 4,
    successChance: 0.9,
    combatChance: 0,
    skillGain: { 體魄: 1 },
    successTexts: [
      '你埋頭劈咗兩個時辰嘅柴，手掌起了繭，但口袋實在了。',
      '斧頭一下一下，柴堆越來越高。掌櫃點頭，照數給錢。',
      '重複又重複，但錢係真實的。你完成了今日份。',
    ],
    failTexts: [
      '斧頭崩口，活計只做了一半。掌櫃打了折扣。',
      '力氣不繼，提前收工。錢少了，但已是今日最好結果。',
    ],
    npcEncounterChance: 0.3,
  },
  搬貨: {
    id: '搬貨',
    timeCost: 3,
    baseReward: 12,
    rewardVariance: 6,
    successChance: 0.85,
    combatChance: 0.05,
    skillGain: { 體魄: 1 },
    successTexts: [
      '一箱又一箱，你把貨物從碼頭搬到倉庫。腰酸背痛，但工錢落袋。',
      '貨主滿意，多給了幾個銅板。「明日還有活，有興趣嗎？」',
      '搬完最後一批，你在路邊坐了許久，才緩過來。',
    ],
    failTexts: [
      '途中滑倒，貨物損毀，賠了部分工錢。',
      '路途比想像中遠，到達時天已黑，只拿到基本工錢。',
    ],
    npcEncounterChance: 0.4,
  },
  採藥: {
    id: '採藥',
    timeCost: 4,
    baseReward: 20,
    rewardVariance: 15,
    successChance: 0.7,
    combatChance: 0.25,
    skillGain: { 機敏: 1 },
    successTexts: [
      '你在山林中找到了幾株上好藥材。藥師看後點頭，開了好價錢。',
      '採藥要眼尖，你找到的比預期多。今日運氣不錯。',
      '幾個時辰的尋找，換來一把草藥和一個滿意的買家。',
    ],
    failTexts: [
      '找了大半天，只採到些普通草根。藥師搖頭，給了個低價。',
      '下了一場雨，藥材難找，空手而回。',
    ],
    npcEncounterChance: 0.5,
  },
  打獵: {
    id: '打獵',
    timeCost: 5,
    baseReward: 25,
    rewardVariance: 20,
    successChance: 0.6,
    combatChance: 0.4,
    skillGain: { 機敏: 1, 體魄: 1 },
    successTexts: [
      '你在林中設了陷阱，等了許久，終於有所收穫。獵物換了不少銅錢。',
      '追蹤了一個多時辰，箭矢沒有白費。',
      '今日運氣好，遇到的獵物比平時大。',
    ],
    failTexts: [
      '獵物比你更懂得躲藏，一無所獲。',
      '追了許久，獵物逃進了更深的林子。',
    ],
    npcEncounterChance: 0.6,
  },
  跟獵人入山: {
    id: '跟獵人入山',
    timeCost: 5,
    baseReward: 18,
    rewardVariance: 10,
    successChance: 0.8,
    combatChance: 0.3,
    skillGain: { 機敏: 1 },
    successTexts: [
      '獵人帶路，你學到了幾個追蹤技巧。分成雖然少，但學到了東西。',
      '跟著有經驗的人，省去了很多彎路。收穫平穩。',
      '獵人話你有潛質，說下次可以多帶你。',
    ],
    failTexts: [
      '獵人今日手氣不好，你們都沒有太多收穫。',
      '中途遇到了麻煩，不得不提前撤退。',
    ],
    npcEncounterChance: 0.8,
  },
  客棧幫工: {
    id: '客棧幫工',
    timeCost: 4,
    baseReward: 10,
    rewardVariance: 5,
    successChance: 0.9,
    combatChance: 0,
    skillGain: { 口才: 1 },
    successTexts: [
      '端茶遞水，打掃擦桌，你聽到了好幾段江湖消息。掌櫃給了工錢，消息是額外的。',
      '客棧不缺話多的客人，你學會了怎麼聽而不被看出在聽。',
      '一天下來，腳痠了，但耳朵收穫不少。',
    ],
    failTexts: [
      '打碎了一個茶碗，被扣了工錢。',
      '今日客人不多，工錢也就少了。',
    ],
    npcEncounterChance: 0.7,
  },
  跑腿: {
    id: '跑腿',
    timeCost: 2,
    baseReward: 6,
    rewardVariance: 8,
    successChance: 0.85,
    combatChance: 0.1,
    skillGain: { 機敏: 1 },
    successTexts: [
      '你把信件送到了指定地點，沒有多問，對方滿意。',
      '跑了幾條街，比想像中快。送完後還有時間做別的。',
      '路上遇到些事，但你還是準時送達了。',
    ],
    failTexts: [
      '路找錯了，到了才發現地址不對。耽誤了時間，只拿到一半工錢。',
      '途中出了意外，信件晚了送到。',
    ],
    npcEncounterChance: 0.5,
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function advanceTime(game: GameState, hours: number): GameState {
  const phases: GameState['worldClock']['phase'][] = ['清晨', '日間', '黃昏', '深夜'];
  const hoursPerPhase = 6;
  const currentPhaseIdx = phases.indexOf(game.worldClock.phase);
  const totalHours = currentPhaseIdx * hoursPerPhase + hours;
  const newPhaseIdx = Math.min(Math.floor(totalHours / hoursPerPhase), 3);
  const newDay = game.worldClock.day + Math.floor(totalHours / 24);

  return {
    ...game,
    worldClock: {
      ...game.worldClock,
      phase: phases[newPhaseIdx % 4],
      day: newDay,
    },
  };
}

function formatCopper(copper: number): string {
  if (copper >= 1000) return `${Math.floor(copper / 1000)}兩${copper % 1000 > 0 ? `${copper % 1000}文` : ''}`;
  return `${copper}文銅錢`;
}

// ─── Main Resolver ────────────────────────────────────────────────────────────

export function resolveWorkAction(game: GameState, workId: string, locationId: string): WorkResult {
  const def = WORK_DEFS[workId] ?? WORK_DEFS['劈柴'];
  const now = new Date().toISOString();
  const success = Math.random() < def.successChance;
  const triggerCombat = success && Math.random() < def.combatChance;
  const triggerNpc = Math.random() < def.npcEncounterChance;

  // Calculate reward
  const variance = Math.floor((Math.random() * 2 - 1) * def.rewardVariance);
  const earned = success ? Math.max(1, def.baseReward + variance) : Math.floor(def.baseReward * 0.3);

  // Build result text
  const baseText = success ? pick(def.successTexts) : pick(def.failTexts);
  const rewardText = success
    ? `\n\n你賺到了 ${formatCopper(earned)}。`
    : `\n\n你只拿到了 ${formatCopper(earned)}。`;

  // NPC encounter text
  let npcText = '';
  let encounteredNpc: NpcProfile | undefined;
  if (triggerNpc && game.npcs.length > 0) {
    const locNpcs = game.npcs.filter(
      (n) => n.location === locationId || n.location === (game.map.find((m) => m.id === locationId)?.name ?? ''),
    );
    encounteredNpc = locNpcs.length > 0 ? pick(locNpcs) : pick(game.npcs);
    npcText = `\n\n做工途中，${encounteredNpc.name}（${encounteredNpc.role}）出現了，神情${encounteredNpc.mood}。`;
  }

  // Combat encounter text
  let combatText = '';
  if (triggerCombat) {
    combatText = `\n\n⚠️ 突然間，前方有危險！你需要應對。`;
  }

  const fullText = baseText + rewardText + npcText + combatText;

  // Apply stat gains
  const statGains = def.skillGain as Partial<typeof game.character.stats>;

  // Build follow-up choices
  const choices: Choice[] = [];
  const keys: Array<'A' | 'B' | 'C' | 'D' | 'E'> = ['A', 'B', 'C', 'D', 'E'];
  let keyIdx = 0;

  if (encounteredNpc && !triggerCombat) {
    choices.push({
      id: `npc-talk::${encounteredNpc.id}`,
      key: keys[keyIdx++],
      label: `同${encounteredNpc.name}傾計`,
      hint: `${encounteredNpc.role}喺度，或者有嘢可以談。`,
      effects: { 口才: 1 },
      nextBeat: '傾計',
    });
  }

  choices.push({
    id: `work-menu::${locationId}`,
    key: keys[keyIdx++],
    label: '再搵份工',
    hint: '繼續搵工賺錢。',
    effects: {},
    nextBeat: '搵工',
  });

  choices.push({
    id: `observe::${locationId}`,
    key: keys[keyIdx++],
    label: '四處走走',
    hint: '喺附近轉轉，睇有冇其他機會。',
    effects: { 機敏: 1 },
    nextBeat: '觀察',
  });

  choices.push({
    id: `free-move`,
    key: keys[keyIdx++],
    label: '去另一個地方',
    hint: '打開地圖移動。',
    effects: {},
    nextBeat: '移動',
  });

  // Journal entry
  const journalEntry: JournalEntry = {
    id: `work-${game.id}-${game.turn + 1}`,
    kind: 'choice',
    text: `做了「${workId}」，${success ? `賺到 ${formatCopper(earned)}` : `失敗，只得 ${formatCopper(earned)}`}。`,
    createdAt: now,
  };

  // Apply changes
  let updatedGame = advanceTime(game, def.timeCost);
  updatedGame = {
    ...updatedGame,
    character: {
      ...updatedGame.character,
      stats: {
        ...updatedGame.character.stats,
        ...Object.fromEntries(
          Object.entries(statGains).map(([k, v]) => [
            k,
            (updatedGame.character.stats[k as keyof typeof updatedGame.character.stats] ?? 0) + (v ?? 0),
          ]),
        ),
      },
    },
    wallet: {
      copper: updatedGame.wallet.copper + earned,
    },
    journal: [journalEntry, ...updatedGame.journal].slice(0, 30),
    story: {
      id: `work-result-${workId}-${Date.now()}`,
      title: `${workId} — ${success ? '完成' : '不順'}`,
      body: fullText,
      choices: choices.slice(0, 5),
      phase: 'work-result' as const,
    },
    turn: updatedGame.turn + 1,
    updatedAt: now,
  };

  return { game: updatedGame, triggerCombat };
}
