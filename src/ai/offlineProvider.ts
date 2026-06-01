// Template-based offline provider — fully playable without any API key.
// Covers narration, dialogue, action validation, and rumor rewriting.

import type {
  ActionValidationResult,
  AiProvider,
  DialogueContext,
  NarrationContext,
  NarrationResult,
  RumorRewriteContext,
} from './aiProvider';

// ─── Helpers ────────────────────────────────────────────────────────────────

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
}

// ─── Narration Templates ─────────────────────────────────────────────────────

const NARRATION_BY_WORLD: Record<string, string[]> = {
  武俠: [
    '江湖風雲，一招一式皆有代價。{name}出手，周圍空氣為之一凝。',
    '刀光劍影之中，{name}沉住氣，尋找下一個機會。',
    '草木皆兵，山河失色。{name}在{location}留下了今日的印記。',
    '江湖恩怨難說清，{name}此舉，日後或有餘波。',
    '一陣風過，{name}的身影已然移動，快如閃電。',
    '這片{location}見過太多故事，{name}的不過是其中之一。',
    '習武之人皆知，出劍容易，收劍難。{name}深吸一口氣。',
  ],
  修仙: [
    '靈氣微動，{name}的意念化作漣漪，在虛空中擴散。',
    '{location}的天地元氣似乎在回應{name}的舉動。',
    '道路漫長，修行在己。{name}踏出這一步，悟到了什麼？',
    '仙凡之間，隔著無數輪迴。{name}在此刻感受到了一絲不同。',
    '功法流轉，識海微震。{name}察覺到周遭氣息的變化。',
    '天外有天，{name}所見的不過是這片{location}的冰山一角。',
    '靈根不論高低，心性才是根本。{name}此刻的選擇，自有其重量。',
  ],
  末日: [
    '廢土之上，生存才是唯一的規則。{name}快速做出判斷。',
    '末世裡活下來的，沒有一個是靠運氣。{name}深知這點。',
    '{location}的空氣中瀰漫著焦土與鐵鏽的氣味。{name}繼續前行。',
    '世界崩壞之後，人心更難捉摸。{name}保持警覺。',
    '輻射塵埃在風中飄散，{name}拉緊了外套的領口。',
    '舊世界的痕跡依然清晰，{name}不敢久留。',
    '在{location}，每個決定都可能是最後一個。{name}選擇了。',
  ],
  無限流: [
    '副本規則不明，{name}只能邊走邊猜。',
    '這個世界的邏輯和現實截然不同，{name}努力適應。',
    '每一次選擇都可能影響結局，{name}在{location}停頓片刻。',
    '系統的聲音沉默了，但{name}知道一切都被記錄著。',
    '這個副本裡的NPC比想像中複雜，{name}重新評估局勢。',
    '死亡並非終點，但{name}寧願不去驗證這個說法。',
    '{location}裡隱藏著某種規律，{name}開始注意到了。',
  ],
};

const NARRATION_HIGH_TENSION: string[] = [
  '局勢已到臨界點，任何一個細節都可能成為轉捩。',
  '空氣緊繃得像要斷裂，{name}屏住呼吸。',
  '命運的齒輪在此刻咬合，結果已難以更改。',
];

const NARRATION_LOW_TENSION: string[] = [
  '此刻難得平靜，{name}有機會喘一口氣。',
  '風平浪靜，但江湖的規矩是：平靜從不會太久。',
  '暫時的安寧，是下一場風波前的沉澱。',
];

const TIME_FLAVOR: Record<string, string> = {
  清晨: '晨光初現，',
  正午: '烈日當空，',
  黃昏: '夕陽西斜，',
  深夜: '夜深人靜，',
  子夜: '萬籟俱寂，',
};

export function generateOfflineNarration(ctx: NarrationContext): NarrationResult {
  const worldTemplates = NARRATION_BY_WORLD[ctx.worldType] ?? NARRATION_BY_WORLD['武俠'];
  const base = pick(
    ctx.tension >= 7 ? NARRATION_HIGH_TENSION : ctx.tension <= 3 ? NARRATION_LOW_TENSION : worldTemplates,
  );
  const timeFlavor = TIME_FLAVOR[ctx.timePhase] ?? '';
  const raw = interpolate(base, { name: ctx.playerName, location: ctx.location });
  const storyText = timeFlavor + raw;
  const tone: NarrationResult['tone'] =
    ctx.tension >= 7 ? 'tense' : ctx.tension <= 2 ? 'warm' : 'neutral';
  return { storyText, tone };
}

// ─── Dialogue Templates ───────────────────────────────────────────────────────

const DIALOGUE_BY_DISPOSITION: Record<string, string[]> = {
  陌生: [
    '「你係邊個？有咩事？」{npc}打量著你，神情謹慎。',
    '「呢度唔係隨便人可以來嘅。」{npc}說，語氣平淡。',
    '「有話快說，我唔係好有空。」{npc}隨口應道。',
    '「我唔認識你。」{npc}簡短地說，沒有多餘的表情。',
  ],
  願意傾兩句: [
    '「唔錯，你問嘅嘢我知少少。」{npc}微微點頭。',
    '「坐低傾傾無妨，不過我唔包你滿意。」{npc}說。',
    '「你問得好，不過答案唔係咁簡單。」{npc}沉吟片刻。',
    '「好，我聽住你講。」{npc}放鬆了姿態。',
  ],
  戒備: [
    '「你想點？」{npc}後退半步，眼神警惕。',
    '「我唔知你打咩主意，不過最好收手。」{npc}冷冷地說。',
    '「唔好再靠近，聽明白未？」{npc}語氣強硬。',
    '「你係邊派嚟的？」{npc}目光如刀，盯著你。',
  ],
  欣賞: [
    '「你嘅眼光係好嘅，呢個問題問得好。」{npc}笑著說。',
    '「難得遇到你咁嘅人，我願意多說幾句。」{npc}說道。',
    '「以你嘅能耐，做嘅決定唔會錯太多。」{npc}評價道。',
    '「我欣賞你嘅做法，繼續保持。」{npc}點頭讚許。',
  ],
  信得過: [
    '「你問我，我梗係知無不言。」{npc}語氣誠懇。',
    '「跟你說吧，這件事很重要——」{npc}壓低了聲音。',
    '「我信你，呢啲說話唔係人人都聽得到。」{npc}說。',
    '「有你在，我安心多了。」{npc}真誠地看著你。',
  ],
};

const DIALOGUE_HIGH_TRUST_EXTRA: string[] = [
  '「你係第一個我願意講呢番話嘅人。」',
  '「保重，有需要搵我。」',
];

const DIALOGUE_LOW_TRUST_EXTRA: string[] = [
  '……之後便沉默了。',
  '話音一落，{npc}轉過身去，不再理會。',
];

export function generateOfflineDialogue(ctx: DialogueContext): string {
  const pool = DIALOGUE_BY_DISPOSITION[ctx.disposition] ?? DIALOGUE_BY_DISPOSITION['陌生'];
  let line = interpolate(pick(pool), { npc: ctx.npcName });

  if (ctx.trustLevel >= 8) {
    line += ' ' + pick(DIALOGUE_HIGH_TRUST_EXTRA);
  } else if (ctx.trustLevel <= 2) {
    line += ' ' + interpolate(pick(DIALOGUE_LOW_TRUST_EXTRA), { npc: ctx.npcName });
  }

  return line;
}

// ─── Action Validation ────────────────────────────────────────────────────────

const ACTION_KEYWORDS: Array<{
  patterns: RegExp[];
  engineAction: string;
  minStat?: { key: '體魄' | '機敏'; value: number };
}> = [
  { patterns: [/快攻|衝|刺|突|閃/, /quick|dash|lunge/i], engineAction: '快攻' },
  { patterns: [/重擊|砸|劈|狠|全力/], engineAction: '重擊', minStat: { key: '體魄', value: 4 } },
  { patterns: [/防|格|擋|護|盾/], engineAction: '防守' },
  { patterns: [/推|踢開|逼開|距離/], engineAction: '推開' },
  { patterns: [/逃|跑|撤|退|離開/], engineAction: '推開' },
];

const IMPOSSIBLE_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /飛天|御劍飛行|瞬間移動/, reason: '喺呢個情況下冇辦法做到呢個動作。' },
  { pattern: /召喚|傳送/, reason: '環境唔允許呢種行動。' },
];

export function validateOfflineAction(
  action: string,
  _combatContext: string,
  _worldType: string,
  stats: { 體魄: number; 機敏: number },
): ActionValidationResult {
  for (const { pattern, reason } of IMPOSSIBLE_PATTERNS) {
    if (pattern.test(action)) {
      return { valid: false, reason, suggestedEngineAction: undefined };
    }
  }

  for (const { patterns, engineAction, minStat } of ACTION_KEYWORDS) {
    if (patterns.some((p) => p.test(action))) {
      if (minStat && stats[minStat.key] < minStat.value) {
        return {
          valid: false,
          reason: `${minStat.key}唔夠高，難以做到呢個動作。`,
          suggestedEngineAction: undefined,
        };
      }
      return { valid: true, reason: '', suggestedEngineAction: engineAction };
    }
  }

  // Default: allow but map to quick attack
  return { valid: true, reason: '', suggestedEngineAction: '快攻' };
}

// ─── Rumor Rewrite ────────────────────────────────────────────────────────────

const RUMOR_PREFIXES_BY_SOURCE: Record<string, string[]> = {
  NPC: ['聽講…', '有人話…', '街坊都係咁講…', '我聽到風聲講…'],
  商人: ['做生意嘅朋友話…', '市場上有個消息…', '最近坊間流傳…'],
  官府: ['官府放出消息話…', '有個消息從上面傳落嚟…'],
  江湖: ['江湖上有個傳言…', '習武嘅人都知…', '門派裡面流傳…'],
};

export function rewriteOfflineRumor(ctx: RumorRewriteContext): string {
  const prefixes = RUMOR_PREFIXES_BY_SOURCE[ctx.source] ?? RUMOR_PREFIXES_BY_SOURCE['NPC'];
  const prefix = pick(prefixes);
  const suffix = ctx.truthState === '謊言' ? '不過真真假假，難講。' : '';
  return `${prefix}「${ctx.originalText}」${suffix ? ' ' + suffix : ''}`.trim();
}

// ─── Provider ────────────────────────────────────────────────────────────────

export const offlineProvider: AiProvider = {
  async generateNarration(ctx: NarrationContext): Promise<NarrationResult> {
    return generateOfflineNarration(ctx);
  },

  async generateDialogue(ctx: DialogueContext): Promise<string> {
    return generateOfflineDialogue(ctx);
  },

  async interpretCustomAction(
    action: string,
    combatContext: string,
    worldType: string,
    stats: { 體魄: number; 機敏: number },
  ): Promise<ActionValidationResult> {
    return validateOfflineAction(action, combatContext, worldType, stats);
  },

  async rewriteRumor(ctx: RumorRewriteContext): Promise<string> {
    return rewriteOfflineRumor(ctx);
  },
};
