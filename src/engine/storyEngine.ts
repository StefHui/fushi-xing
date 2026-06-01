import { applyStatEffects } from './statsEngine';
import type { Choice, GameState, JournalEntry, MapLocation, QuestNote, StoryNode, WorldSeed } from '../types/game';

export function createOpeningStory(game: Pick<GameState, 'character' | 'world'>): StoryNode {
  return {
    id: 'opening',
    title: getOpeningTitle(game.world),
    body: `${game.character.name}喺${game.world.startingPlace}醒神過嚟。呢個世界無等你，亦無人知你會嚟。${game.world.regionName}今日照常有自己嘅麻煩：${game.world.ordinaryPressure}。街邊有人講緊一件同你未必有關嘅事：${game.world.localRumor}。你可以理，亦可以唔理。`,
    choices: createBaseChoices(game.world),
  };
}

export function createInitialMap(world: WorldSeed): MapLocation[] {
  return [
    { id: 'start', name: world.startingPlace, note: '你而家企緊嘅地方。無人特別留意你。', status: '已知' },
    { id: 'region', name: world.regionName, note: `附近一帶嘅日常壓力：${world.ordinaryPressure}。`, status: '已知' },
    { id: 'rumor', name: '傳聞地點', note: world.localRumor, status: '傳聞' },
  ];
}

export function createInitialQuests(world: WorldSeed): QuestNote[] {
  return [
    {
      id: 'rumor',
      title: '路邊傳聞',
      note: `${world.localRumor}。呢件事唔係主線，你可以完全唔理。`,
      status: '可忽略',
    },
    {
      id: 'daily',
      title: '搵個落腳點',
      note: '世界唔會因為你停低而停低。你可以先搵飯、搵床、搵消息，或者周圍行。',
      status: '聽聞',
    },
  ];
}

export function resolveChoice(game: GameState, choiceId: string): GameState {
  const choice = game.story.choices.find((item) => item.id === choiceId);
  if (!choice) return game;

  const now = new Date().toISOString();
  const nextStory = buildNextStory(game, choice);
  const journalEntry: JournalEntry = {
    id: `${game.id}-choice-${game.turn + 1}`,
    kind: 'choice',
    text: `${choice.key}. ${choice.label}：${choice.nextBeat}`,
    createdAt: now,
  };

  return {
    ...game,
    character: {
      ...game.character,
      stats: applyStatEffects(game.character.stats, choice.effects),
    },
    journal: [journalEntry, ...game.journal].slice(0, 30),
    story: nextStory,
    turn: game.turn + 1,
    updatedAt: now,
  };
}

export function resolveFreeAction(game: GameState, action: string): GameState {
  const cleanAction = action.trim();
  if (!cleanAction) return game;

  const now = new Date().toISOString();
  const journalEntry: JournalEntry = {
    id: `${game.id}-free-${game.turn + 1}`,
    kind: 'free-action',
    text: cleanAction,
    createdAt: now,
  };

  return {
    ...game,
    journal: [journalEntry, ...game.journal].slice(0, 30),
    story: {
      id: `free-${game.turn + 1}`,
      title: '你行咗自己嗰步',
      body: `${game.character.name}決定：「${cleanAction}」。呢個 prototype 暫時只會記錄自由行動；之後可以接 AI 或完整模擬，但而家世界只係照樣流動，唔會即刻圍住你轉。`,
      choices: createBaseChoices(game.world),
    },
    turn: game.turn + 1,
    updatedAt: now,
  };
}

function buildNextStory(game: GameState, choice: Choice): StoryNode {
  return {
    id: `${choice.id}-${game.turn + 1}`,
    title: choice.nextBeat,
    body: `${game.world.backgroundEvent}。你做嘅事只係改變咗身邊一小圈：有人記得，有人唔在乎，有人根本無望過你。${game.world.regionName}仍然按自己嘅節奏運行。`,
    choices: createBaseChoices(game.world),
  };
}

function createBaseChoices(world: WorldSeed): Choice[] {
  const shared: Choice[] = [
    {
      id: `observe-${world.seed}`,
      key: 'A',
      label: '觀察四周',
      hint: '唔急住介入，先睇人、路、規矩。',
      effects: { 心神: 1 },
      nextBeat: '你留意到一個細節',
    },
    {
      id: `talk-${world.seed}`,
      key: 'B',
      label: '同附近人傾兩句',
      hint: '情報通常藏喺閒談入面。',
      effects: { 口才: 1 },
      nextBeat: '有人用半句說話試探你',
    },
    {
      id: `work-${world.seed}`,
      key: 'C',
      label: '搵份臨時活',
      hint: '無身份，就由一餐飯開始。',
      effects: { 體魄: 1 },
      nextBeat: '你接觸到呢個地方嘅日常',
    },
    {
      id: `rumor-${world.seed}`,
      key: 'D',
      label: '追查傳聞',
      hint: world.localRumor,
      effects: { 機敏: 1 },
      nextBeat: '傳聞後面未必有答案',
    },
    {
      id: `leave-${world.seed}`,
      key: 'E',
      label: '離開呢度',
      hint: '主線唔會鎖住你。你可以走。',
      effects: { 運道: 1 },
      nextBeat: '你揀咗唔留低',
    },
  ];

  return shared.map((choice, index) => ({ ...choice, id: `${choice.id}-${index}` }));
}

function getOpeningTitle(world: WorldSeed) {
  if (world.type === '武俠') return '江湖唔識你';
  if (world.type === '修仙') return '仙途無你名';
  if (world.type === '末日') return '廢墟照常呼吸';
  return '規則無解釋你';
}
