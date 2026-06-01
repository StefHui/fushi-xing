import type {
  ActionCategory,
  ActionIntensity,
  ActionRecord,
  CombatActionId,
  GameState,
  SkillRecord,
  WorldType,
} from '../types/game';

// ─── Static Definitions ───────────────────────────────────────────────────────

export interface SkillDef {
  id: string;
  name: string;
  description: string;
  relatedCategories: ActionCategory[];
  threshold: number; // points to first discovery
}

export interface ProfessionDef {
  id: string;
  name: string;
  description: string;
  weights: Partial<Record<ActionCategory, number>>;
  mainThreshold: number;  // tendency points for main profession offer
  sideThreshold: number;  // tendency points for side profession offer
  minTurns: number;       // minimum game turns before offer
}

export const SKILL_DEFS: SkillDef[] = [
  { id: 'basic_blade',    name: '基礎刀術',   description: '對刀嘅運用開始有少少心得。', relatedCategories: ['combat_blade'],                       threshold: 80  },
  { id: 'basic_unarmed',  name: '基礎拳腳',   description: '赤手空拳嘅技巧逐漸成型。',   relatedCategories: ['combat_unarmed'],                     threshold: 80  },
  { id: 'basic_ranged',   name: '基礎遠擊',   description: '遠距離攻擊開始有準頭。',     relatedCategories: ['combat_ranged'],                      threshold: 60  },
  { id: 'stealth',        name: '潛行',       description: '知道點樣減少自己嘅存在感。', relatedCategories: ['stealth'],                            threshold: 60  },
  { id: 'trading',        name: '議價',       description: '對交易節奏同人心都更敏感。', relatedCategories: ['trading'],                            threshold: 70  },
  { id: 'herb_id',        name: '草藥辨識',   description: '開始分辨到常見草藥同毒草。', relatedCategories: ['herb_gathering'],                     threshold: 60  },
  { id: 'basic_medicine', name: '基礎醫術',   description: '能夠處理簡單外傷同常見病。', relatedCategories: ['medicine', 'herb_gathering'],         threshold: 80  },
  { id: 'crafting',       name: '手工製作',   description: '雙手開始記住製作嘅節奏。',   relatedCategories: ['crafting'],                           threshold: 60  },
  { id: 'terrain_reading',name: '地形辨識',   description: '對周圍環境嘅變化更加敏感。', relatedCategories: ['exploration', 'survival'],            threshold: 70  },
  { id: 'read_people',    name: '察言觀色',   description: '留意到人與人之間嘅微妙訊號。', relatedCategories: ['social', 'trading'],                threshold: 90  },
];

export const PROFESSION_DEFS: ProfessionDef[] = [
  {
    id: 'blade_wanderer', name: '刀客',
    description: '以刀解決問題，江湖上開始有人認得你。',
    weights: { combat_blade: 3, combat_unarmed: 1 },
    mainThreshold: 35, sideThreshold: 18, minTurns: 15,
  },
  {
    id: 'brawler', name: '拳客',
    description: '赤手空拳，出手利落。',
    weights: { combat_unarmed: 3, survival: 1 },
    mainThreshold: 35, sideThreshold: 18, minTurns: 15,
  },
  {
    id: 'hunter', name: '獵人',
    description: '善於追蹤、野外求生，知道怎樣找到獵物。',
    weights: { combat_ranged: 2, survival: 3, herb_gathering: 1 },
    mainThreshold: 35, sideThreshold: 18, minTurns: 15,
  },
  {
    id: 'merchant', name: '商人',
    description: '對價錢同人心有獨特觸覺。',
    weights: { trading: 4, social: 1 },
    mainThreshold: 30, sideThreshold: 15, minTurns: 12,
  },
  {
    id: 'healer', name: '郎中',
    description: '有人受傷，你係第一個想到的人。',
    weights: { medicine: 3, herb_gathering: 2 },
    mainThreshold: 30, sideThreshold: 15, minTurns: 12,
  },
  {
    id: 'craftsman', name: '匠人',
    description: '雙手能造出有用嘅東西。',
    weights: { crafting: 4, survival: 1 },
    mainThreshold: 30, sideThreshold: 15, minTurns: 12,
  },
  {
    id: 'explorer', name: '探索者',
    description: '對未知嘅地方感興趣，唔容易迷路。',
    weights: { exploration: 4, survival: 1 },
    mainThreshold: 30, sideThreshold: 15, minTurns: 12,
  },
  {
    id: 'shadow', name: '影者',
    description: '習慣喺人注意唔到嘅地方行事。',
    weights: { stealth: 4, exploration: 1 },
    mainThreshold: 35, sideThreshold: 18, minTurns: 15,
  },
  {
    id: 'leader', name: '領袖',
    description: '其他人開始習慣跟隨你嘅判斷。',
    weights: { leadership: 4, social: 2 },
    mainThreshold: 40, sideThreshold: 22, minTurns: 20,
  },
];

// ─── Public API ───────────────────────────────────────────────────────────────

// Main entry point — call after any player action
export function recordPlayerAction(
  game: GameState,
  category: ActionCategory,
  intensity: ActionIntensity,
  success: boolean,
  location?: string,
  relatedNpcId?: string,
): GameState {
  const safe = ensureSkillSystem(game);
  const now = new Date().toISOString();

  const record: ActionRecord = {
    id: `action-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    category,
    intensity,
    success,
    gameTurn: safe.turn,
    gameDate: `第 ${safe.worldClock.day} 日 ${safe.worldClock.phase}`,
    location: location ?? safe.world.startingPlace,
    relatedNpcId,
    createdAt: now,
  };

  // Cap log at 100 entries
  const nextLog = [record, ...safe.actionLog].slice(0, 100);

  // Points earned with diminishing returns
  const points = calcPoints(safe.actionLog, category, intensity, success);

  // Update skill progress
  const { skillProgress, newlyDiscovered } = updateSkillProgress(safe.skillProgress, category, points, now);

  // Update profession tendencies
  const professionTendencies = updateProfessionTendencies(safe.professionTendencies, category, intensity);

  // Check for profession unlock offer (only if no pending offer already)
  const pendingProfessionUnlock = safe.pendingProfessionUnlock
    ?? checkProfessionUnlock(professionTendencies, safe.turn, safe.mainProfession, safe.sideProfessions);

  // Sync character.skills list with discovered skills
  const discoveredNames = Object.values(skillProgress)
    .filter((s) => s.discovered)
    .map((s) => s.name);

  const nextGame: GameState = {
    ...safe,
    actionLog: nextLog,
    skillProgress,
    professionTendencies,
    pendingProfessionUnlock,
    character: {
      ...safe.character,
      skills: discoveredNames,
    },
  };

  // Add journal entry for newly discovered skills
  if (newlyDiscovered.length === 0) return nextGame;

  const skillJournal = newlyDiscovered.map((skill) => ({
    id: `journal-skill-${skill.id}-${now}`,
    kind: 'system' as const,
    text: `你對${skill.name.replace('基礎', '')}嘅運用開始有少少心得，領悟咗【${skill.name}】。`,
    createdAt: now,
  }));

  return {
    ...nextGame,
    journal: [...skillJournal, ...nextGame.journal].slice(0, 30),
  };
}

// Player accepts the pending profession offer
export function acceptProfession(game: GameState): GameState {
  const profId = game.pendingProfessionUnlock;
  if (!profId) return game;

  const def = PROFESSION_DEFS.find((p) => p.id === profId);
  if (!def) return { ...game, pendingProfessionUnlock: null };

  const tendencyScore = game.professionTendencies[profId] ?? 0;
  const isMainEligible = tendencyScore >= def.mainThreshold && game.turn >= def.minTurns;
  const hasMain = game.mainProfession !== null;

  // Side profession if already has main OR hasn't crossed main threshold
  const asMain = isMainEligible && !hasMain;

  const now = new Date().toISOString();
  const nextGame: GameState = {
    ...game,
    mainProfession: asMain ? profId : game.mainProfession,
    sideProfessions: asMain
      ? game.sideProfessions
      : game.sideProfessions.includes(profId)
        ? game.sideProfessions
        : [...game.sideProfessions, profId],
    pendingProfessionUnlock: null,
    character: {
      ...game.character,
      profession: asMain ? def.name : game.character.profession,
    },
    journal: [
      {
        id: `journal-profession-${profId}-${now}`,
        kind: 'system' as const,
        text: asMain
          ? `江湖上開始有人稱你為【${def.name}】。你接受咗呢個稱號。`
          : `你開始以【${def.name}】嘅副業行事。`,
        createdAt: now,
      },
      ...game.journal,
    ].slice(0, 30),
  };

  return nextGame;
}

// Player declines — clears offer but tendency remains
export function declineProfession(game: GameState): GameState {
  return { ...game, pendingProfessionUnlock: null };
}

// Migration: fills missing fields on old saves
export function ensureSkillSystem(game: GameState): GameState {
  const hasSkillFields =
    Array.isArray(game.actionLog) &&
    game.skillProgress !== undefined &&
    game.professionTendencies !== undefined;

  if (hasSkillFields) return game;

  return {
    ...game,
    actionLog: game.actionLog ?? [],
    skillProgress: game.skillProgress ?? buildInitialSkillProgress(),
    professionTendencies: game.professionTendencies ?? buildInitialTendencies(),
    mainProfession: game.mainProfession ?? null,
    sideProfessions: game.sideProfessions ?? [],
    pendingProfessionUnlock: game.pendingProfessionUnlock ?? null,
  };
}

export function buildInitialSkillProgress(): Record<string, SkillRecord> {
  return Object.fromEntries(
    SKILL_DEFS.map((def) => [
      def.id,
      {
        id: def.id,
        name: def.name,
        level: 1,
        progress: 0,
        threshold: def.threshold,
        discovered: false,
        description: def.description,
        relatedCategories: def.relatedCategories,
      } satisfies SkillRecord,
    ]),
  );
}

export function buildInitialTendencies(): Record<string, number> {
  return Object.fromEntries(PROFESSION_DEFS.map((p) => [p.id, 0]));
}

// ─── Combat action → category helpers ────────────────────────────────────────

export function combatActionToCategory(
  action: CombatActionId | string,
  worldType: WorldType,
): ActionCategory {
  const isBladeSetting = worldType === '武俠' || worldType === '修仙';

  if (action === '格擋觀察' || action === '防守') return 'combat_unarmed';
  if (action === '後退') return 'survival';
  if (action === '使用道具') return 'medicine';
  if (action === '撤退' || action === '推開') return 'survival';

  // Attacks
  return isBladeSetting ? 'combat_blade' : 'combat_unarmed';
}

export function combatActionToIntensity(action: CombatActionId | string): ActionIntensity {
  if (action === '重擊') return 'high';
  if (action === '後退' || action === '格擋觀察' || action === '防守' || action === '撤退') return 'low';
  return 'medium';
}

// Parse free-action text → best matching category (or null)
export function inferFreeActionCategory(text: string): ActionCategory | null {
  const t = text;
  if (['刀', '劍', '斬', '刺', '砍'].some((w) => t.includes(w))) return 'combat_blade';
  if (['拳', '腳', '膝', '肘', '掌', '打架'].some((w) => t.includes(w))) return 'combat_unarmed';
  if (['草藥', '草', '花', '植物', '採'].some((w) => t.includes(w))) return 'herb_gathering';
  if (['醫', '包紮', '療傷', '治', '藥'].some((w) => t.includes(w))) return 'medicine';
  if (['賣', '買', '交易', '討價', '議價', '生意'].some((w) => t.includes(w))) return 'trading';
  if (['製', '造', '修', '打造', '縫', '鑄'].some((w) => t.includes(w))) return 'crafting';
  if (['探', '地圖', '路線', '周圍', '行山', '找路'].some((w) => t.includes(w))) return 'exploration';
  if (['帶頭', '決定', '召集', '指揮', '領'].some((w) => t.includes(w))) return 'leadership';
  if (['傾', '聊', '交朋友', '問候', '傾偈'].some((w) => t.includes(w))) return 'social';
  if (['躲', '隱', '潛伏', '藏', '跟蹤'].some((w) => t.includes(w))) return 'stealth';
  if (['生火', '搵食', '捕', '獵', '野外', '求生'].some((w) => t.includes(w))) return 'survival';
  return null;
}

// ─── Private helpers ──────────────────────────────────────────────────────────

function calcPoints(
  recentLog: ActionRecord[],
  category: ActionCategory,
  intensity: ActionIntensity,
  success: boolean,
): number {
  const base = intensity === 'low' ? 5 : intensity === 'medium' ? 10 : 15;
  const successBonus = success ? 3 : 0;

  // Diminishing returns: count same category in last 5 actions
  const last5 = recentLog.slice(0, 5);
  const sameCount = last5.filter((r) => r.category === category).length;
  const diminish = sameCount >= 4 ? 0.25 : sameCount >= 2 ? 0.5 : 1;

  return Math.max(1, Math.round((base + successBonus) * diminish));
}

function updateSkillProgress(
  skillProgress: Record<string, SkillRecord>,
  category: ActionCategory,
  points: number,
  now: string,
): { skillProgress: Record<string, SkillRecord>; newlyDiscovered: SkillRecord[] } {
  const newlyDiscovered: SkillRecord[] = [];
  const next = { ...skillProgress };

  for (const def of SKILL_DEFS) {
    if (!def.relatedCategories.includes(category)) continue;
    const skill = next[def.id] ?? buildSkillRecord(def);
    if (skill.discovered) continue;

    const nextProgress = skill.progress + points;
    const justDiscovered = nextProgress >= skill.threshold;

    next[def.id] = {
      ...skill,
      progress: Math.min(nextProgress, skill.threshold),
      discovered: justDiscovered,
      discoveredAt: justDiscovered ? now : skill.discoveredAt,
    };

    if (justDiscovered) newlyDiscovered.push(next[def.id]);
  }

  return { skillProgress: next, newlyDiscovered };
}

function updateProfessionTendencies(
  tendencies: Record<string, number>,
  category: ActionCategory,
  intensity: ActionIntensity,
): Record<string, number> {
  const multiplier = intensity === 'low' ? 0.5 : intensity === 'medium' ? 1 : 1.5;
  const next = { ...tendencies };

  for (const def of PROFESSION_DEFS) {
    const weight = def.weights[category];
    if (!weight) continue;
    const gain = Math.round(weight * multiplier * 10) / 10; // 1 decimal
    next[def.id] = Math.min(100, (next[def.id] ?? 0) + gain);
  }

  return next;
}

function checkProfessionUnlock(
  tendencies: Record<string, number>,
  turn: number,
  mainProfession: string | null,
  sideProfessions: string[],
): string | null {
  // Check main profession candidates first (higher thresholds)
  for (const def of PROFESSION_DEFS) {
    const score = tendencies[def.id] ?? 0;
    const alreadyHas = mainProfession === def.id || sideProfessions.includes(def.id);
    if (alreadyHas) continue;

    if (!mainProfession && score >= def.mainThreshold && turn >= def.minTurns) {
      return def.id;
    }
    if (mainProfession && score >= def.sideThreshold && turn >= def.minTurns) {
      return def.id;
    }
  }
  return null;
}

function buildSkillRecord(def: SkillDef): SkillRecord {
  return {
    id: def.id,
    name: def.name,
    level: 1,
    progress: 0,
    threshold: def.threshold,
    discovered: false,
    description: def.description,
    relatedCategories: def.relatedCategories,
  };
}
