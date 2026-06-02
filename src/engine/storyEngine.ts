import { applyStatEffects } from './statsEngine';
import type { Choice, GameState, JournalEntry, MapLocation, QuestNote, StoryNode, WorldSeed } from '../types/game';
import { buildLocationArriveStory, buildWorkMenuStory, buildInitialLocations } from './locationEngine';
import { resolveWorkAction } from './workEngine';

export function createOpeningStory(game: Pick<GameState, 'character' | 'world'>): StoryNode {
  return {
    id: 'opening',
    title: getOpeningTitle(game.world),
    body: `${game.character.name}喺${game.world.startingPlace}醒神過嚟。呢個世界無等你，亦無人知你會嚟。${game.world.regionName}今日照常有自己嘅麻煩：${game.world.ordinaryPressure}。街邊有人講緊一件同你未必有關嘅事：${game.world.localRumor}。你可以理，亦可以唔理。`,
    choices: createBaseChoices(game.world),
  };
}

export function createInitialMap(world: WorldSeed): MapLocation[] {
  const locs = buildInitialLocations(world.type, world.startingPlace);
  // Patch first location name to match startingPlace
  if (locs.length > 0) locs[0].name = world.startingPlace;
  return locs;
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

  // ── Routing by choice ID prefix ──────────────────────────────────────────
  // work-menu::<locationId>  → show work menu for location
  // work-do::<workId>::<locationId> → execute work
  // npc-talk::<npcId>       → inline NPC dialogue
  // observe::<locationId>   → observation scene
  // back-to-scene::<locationId> → return to location scene
  // free-move               → hint to open map (no state change)

  const [prefix, arg1, arg2] = choiceId.split('::');

  if (prefix === 'work-menu') {
    return {
      ...game,
      story: buildWorkMenuStory(game, arg1),
      turn: game.turn + 1,
      updatedAt: new Date().toISOString(),
    };
  }

  if (prefix === 'work-do') {
    const { game: updatedGame } = resolveWorkAction(game, arg1, arg2);
    return updatedGame;
  }

  if (prefix === 'npc-talk') {
    return resolveNpcTalk(game, arg1);
  }

  if (prefix === 'observe' || prefix === 'back-to-scene') {
    return resolveObserve(game, arg1);
  }

  if (prefix === 'free-move') {
    // Just nudge player to use the map tab — minimal state change
    const now = new Date().toISOString();
    return {
      ...game,
      story: {
        ...game.story,
        id: `free-move-${game.turn}`,
        title: '去另一個地方',
        body: '打開下方「地圖」，選擇你想去的地方。',
        choices: game.story.choices,
        phase: 'scene',
      },
      turn: game.turn + 1,
      updatedAt: now,
    };
  }

  // ── Legacy base choices (A/B/C/D/E from opening) ─────────────────────────
  const now = new Date().toISOString();

  // Choice C (搵份臨時活 / work) → route to work menu at current location
  if (choice.label.includes('臨時活') || choice.label.includes('搵工') || choice.label.includes('賺錢')) {
    const currentLocId = game.currentLocation ?? game.map[0]?.id ?? 'market';
    return {
      ...game,
      story: buildWorkMenuStory(game, currentLocId),
      turn: game.turn + 1,
      updatedAt: now,
    };
  }

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

// ─── NPC Talk (inline) ────────────────────────────────────────────────────────

function resolveNpcTalk(game: GameState, npcId: string): GameState {
  const npc = game.npcs.find((n) => n.id === npcId);
  const now = new Date().toISOString();

  if (!npc) {
    return { ...game, story: { ...game.story, body: '那個人已經不在了。', phase: 'scene' }, turn: game.turn + 1, updatedAt: now };
  }

  const dialogueLines: Record<string, string[]> = {
    陌生: [`「你係邊個？」${npc.name}打量著你。`, `「有事？」${npc.name}語氣平淡。`],
    願意傾兩句: [`「你問嘅嘢我知少少。」${npc.name}點頭。`, `「坐低傾傾無妨。」${npc.name}說。`],
    戒備: [`「唔好再靠近。」${npc.name}後退一步。`, `「你想點？」${npc.name}目光警惕。`],
    欣賞: [`「你嘅眼光係好嘅。」${npc.name}笑著說。`, `「難得遇到你咁嘅人。」${npc.name}說道。`],
    信得過: [`「你問我，我梗係知無不言。」${npc.name}誠懇地說。`, `「我信你，呢啲說話唔係人人都聽得到。」`],
  };

  const disposition = npc.relationship.disposition;
  const lines = dialogueLines[disposition] ?? dialogueLines['陌生'];
  const line = lines[Math.floor(Math.random() * lines.length)];

  const currentLocId = game.currentLocation ?? game.map[0]?.id ?? 'market';

  const choices: Choice[] = [
    {
      id: `npc-ask-work::${npcId}`,
      key: 'A',
      label: '問有冇工做',
      hint: '直接問有無搵工機會。',
      effects: { 口才: 1 },
      nextBeat: '問工',
    },
    {
      id: `npc-ask-rumor::${npcId}`,
      key: 'B',
      label: '打聽傳聞',
      hint: '問問最近發生咩事。',
      effects: { 機敏: 1 },
      nextBeat: '聽傳聞',
    },
    {
      id: `back-to-scene::${currentLocId}`,
      key: 'C',
      label: '離開',
      hint: '結束對話，繼續做其他事。',
      effects: {},
      nextBeat: '離開',
    },
  ];

  const journalEntry: JournalEntry = {
    id: `npc-${game.id}-${game.turn + 1}`,
    kind: 'npc',
    text: `同${npc.name}傾計：${line}`,
    createdAt: now,
  };

  return {
    ...game,
    journal: [journalEntry, ...game.journal].slice(0, 30),
    story: {
      id: `npc-talk-${npcId}-${Date.now()}`,
      title: `${npc.name}（${npc.role}）`,
      body: `${npc.name}喺你面前，神情${npc.mood}。\n\n${line}`,
      choices,
      phase: 'npc-talk',
      activeNpcId: npcId,
    },
    turn: game.turn + 1,
    updatedAt: now,
  };
}

// ─── Observe ──────────────────────────────────────────────────────────────────

function resolveObserve(game: GameState, locationId: string): GameState {
  const now = new Date().toISOString();
  const mapLoc = game.map.find((m) => m.id === locationId);
  const displayName = mapLoc?.name ?? locationId;

  const observeTexts = [
    `你靜靜地站在${displayName}，留意四周的人和事。有些細節只有耐心的人才能看到。`,
    `你掃視了${displayName}一遍，留意到幾個細節：人流的方向、誰在看誰、誰在迴避誰。`,
    `${displayName}表面平靜，但你察覺到一些暗流。`,
  ];

  const text = observeTexts[Math.floor(Math.random() * observeTexts.length)];
  const currentLocId = game.currentLocation ?? locationId;

  const choices: Choice[] = [
    {
      id: `work-menu::${currentLocId}`,
      key: 'A',
      label: '搵份工做',
      hint: '喺附近找工作機會。',
      effects: {},
      nextBeat: '搵工',
    },
    {
      id: `free-move`,
      key: 'B',
      label: '去另一個地方',
      hint: '打開地圖移動。',
      effects: {},
      nextBeat: '移動',
    },
  ];

  // Add NPC if present
  const localNpc = game.npcs.find((n) => n.location === locationId || n.location === displayName);
  if (localNpc) {
    choices.unshift({
      id: `npc-talk::${localNpc.id}`,
      key: 'A',
      label: `同${localNpc.name}傾計`,
      hint: `${localNpc.role}，${localNpc.mood}。`,
      effects: { 口才: 1 },
      nextBeat: '傾計',
    });
    // re-key
    const keys: Array<'A' | 'B' | 'C' | 'D' | 'E'> = ['A', 'B', 'C', 'D', 'E'];
    choices.forEach((c, i) => { c.key = keys[i]; });
  }

  return {
    ...game,
    character: {
      ...game.character,
      stats: { ...game.character.stats, 機敏: (game.character.stats.機敏 ?? 0) + 1 },
    },
    story: {
      id: `observe-${locationId}-${Date.now()}`,
      title: `觀察 — ${displayName}`,
      body: text,
      choices: choices.slice(0, 5),
      phase: 'scene',
    },
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
