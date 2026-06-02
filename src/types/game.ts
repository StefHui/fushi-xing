export type WorldType = '武俠' | '修仙' | '末日' | '無限流';

export type Gender = '男' | '女' | '其他';

export type ScreenId =
  | 'opening'
  | 'create'
  | 'personality'
  | 'story'
  | 'character'
  | 'inventory'
  | 'market'
  | 'map'
  | 'quest'
  | 'npcs'
  | 'combat'
  | 'log'
  | 'saves'
  | 'settings';

export type TraitKey = '膽識' | '人情' | '觀察' | '執念' | '變通' | '口才';

export type StatKey = '體魄' | '心神' | '機敏' | '口才' | '運道';

export type TraitScores = Record<TraitKey, number>;

export type CharacterStats = Record<StatKey, number>;

export type PersonalityAnswers = Record<string, string>;

export interface CharacterDraft {
  name: string;
  gender: Gender | null;
  age: string;
}

export interface Character {
  id: string;
  name: string;
  gender: Gender;
  age: number;
  identity: string;
  title: string;
  profession: string;
  faction: string;
  skills: string[];
  reputation: string;
  traits: TraitScores;
  stats: CharacterStats;
  createdAt: string;
}

export interface WorldSeed {
  seed: string;
  type: WorldType;
  regionName: string;
  ordinaryPressure: string;
  backgroundEvent: string;
  localRumor: string;
  startingPlace: string;
}

export interface WorldClock {
  day: number;
  phase: '清晨' | '日間' | '黃昏' | '深夜';
  tension: number;
  lastTickReason: string;
}

export interface WorldEvent {
  id: string;
  title: string;
  location: string;
  status: '醞釀中' | '升溫' | '擴散' | '自行平息' | '已結束';
  pressure: number;
  visibility: '街談巷議' | '少數人知道' | '公開';
  description: string;
  lastChange: string;
}

export interface WorldHistoryEntry {
  id: string;
  date: string;
  location: string;
  eventType: string;
  shortSummary: string;
  impactSummary: string;
  discovered: boolean;
}

export interface Rumor {
  id: string;
  date: string;
  source: '茶寮' | '市集' | '商人' | 'NPC' | '派系成員';
  location: string;
  truthState: '真' | '假' | '半真' | '過時';
  text: string;
  relatedEventId?: string;
}

export interface Choice {
  id: string;
  key: 'A' | 'B' | 'C' | 'D' | 'E';
  label: string;
  hint: string;
  effects: Partial<CharacterStats>;
  nextBeat: string;
}

export type StoryPhase =
  | 'scene'          // normal scene
  | 'work-menu'      // picking a job
  | 'work-result'    // result of a job
  | 'npc-talk'       // talking to an NPC inline
  | 'location-arrive'; // just arrived at a new location

export interface StoryNode {
  id: string;
  title: string;
  body: string;
  choices: Choice[];
  phase?: StoryPhase;
  activeNpcId?: string; // NPC in focus for npc-talk phase
}

export interface InventoryItem {
  id: string;
  name: string;
  note: string;
  quantity: number;
}

export interface MapLocation {
  id: string;
  name: string;
  note: string;
  status: '已知' | '未到過' | '傳聞';
}

export interface QuestNote {
  id: string;
  title: string;
  note: string;
  status: '可忽略' | '聽聞' | '進行中';
}

export type NpcInteractionId = '打招呼' | '幫小忙' | '打探消息' | '保持距離';

export interface NpcRelationship {
  trust: number;
  caution: number;
  respect: number;
  familiarity: number;
  disposition: '陌生' | '願意傾兩句' | '戒備' | '欣賞' | '信得過';
}

export interface NpcMemory {
  id: string;
  npcId: string;
  memoryText: string;
  importance: 1 | 2 | 3;
  date: string;
  emotionalEffect: string;
  summary: string;
  source: '故事' | '自由行動' | '戰鬥' | '互動' | '系統';
  impact: string;
  createdAt: string;
}

export interface NpcProfile {
  id: string;
  name: string;
  role: string;
  location: string;
  mood: string;
  relationship: NpcRelationship;
  memories: NpcMemory[];
}

// ─── Story Hook Types ─────────────────────────────────────────────────────────

export type HookCategory = '本地' | '經濟' | '派系' | '神秘' | '世界';

// Ordered progression: index matters for advancement
export type HookStage = '醞釀中' | '顯現' | '升溫' | '轉折' | '消散' | '已結束';

export type HookUrgency = '低' | '中' | '高' | '緊急';

export type HookOutcome = '進行中' | '結束' | '消散' | '轉化';

export type HookDiscoveryMethod = '觀察' | '傳聞' | 'NPC對話' | '探索';

export interface StoryHook {
  id: string;
  title: string;
  category: HookCategory;
  stage: HookStage;
  urgency: HookUrgency;
  location: string;

  // Discovery state
  discovered: boolean;
  discoveryMethod?: HookDiscoveryMethod;
  discoveredAt?: string;

  // People & factions
  involvedNpcIds: string[];
  involvedFactions: string[];

  // Temporal
  startDate: string;
  lastAdvancedTurn: number;
  advanceEveryNTurns: number;

  // Narrative — surfaceText is always visible once discovered; undercurrentText reveals what's really happening
  surfaceText: string;
  undercurrentText: string;

  // Resolution
  outcome: HookOutcome;
  outcomeText?: string;

  // Internal: index into per-stage text arrays for stage transitions
  templateKey: string;
  stageIndex: number;
}

// ─── Economy Types ────────────────────────────────────────────────────────────

export type ResourceCategory = '糧食' | '藥材' | '礦石' | '木材' | '布料' | '武器' | '丹藥' | '雜貨';

// All money is stored as a single copper integer; display converts
export interface Currency {
  copper: number;
}

export interface MarketItem {
  id: string;
  name: string;
  category: ResourceCategory;
  description: string;
  basePrice: number;    // copper
  currentPrice: number; // copper, fluctuates
  stock: number;
  maxStock: number;
  demandLevel: '低' | '正常' | '高' | '緊缺';
  supplyLevel: '充裕' | '正常' | '缺乏' | '斷貨';
}

export interface TradeRecord {
  id: string;
  type: '買入' | '賣出';
  itemName: string;
  category: ResourceCategory;
  quantity: number;
  pricePerUnit: number; // copper
  totalCopper: number;
  gameTurn: number;
  createdAt: string;
}

export interface Market {
  id: string;
  locationName: string;
  items: MarketItem[];
  tradeRumors: string[];
  lastRestockTurn: number;
}

// ─── Skill & Profession Types ─────────────────────────────────────────────────

export type ActionCategory =
  | 'combat_blade' | 'combat_unarmed' | 'combat_ranged'
  | 'stealth' | 'trading' | 'medicine' | 'herb_gathering'
  | 'crafting' | 'social' | 'exploration' | 'survival' | 'leadership';

export type ActionIntensity = 'low' | 'medium' | 'high';

export interface ActionRecord {
  id: string;
  category: ActionCategory;
  intensity: ActionIntensity;
  success: boolean;
  gameTurn: number;
  gameDate: string;
  location: string;
  relatedNpcId?: string;
  createdAt: string;
}

export interface SkillRecord {
  id: string;
  name: string;
  level: number;       // 1-3
  progress: number;    // points toward next threshold
  threshold: number;   // points to discover / level up
  discovered: boolean;
  discoveredAt?: string;
  description: string;
  relatedCategories: ActionCategory[];
}

// ─── Combat Types ─────────────────────────────────────────────────────────────

export type BodyPart =
  // v2 detailed parts
  | '頭部' | '眼睛' | '咽喉' | '胸部' | '腹部'
  | '左臂' | '右臂' | '左腿' | '右腿'
  // v1 legacy (kept for save compatibility)
  | '軀幹' | '左手' | '右手' | '左腳' | '右腳';

// Six-level injury status per body part
export type BodyPartStatus = '完好' | '瘀傷' | '流血' | '受傷' | '骨折' | '失能';

export type CombatStatus = '進行中' | '勝利' | '失敗' | '撤退';

export type CombatDistance = '貼身' | '近距離' | '中距離' | '遠距離';

export type LightCondition = '白晝' | '黃昏' | '夜晚' | '黑暗';

export type CombatActionId =
  // v2 primary actions
  | '攻擊右臂' | '攻擊左腿' | '格擋觀察' | '後退' | '使用道具' | '撤退'
  // v1 legacy actions (still supported)
  | '快攻' | '重擊' | '防守' | '推開';

// Rich enemy model replacing the simple Combatant
export interface Enemy {
  id: string;
  name: string;
  type: string;
  level: number;
  hp: number;
  maxHp: number;
  stamina: number;
  maxStamina: number;
  attack: number;
  defense: number;
  speed: number;
  morale: number;
  intent: string;
  bodyParts: Partial<Record<BodyPart, BodyPartStatus>>;
}

// Legacy — kept so old save payloads still parse
export interface Combatant {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  guard: number;
  intent: string;
}

export interface Injury {
  id: string;
  target: '玩家' | '敵人';
  bodyPart: BodyPart;
  severity: '輕傷' | '中傷' | '重傷';
  note: string;
  createdAt: string;
}

export interface CombatLogEntry {
  id: string;
  text: string;
  tone: 'info' | 'success' | 'danger' | 'rejected';
  createdAt: string;
}

export interface CombatState {
  id: string;
  // active kept for legacy migration; new code uses status
  active: boolean;
  status: CombatStatus;
  round: number;

  playerHp: number;
  playerMaxHp: number;
  playerStamina: number;
  playerMaxStamina: number;
  playerGuard: number;
  playerBodyParts: Partial<Record<BodyPart, BodyPartStatus>>;

  enemy: Enemy;
  selectedBodyPart: BodyPart;

  distance: CombatDistance;
  terrain: string;
  lightCondition: LightCondition;
  weather: string;

  injuries: Injury[];
  log: CombatLogEntry[];
}

// ─────────────────────────────────────────────────────────────────────────────

export interface JournalEntry {
  id: string;
  kind: 'choice' | 'free-action' | 'system' | 'combat' | 'npc' | 'world';
  text: string;
  createdAt: string;
}

export interface GameState {
  id: string;
  character: Character;
  world: WorldSeed;
  worldClock: WorldClock;
  worldEvents: WorldEvent[];
  worldHistory: WorldHistoryEntry[];
  rumors: Rumor[];
  story: StoryNode;
  inventory: InventoryItem[];
  map: MapLocation[];
  quests: QuestNote[];
  npcs: NpcProfile[];
  combat: CombatState;
  journal: JournalEntry[];
  turn: number;
  updatedAt: string;

  // Story hooks
  storyHooks: StoryHook[];

  // Current location
  currentLocation: string;

  // Economy
  wallet: Currency;
  market: Market;
  tradeHistory: TradeRecord[];

  // Skill & profession system
  actionLog: ActionRecord[];
  skillProgress: Record<string, SkillRecord>;
  professionTendencies: Record<string, number>; // professionId → 0-100
  mainProfession: string | null;
  sideProfessions: string[];
  pendingProfessionUnlock: string | null; // professionId awaiting player response
}

export interface SaveSummary {
  id: string;
  characterName: string;
  regionName: string;
  updatedAt: string;
}
