import type { GameState, NpcInteractionId, NpcMemory, NpcProfile, NpcRelationship, WorldSeed } from '../types/game';

interface NpcEvent {
  source: NpcMemory['source'];
  summary: string;
  impact: string;
  trust?: number;
  caution?: number;
  respect?: number;
  familiarity?: number;
  targetHint?: 'social' | 'work' | 'rumor' | 'combat' | 'all';
}

export function createInitialNPCs(world: WorldSeed): NpcProfile[] {
  const templates = getNpcTemplates(world);
  return templates.map((template, index) => ({
    id: `npc-${world.seed}-${index}`,
    ...template,
    relationship: getInitialRelationship(),
    memories: [
      {
        id: `npc-memory-${world.seed}-${index}-start`,
        npcId: `npc-${world.seed}-${index}`,
        memoryText: '只知道你係新嚟嘅陌生人。',
        importance: 1,
        date: '第 1 日 清晨',
        emotionalEffect: '未有情緒起伏',
        summary: '只知道你係新嚟嘅陌生人。',
        source: '系統',
        impact: '未有實際印象。',
        createdAt: new Date().toISOString(),
      },
    ],
  }));
}

export function ensureNPCs(game: GameState): GameState {
  if (game.npcs?.length) {
    return {
      ...game,
      npcs: game.npcs.map((npc) => ({
        ...npc,
        memories: npc.memories.map((memory) => ({
          ...memory,
          npcId: memory.npcId ?? npc.id,
          memoryText: memory.memoryText ?? memory.summary,
          importance: memory.importance ?? 1,
          date: memory.date ?? getMemoryDate(game),
          emotionalEffect: memory.emotionalEffect ?? '印象保留',
        })),
      })),
    };
  }
  return { ...game, npcs: createInitialNPCs(game.world) };
}

export function recordStoryChoiceForNPCs(game: GameState, choiceLabel: string): GameState {
  if (choiceLabel.includes('傾')) {
    return recordNpcEvent(game, {
      source: '故事',
      summary: `你主動同附近人傾過：「${choiceLabel}」。`,
      impact: '覺得你唔係完全封閉嘅人。',
      trust: 1,
      familiarity: 2,
      targetHint: 'social',
    });
  }
  if (choiceLabel.includes('活')) {
    return recordNpcEvent(game, {
      source: '故事',
      summary: `你試過搵臨時活做：「${choiceLabel}」。`,
      impact: '覺得你肯用普通方法落腳。',
      trust: 1,
      respect: 1,
      familiarity: 1,
      targetHint: 'work',
    });
  }
  if (choiceLabel.includes('傳聞')) {
    return recordNpcEvent(game, {
      source: '故事',
      summary: `你追過本地傳聞：「${choiceLabel}」。`,
      impact: '覺得你好奇，但未必穩陣。',
      caution: 1,
      familiarity: 1,
      targetHint: 'rumor',
    });
  }
  if (choiceLabel.includes('離開')) {
    return recordNpcEvent(game, {
      source: '故事',
      summary: '你選擇離開，無硬接眼前嘅事。',
      impact: '覺得你唔會被傳聞牽住走。',
      respect: 1,
      targetHint: 'all',
    });
  }
  return recordNpcEvent(game, {
    source: '故事',
    summary: `有人留意到你做過：「${choiceLabel}」。`,
    impact: '對你有少少印象。',
    familiarity: 1,
    targetHint: 'all',
  });
}

export function recordFreeActionForNPCs(game: GameState, action: string): GameState {
  const cleanAction = action.trim();
  if (!cleanAction) return game;

  const helpful = ['幫', '扶', '救', '分', '借'].some((word) => cleanAction.includes(word));
  const threatening = ['威脅', '打', '搶', '逼', '恐嚇'].some((word) => cleanAction.includes(word));

  if (helpful) {
    return recordNpcEvent(game, {
      source: '自由行動',
      summary: `你做過一件有人情味嘅事：「${cleanAction}」。`,
      impact: '有人開始覺得你可以信少少。',
      trust: 2,
      familiarity: 1,
      targetHint: 'social',
    });
  }

  if (threatening) {
    return recordNpcEvent(game, {
      source: '自由行動',
      summary: `有人聽到你用過比較硬嘅手段：「${cleanAction}」。`,
      impact: '有人對你多咗戒心。',
      caution: 2,
      respect: 1,
      targetHint: 'all',
    });
  }

  return recordNpcEvent(game, {
    source: '自由行動',
    summary: `你試過自己行動：「${cleanAction}」。`,
    impact: '世界有人記低咗一個模糊印象。',
    familiarity: 1,
    targetHint: 'all',
  });
}

export function recordCombatForNPCs(game: GameState, combatText: string): GameState {
  return recordNpcEvent(game, {
    source: '戰鬥',
    summary: combatText,
    impact: '目擊者會重新估量你危唔危險。',
    caution: 1,
    respect: 1,
    familiarity: 1,
    targetHint: 'combat',
  });
}

export function interactWithNpc(game: GameState, npcId: string, interaction: NpcInteractionId): GameState {
  const safeGame = ensureNPCs(game);
  const npc = safeGame.npcs.find((item) => item.id === npcId);
  if (!npc) return safeGame;

  const event = getInteractionEvent(npc.name, interaction);
  return recordNpcEvent(safeGame, { ...event, targetHint: 'all' }, npcId);
}

function recordNpcEvent(game: GameState, event: NpcEvent, exactNpcId?: string): GameState {
  const safeGame = ensureNPCs(game);
  const now = new Date().toISOString();
  const targetIds = exactNpcId ? [exactNpcId] : pickTargets(safeGame.npcs, event.targetHint ?? 'all');

  return {
    ...safeGame,
    npcs: safeGame.npcs.map((npc) => {
      const isTarget = targetIds.includes(npc.id);
      if (!isTarget) return npc;
      const memory: NpcMemory = {
        id: `memory-${npc.id}-${now}-${Math.random().toString(36).slice(2, 7)}`,
        npcId: npc.id,
        memoryText: event.summary,
        importance: getImportance(event),
        date: getMemoryDate(safeGame),
        emotionalEffect: getEmotionalEffect(event),
        summary: event.summary,
        source: event.source,
        impact: event.impact,
        createdAt: now,
      };
      return {
        ...npc,
        relationship: applyRelationshipDelta(npc.relationship, event),
        memories: [memory, ...npc.memories].slice(0, 8),
      };
    }),
    journal: [
      {
        id: `${safeGame.id}-npc-${now}`,
        kind: 'npc' as const,
        text: event.summary,
        createdAt: now,
      },
      ...safeGame.journal,
    ].slice(0, 30),
    updatedAt: now,
  };
}

function pickTargets(npcs: NpcProfile[], hint: NonNullable<NpcEvent['targetHint']>) {
  if (hint === 'all') return npcs.map((npc) => npc.id);
  if (hint === 'social') return [npcs[0]?.id].filter(Boolean);
  if (hint === 'work') return [npcs[1]?.id].filter(Boolean);
  if (hint === 'rumor') return [npcs[2]?.id].filter(Boolean);
  return npcs.slice(0, 2).map((npc) => npc.id);
}

function getInteractionEvent(npcName: string, interaction: NpcInteractionId): NpcEvent {
  if (interaction === '打招呼') {
    return {
      source: '互動',
      summary: `你同${npcName}打咗個招呼。`,
      impact: '普通但自然嘅開始。',
      trust: 1,
      familiarity: 1,
    };
  }
  if (interaction === '幫小忙') {
    return {
      source: '互動',
      summary: `你幫${npcName}處理咗一件小事。`,
      impact: '對方記得你肯花時間。',
      trust: 2,
      respect: 1,
      familiarity: 1,
    };
  }
  if (interaction === '打探消息') {
    return {
      source: '互動',
      summary: `你向${npcName}打探消息。`,
      impact: '對方知道你對本地事有興趣。',
      caution: 1,
      familiarity: 1,
    };
  }
  return {
    source: '互動',
    summary: `你刻意同${npcName}保持距離。`,
    impact: '對方覺得你唔急住埋堆。',
    caution: -1,
  };
}

function getImportance(event: NpcEvent): 1 | 2 | 3 {
  const totalImpact =
    Math.abs(event.trust ?? 0) +
    Math.abs(event.caution ?? 0) +
    Math.abs(event.respect ?? 0) +
    Math.abs(event.familiarity ?? 0);
  if (event.source === '戰鬥' || totalImpact >= 3) return 3;
  if (totalImpact >= 2) return 2;
  return 1;
}

function getMemoryDate(game: GameState) {
  return game.worldClock ? `第 ${game.worldClock.day} 日 ${game.worldClock.phase}` : '日期不明';
}

function getEmotionalEffect(event: NpcEvent) {
  if ((event.trust ?? 0) > 0) return '信任增加';
  if ((event.caution ?? 0) > 0) return '戒心增加';
  if ((event.respect ?? 0) > 0) return '敬重增加';
  if ((event.caution ?? 0) < 0) return '戒心下降';
  return '印象加深';
}

function applyRelationshipDelta(relationship: NpcRelationship, event: NpcEvent): NpcRelationship {
  const next = {
    trust: clamp(relationship.trust + (event.trust ?? 0)),
    caution: clamp(relationship.caution + (event.caution ?? 0)),
    respect: clamp(relationship.respect + (event.respect ?? 0)),
    familiarity: clamp(relationship.familiarity + (event.familiarity ?? 0)),
    disposition: relationship.disposition,
  };

  return {
    ...next,
    disposition: getDisposition(next),
  };
}

function getDisposition(relationship: Omit<NpcRelationship, 'disposition'>): NpcRelationship['disposition'] {
  if (relationship.trust >= 6 && relationship.familiarity >= 5) return '信得過';
  if (relationship.caution >= relationship.trust + 3) return '戒備';
  if (relationship.respect >= 5) return '欣賞';
  if (relationship.trust >= 3 || relationship.familiarity >= 3) return '願意傾兩句';
  return '陌生';
}

function getInitialRelationship(): NpcRelationship {
  return {
    trust: 0,
    caution: 1,
    respect: 0,
    familiarity: 0,
    disposition: '陌生',
  };
}

function getNpcTemplates(world: WorldSeed): Array<Omit<NpcProfile, 'id' | 'relationship' | 'memories'>> {
  if (world.type === '武俠') {
    return [
      { name: '茶寮阿七', role: '跑堂', location: world.startingPlace, mood: '口快但識睇人眉頭眼額' },
      { name: '老鏢師梁伯', role: '半退休鏢師', location: world.regionName, mood: '唔多信新面孔' },
      { name: '井邊小販素娘', role: '小販', location: '傳聞地點附近', mood: '收風快過收錢' },
    ];
  }
  if (world.type === '修仙') {
    return [
      { name: '攤主青禾', role: '坊市攤主', location: world.startingPlace, mood: '笑面迎人但算盤好清' },
      { name: '雜役周平', role: '山門雜役', location: world.regionName, mood: '怕事但熟規矩' },
      { name: '散修孟秋', role: '散修', location: '傳聞地點附近', mood: '對機緣半信半疑' },
    ];
  }
  if (world.type === '末日') {
    return [
      { name: '水站阿敏', role: '配給員', location: world.startingPlace, mood: '疲倦但仍然守規矩' },
      { name: '修理工老曹', role: '修理工', location: world.regionName, mood: '只信有用嘅人' },
      { name: '拾荒少年樂仔', role: '拾荒者', location: '傳聞地點附近', mood: '跑得快，信人慢' },
    ];
  }
  return [
    { name: '候車室女人', role: '資深參與者', location: world.startingPlace, mood: '講嘢永遠留一半' },
    { name: '眼鏡青年', role: '規則記錄者', location: world.regionName, mood: '緊張但觀察力強' },
    { name: '無名清潔工', role: '場景人員', location: '傳聞地點附近', mood: '似乎知道多過應該知道嘅事' },
  ];
}

function clamp(value: number) {
  return Math.max(0, Math.min(10, value));
}
