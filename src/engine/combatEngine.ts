import type {
  BodyPart,
  BodyPartStatus,
  CombatActionId,
  CombatDistance,
  CombatLogEntry,
  CombatState,
  CombatStatus,
  Enemy,
  GameState,
  Injury,
  LightCondition,
  WorldSeed,
} from '../types/game';

// ─── Constants ────────────────────────────────────────────────────────────────

const V2_BODY_PARTS: BodyPart[] = [
  '頭部', '眼睛', '咽喉', '胸部', '腹部', '左臂', '右臂', '左腿', '右腿',
];

const VALID_ACTION_HINTS = [
  '打', '擊', '踢', '推', '擋', '避', '閃', '抓', '扯', '撞',
  '退', '刺', '斬', '掃', '拳', '掌', '肘', '膝', '掃腿', '架',
];

const INVALID_POWER_WORDS = [
  '秒殺', '必殺', '無敵', '時間停止', '召喚', '核彈',
  '一招殺', '直接殺死', '飛天', '復活', '跳二十米', '超能力',
];

const ITEM_HEAL_KEYWORDS = ['藥', '丹', '繃帶', '包紮', '草', '膏', '酒', '水', '食'];

const DISTANCE_ORDER: CombatDistance[] = ['貼身', '近距離', '中距離', '遠距離'];

// ─── Public API ───────────────────────────────────────────────────────────────

export function createInitialCombat(world: WorldSeed): CombatState {
  const enemy = createEnemy(world);
  const now = new Date().toISOString();
  const light = getInitialLight(world);
  const terrain = getInitialTerrain(world);

  return {
    id: `combat-${world.seed}`,
    active: true,
    status: '進行中',
    round: 1,
    playerHp: 24,
    playerMaxHp: 24,
    playerStamina: 12,
    playerMaxStamina: 12,
    playerGuard: 0,
    playerBodyParts: makeHealthyParts(),
    enemy,
    selectedBodyPart: '胸部',
    distance: '近距離',
    terrain,
    lightCondition: light,
    weather: getInitialWeather(world),
    injuries: [],
    log: [
      makeLog(
        `${enemy.name}擋住去路。${terrain}，${lightCondition2text(light)}。` +
        `呢場交手唔係命運，只係一件可以避開嘅麻煩。`,
        'info',
        now,
      ),
    ],
  };
}

// Migrate old saves to new CombatState shape — called on load
export function ensureCombat(game: GameState): GameState {
  if (!game.combat) {
    return { ...game, combat: createInitialCombat(game.world) };
  }

  const c = game.combat;

  // Upgrade legacy Enemy / Combatant shape
  const enemy: Enemy = {
    id: c.enemy.id ?? `enemy-${game.id}`,
    name: c.enemy.name,
    type: (c.enemy as Partial<Enemy>).type ?? '人類',
    level: (c.enemy as Partial<Enemy>).level ?? 1,
    hp: c.enemy.hp,
    maxHp: c.enemy.maxHp,
    stamina: (c.enemy as Partial<Enemy>).stamina ?? 8,
    maxStamina: (c.enemy as Partial<Enemy>).maxStamina ?? 8,
    attack: (c.enemy as Partial<Enemy>).attack ?? 4,
    defense: (c.enemy as Partial<Enemy>).defense ?? 2,
    speed: (c.enemy as Partial<Enemy>).speed ?? 4,
    morale: (c.enemy as Partial<Enemy>).morale ?? 5,
    intent: c.enemy.intent,
    bodyParts: (c.enemy as Partial<Enemy>).bodyParts ?? makeHealthyParts(),
  };

  const playerMaxStamina = 8 + game.character.stats.體魄;

  return {
    ...game,
    combat: {
      ...c,
      status: c.status ?? (c.active ? '進行中' : '撤退'),
      playerStamina: c.playerStamina ?? playerMaxStamina,
      playerMaxStamina: c.playerMaxStamina ?? playerMaxStamina,
      playerBodyParts: c.playerBodyParts ?? makeHealthyParts(),
      enemy,
      selectedBodyPart: c.selectedBodyPart ?? '胸部',
      distance: c.distance ?? '近距離',
      terrain: c.terrain ?? '街道',
      lightCondition: c.lightCondition ?? '日間',
      weather: c.weather ?? '晴',
    },
  };
}

export function setCombatTarget(game: GameState, bodyPart: BodyPart): GameState {
  const safe = ensureCombat(game);
  return { ...safe, combat: { ...safe.combat, selectedBodyPart: bodyPart } };
}

export function resolveDefaultCombatAction(game: GameState, action: CombatActionId): GameState {
  const safe = ensureCombat(game);
  const combat = safe.combat;

  if (combat.status !== '進行中') {
    return appendCombatLog(safe, '戰鬥已經完結。你可以返去故事繼續行。', 'rejected');
  }

  // ── Retreat ──
  if (action === '撤退') return resolveRetreat(safe);

  // ── Withdraw distance ──
  if (action === '後退') return resolveWithdraw(safe);

  // ── Guard + observe ──
  if (action === '格擋觀察') return resolveGuardObserve(safe);

  // ── Use item ──
  if (action === '使用道具') return resolveItemUse(safe);

  // ── Mapped attack shortcuts ──
  const target: BodyPart =
    action === '攻擊右臂' ? '右臂' :
    action === '攻擊左腿' ? '左腿' :
    combat.selectedBodyPart;

  const profile = getActionProfile(action);

  return resolveCombat(safe, {
    id: action,
    label: action,
    target,
    staminaCost: profile.staminaCost,
    damageBonus: profile.damageBonus,
    isCustom: false,
  });
}

export function resolveCustomCombatAction(game: GameState, text: string): GameState {
  const safe = ensureCombat(game);
  const cleanText = text.trim();
  const rejection = validateCustomAction(cleanText, safe.combat.status);

  if (rejection) return appendCombatLog(safe, rejection, 'rejected');

  return resolveCombat(safe, {
    id: '快攻',
    label: cleanText,
    target: safe.combat.selectedBodyPart,
    staminaCost: 3,
    damageBonus: 1, // slight bonus for creative actions
    isCustom: true,
  });
}

// Called when player taps 使用道具
export function resolveItemUse(game: GameState): GameState {
  const safe = ensureCombat(game);
  const combat = safe.combat;
  const now = new Date().toISOString();

  if (combat.status !== '進行中') {
    return appendCombatLog(safe, '戰鬥已結束，唔需要用道具。', 'rejected');
  }

  const itemIndex = safe.inventory.findIndex((item) =>
    ITEM_HEAL_KEYWORDS.some((kw) => item.name.includes(kw)) && item.quantity > 0,
  );

  if (itemIndex === -1) {
    return appendCombatLog(safe, '背包裡無可用嘅療傷物品。', 'rejected');
  }

  const item = safe.inventory[itemIndex];
  const healAmount = 6;
  const nextHp = Math.min(combat.playerMaxHp, combat.playerHp + healAmount);

  const nextInventory = safe.inventory.map((inv, i) =>
    i === itemIndex ? { ...inv, quantity: inv.quantity - 1 } : inv,
  ).filter((inv) => inv.quantity > 0);

  const nextLog: CombatLogEntry[] = [
    makeLog(`你迅速取出「${item.name}」，稍作處理，回復 ${healAmount} 體力。`, 'success', now),
    ...resolveEnemyTurn(safe, now, 0).logs,
  ];

  return {
    ...safe,
    inventory: nextInventory,
    combat: {
      ...combat,
      round: combat.round + 1,
      playerHp: nextHp,
      log: [...nextLog, ...combat.log].slice(0, 40),
    },
    journal: [
      { id: `${safe.id}-combat-${combat.round}`, kind: 'combat' as const, text: nextLog[0].text, createdAt: now },
      ...safe.journal,
    ].slice(0, 30),
    updatedAt: now,
  };
}

// ─── Core Combat Resolution ───────────────────────────────────────────────────

function resolveCombat(
  game: GameState,
  action: {
    id: CombatActionId | '快攻';
    label: string;
    target: BodyPart;
    staminaCost: number;
    damageBonus: number;
    isCustom: boolean;
  },
): GameState {
  const combat = game.combat;
  const now = new Date().toISOString();

  // Stamina check
  if (combat.playerStamina < action.staminaCost) {
    return appendCombatLog(game, `你已精疲力竭，無力出招「${action.label}」。休息一下先。`, 'rejected');
  }

  const hitChance = calcHitChance(
    game.character.stats.機敏,
    combat.enemy.speed,
    combat.distance,
    action.target,
    combat.playerStamina,
    combat.playerMaxStamina,
  );

  const roll = rollFrom(`${game.id}-${combat.round}-${action.label}-${action.target}`);
  const hitRoll = (roll / 11) * 100;
  const hit = hitRoll < hitChance;

  const rawDamage = hit
    ? calcDamage(game.character.stats.體魄, combat.enemy.defense, action.target, action.damageBonus, combat.playerGuard > 0)
    : 0;

  const enemyBodyParts = updateBodyPart(combat.enemy.bodyParts, action.target, rawDamage);
  const enemyHp = Math.max(0, combat.enemy.hp - rawDamage);
  const enemyInjury = hit && rawDamage >= getInjuryThreshold(action.target)
    ? makeInjury('敵人', action.target, rawDamage, now)
    : null;
  const enemyDown = enemyHp <= 0;

  const nextLog: CombatLogEntry[] = [
    makeLog(buildAttackLog(action.label, action.target, hit, rawDamage, combat.enemy.name, action.isCustom), hit ? 'success' : 'info', now),
  ];

  if (enemyInjury) {
    nextLog.push(makeLog(buildInjuryLog('敵人', action.target, enemyBodyParts[action.target] ?? '受傷'), 'danger', now));
  }

  if (enemyDown) {
    nextLog.push(makeLog(`${combat.enemy.name}失去戰意，跌倒在地。你贏咗。`, 'success', now));
  }

  // Enemy counter-attack
  const enemyTurn = enemyDown ? { logs: [], damage: 0, injury: null, playerBodyParts: combat.playerBodyParts }
    : resolveEnemyTurn(game, now, rawDamage);

  nextLog.push(...enemyTurn.logs);

  const nextPlayerHp = Math.max(0, combat.playerHp - enemyTurn.damage);
  const playerDown = nextPlayerHp <= 0;
  if (playerDown) {
    nextLog.push(makeLog('你受傷過重，只能狼狽脫身。戰鬥結束。', 'danger', now));
  }

  // Stamina recovery: regen 1 each round, then deduct action cost
  const nextPlayerStamina = Math.min(
    combat.playerMaxStamina,
    Math.max(0, combat.playerStamina + 1 - action.staminaCost),
  );
  const nextEnemyStamina = Math.min(combat.enemy.maxStamina, combat.enemy.stamina + 1 - 2);

  const nextStatus: CombatStatus = enemyDown ? '勝利' : playerDown ? '失敗' : '進行中';

  const injuries = [
    ...(enemyInjury ? [enemyInjury] : []),
    ...(enemyTurn.injury ? [enemyTurn.injury] : []),
    ...combat.injuries,
  ].slice(0, 20);

  return {
    ...game,
    combat: {
      ...combat,
      active: nextStatus === '進行中',
      status: nextStatus,
      round: combat.round + 1,
      playerHp: nextPlayerHp,
      playerStamina: nextPlayerStamina,
      playerGuard: 0,
      playerBodyParts: enemyTurn.playerBodyParts,
      enemy: {
        ...combat.enemy,
        hp: enemyHp,
        stamina: Math.max(0, nextEnemyStamina),
        bodyParts: enemyBodyParts,
        intent: enemyDown ? '已無力還手' : getEnemyIntent(combat.round, combat.enemy.morale),
      },
      injuries,
      log: [...nextLog, ...combat.log].slice(0, 40),
    },
    journal: [
      { id: `${game.id}-combat-${combat.round}`, kind: 'combat' as const, text: nextLog[0].text, createdAt: now },
      ...game.journal,
    ].slice(0, 30),
    updatedAt: now,
  };
}

// ─── Special Actions ──────────────────────────────────────────────────────────

function resolveRetreat(game: GameState): GameState {
  const combat = game.combat;
  const now = new Date().toISOString();
  return {
    ...game,
    combat: {
      ...combat,
      active: false,
      status: '撤退',
      round: combat.round + 1,
      log: [
        makeLog('你不再纏鬥，拉開距離，離開衝突。無人會因此宣布世界改變。', 'info', now),
        ...combat.log,
      ].slice(0, 40),
    },
    updatedAt: now,
  };
}

function resolveWithdraw(game: GameState): GameState {
  const combat = game.combat;
  const now = new Date().toISOString();

  const distIndex = DISTANCE_ORDER.indexOf(combat.distance);
  const isMaxDistance = distIndex >= DISTANCE_ORDER.length - 1;

  if (isMaxDistance) {
    // Automatically escapes at maximum distance
    return resolveRetreat(game);
  }

  const nextDistance = DISTANCE_ORDER[distIndex + 1];
  const nextStamina = Math.max(0, combat.playerStamina - 2);

  // Enemy still attacks, but harder at longer range
  const enemyTurn = resolveEnemyTurn(game, now, 0, nextDistance);

  const nextLog: CombatLogEntry[] = [
    makeLog(`你後退，與對方拉開距離（現在：${nextDistance}）。`, 'info', now),
    ...enemyTurn.logs,
  ];

  const nextPlayerHp = Math.max(0, combat.playerHp - enemyTurn.damage);
  const playerDown = nextPlayerHp <= 0;
  if (playerDown) nextLog.push(makeLog('你被逼到撐唔住，只能狼狽脫身。', 'danger', now));

  return {
    ...game,
    combat: {
      ...combat,
      active: !playerDown,
      status: playerDown ? '失敗' : '進行中',
      round: combat.round + 1,
      playerHp: nextPlayerHp,
      playerStamina: nextStamina,
      playerBodyParts: enemyTurn.playerBodyParts,
      distance: nextDistance,
      log: [...nextLog, ...combat.log].slice(0, 40),
    },
    updatedAt: now,
  };
}

function resolveGuardObserve(game: GameState): GameState {
  const combat = game.combat;
  const now = new Date().toISOString();

  const guardGain = 3;
  const nextStamina = Math.min(combat.playerMaxStamina, combat.playerStamina + 2 - 1);

  // Enemy attacks with reduced effect
  const enemyTurn = resolveEnemyTurn(game, now, 0);
  const guardedDamage = Math.max(0, enemyTurn.damage - guardGain);

  const nextLog: CombatLogEntry[] = [
    makeLog(`你抬臂格擋，靜靜觀察${combat.enemy.name}嘅呼吸節奏。（防勢 +${guardGain}）`, 'info', now),
    ...enemyTurn.logs.map((log) =>
      guardedDamage < enemyTurn.damage
        ? { ...log, text: log.text + '（格擋減傷）' }
        : log,
    ),
  ];

  const nextPlayerHp = Math.max(0, combat.playerHp - guardedDamage);
  const playerDown = nextPlayerHp <= 0;

  return {
    ...game,
    combat: {
      ...combat,
      active: !playerDown,
      status: playerDown ? '失敗' : '進行中',
      round: combat.round + 1,
      playerHp: nextPlayerHp,
      playerStamina: nextStamina,
      playerGuard: guardGain,
      log: [...nextLog, ...combat.log].slice(0, 40),
    },
    updatedAt: now,
  };
}

// ─── Enemy Turn ───────────────────────────────────────────────────────────────

function resolveEnemyTurn(
  game: GameState,
  now: string,
  playerPressure: number,
  overrideDistance?: CombatDistance,
): { logs: CombatLogEntry[]; damage: number; injury: Injury | null; playerBodyParts: GameState['combat']['playerBodyParts'] } {
  const combat = game.combat;
  const enemy = combat.enemy;
  const distance = overrideDistance ?? combat.distance;

  const distMod = distance === '貼身' ? 5 : distance === '近距離' ? 0 : distance === '中距離' ? -10 : -25;
  const roll = rollFrom(`${game.id}-enemy-${combat.round}-${playerPressure}`);
  const hitRoll = (roll / 11) * 100;
  const enemyHitChance = Math.max(10, Math.min(85, 40 + enemy.speed * 3 - game.character.stats.機敏 * 2 + distMod));
  const hit = hitRoll < enemyHitChance;

  if (!hit) {
    return {
      logs: [makeLog(`${enemy.name}試圖反擊，但你閃過。`, 'info', now)],
      damage: 0,
      injury: null,
      playerBodyParts: combat.playerBodyParts,
    };
  }

  const targetIndex = roll % V2_BODY_PARTS.length;
  const targetPart = V2_BODY_PARTS[targetIndex];
  const rawDamage = Math.max(1, enemy.attack - Math.floor(game.character.stats.機敏 / 3) - combat.playerGuard);
  const injury = rawDamage >= 4 ? makeInjury('玩家', targetPart, rawDamage, now) : null;
  const nextBodyParts = updateBodyPart(combat.playerBodyParts, targetPart, rawDamage);

  const logs: CombatLogEntry[] = [
    makeLog(`${enemy.name}反擊，打中你嘅${targetPart}，你受 ${rawDamage} 傷害。`, 'danger', now),
  ];

  if (injury) {
    logs.push(makeLog(buildInjuryLog('你', targetPart, nextBodyParts[targetPart] ?? '受傷'), 'danger', now));
  }

  return { logs, damage: rawDamage, injury, playerBodyParts: nextBodyParts };
}

// ─── Calculations ─────────────────────────────────────────────────────────────

function calcHitChance(
  playerSpeed: number,
  enemySpeed: number,
  distance: CombatDistance,
  target: BodyPart,
  stamina: number,
  maxStamina: number,
): number {
  const base = 50;
  const speedDiff = playerSpeed * 3 - enemySpeed * 2;
  const distMod = distance === '貼身' ? 15 : distance === '近距離' ? 0 : distance === '中距離' ? -10 : -25;
  const partMod = getBodyPartMod(target).accuracy;
  const staminaRatio = stamina / maxStamina;
  const staminaMod = staminaRatio < 0.25 ? -20 : staminaRatio < 0.5 ? -10 : 0;
  return Math.max(10, Math.min(90, base + speedDiff + distMod + partMod + staminaMod));
}

function calcDamage(
  playerStrength: number,
  enemyDefense: number,
  target: BodyPart,
  actionBonus: number,
  hadGuard: boolean,
): number {
  const partMod = getBodyPartMod(target).damage;
  const guardBonus = hadGuard ? 1 : 0;
  return Math.max(1, playerStrength + actionBonus + partMod - enemyDefense + guardBonus);
}

function getInjuryThreshold(part: BodyPart): number {
  if (part === '眼睛' || part === '咽喉') return 2;
  if (part === '頭部') return 4;
  if (part === '胸部' || part === '腹部') return 5;
  return 3;
}

function getBodyPartMod(part: BodyPart): { accuracy: number; damage: number } {
  if (part === '頭部') return { accuracy: -15, damage: 3 };
  if (part === '眼睛') return { accuracy: -25, damage: 4 };
  if (part === '咽喉') return { accuracy: -20, damage: 4 };
  if (part === '胸部') return { accuracy: 5, damage: 1 };
  if (part === '腹部') return { accuracy: 0, damage: 2 };
  if (part === '左臂' || part === '右臂') return { accuracy: -5, damage: 0 };
  if (part === '左腿' || part === '右腿') return { accuracy: -8, damage: 0 };
  // Legacy parts
  if (part === '軀幹') return { accuracy: 3, damage: 1 };
  if (part === '左手' || part === '右手') return { accuracy: -5, damage: 0 };
  return { accuracy: -5, damage: 0 }; // 左腳 / 右腳
}

function getActionProfile(action: CombatActionId): { staminaCost: number; damageBonus: number } {
  if (action === '攻擊右臂' || action === '攻擊左腿') return { staminaCost: 3, damageBonus: 0 };
  if (action === '重擊') return { staminaCost: 5, damageBonus: 3 };
  if (action === '快攻') return { staminaCost: 3, damageBonus: 0 };
  if (action === '防守' || action === '格擋觀察') return { staminaCost: 1, damageBonus: -2 };
  if (action === '推開') return { staminaCost: 2, damageBonus: -1 };
  return { staminaCost: 3, damageBonus: 0 };
}

// ─── Body Part Status ─────────────────────────────────────────────────────────

function updateBodyPart(
  parts: Partial<Record<BodyPart, BodyPartStatus>>,
  target: BodyPart,
  damage: number,
): Partial<Record<BodyPart, BodyPartStatus>> {
  if (damage <= 0) return parts;
  const current = parts[target] ?? '完好';
  const next = escalateStatus(current, damage, target);
  return { ...parts, [target]: next };
}

const STATUS_ORDER: BodyPartStatus[] = ['完好', '瘀傷', '流血', '受傷', '骨折', '失能'];

function escalateStatus(current: BodyPartStatus, damage: number, part: BodyPart): BodyPartStatus {
  const currentIndex = STATUS_ORDER.indexOf(current);
  const sensitive = part === '眼睛' || part === '咽喉';
  const steps = damage >= 8 ? 4 : damage >= 5 ? 3 : damage >= 3 ? 2 : 1;
  const adjusted = sensitive ? steps + 1 : steps;
  return STATUS_ORDER[Math.min(currentIndex + adjusted, STATUS_ORDER.length - 1)];
}

function makeHealthyParts(): Partial<Record<BodyPart, BodyPartStatus>> {
  return Object.fromEntries(V2_BODY_PARTS.map((part) => [part, '完好' as BodyPartStatus]));
}

// ─── Log Generation ───────────────────────────────────────────────────────────

function buildAttackLog(
  label: string,
  target: BodyPart,
  hit: boolean,
  damage: number,
  enemyName: string,
  isCustom: boolean,
): string {
  if (!hit) {
    return isCustom
      ? `你嘗試「${label}」，但對方閃開，落空。`
      : `你攻向${enemyName}${target}，但角度唔夠，落空。`;
  }
  if (isCustom) {
    return `你「${label}」，攻中${enemyName}${target}，造成 ${damage} 傷害。`;
  }
  // Flavour by body part
  if (target === '眼睛') return `你精準攻向${enemyName}眼睛，命中，造成 ${damage} 傷害，對方視線受擾。`;
  if (target === '咽喉') return `你快速擊向${enemyName}咽喉，命中，造成 ${damage} 傷害，對方呼吸受阻。`;
  if (target === '頭部') return `你橫掃${enemyName}頭部，命中，造成 ${damage} 傷害，對方搖晃。`;
  if (target === '胸部') return `你攻向${enemyName}胸部，命中，造成 ${damage} 傷害，對方被迫退步。`;
  if (target === '腹部') return `你衝拳打向${enemyName}腹部，命中，造成 ${damage} 傷害，對方彎身。`;
  if (target === '右臂') return `你踏前橫掃${enemyName}右臂，命中，造成 ${damage} 傷害，對方出手變慢。`;
  if (target === '左臂') return `你攻向${enemyName}左臂，命中，造成 ${damage} 傷害。`;
  if (target === '右腿') return `你低身踢向${enemyName}右腿，命中，造成 ${damage} 傷害，對方踉蹌。`;
  if (target === '左腿') return `你低身踢向${enemyName}左腿，命中，造成 ${damage} 傷害，對方移動受阻。`;
  return `你攻向${enemyName}${target}，命中，造成 ${damage} 傷害。`;
}

function buildInjuryLog(target: '你' | '敵人', part: BodyPart, status: BodyPartStatus): string {
  const subject = target === '你' ? '你嘅' : '對方嘅';
  return `${subject}${part}現在狀態：${status}。`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function validateCustomAction(text: string, status: CombatStatus): string | null {
  if (status !== '進行中') return '戰鬥已經完結，唔需要再出手。';
  if (text.length < 2) return '行動太短，請講清楚你想點做。';
  if (text.length > 50) return '行動描述太長，戰鬥中要短而清。';
  if (INVALID_POWER_WORDS.some((w) => text.includes(w))) return '呢個行動超出目前角色能力，已拒絕。';
  if (!VALID_ACTION_HINTS.some((w) => text.includes(w))) {
    return '呢個行動唔似近身搏鬥指令，試下用打、踢、推、擋、閃、刺、斬等字眼。';
  }
  return null;
}

function appendCombatLog(game: GameState, text: string, tone: CombatLogEntry['tone']): GameState {
  const safe = ensureCombat(game);
  const now = new Date().toISOString();
  return {
    ...safe,
    combat: {
      ...safe.combat,
      log: [makeLog(text, tone, now), ...safe.combat.log].slice(0, 40),
    },
    updatedAt: now,
  };
}

function makeLog(text: string, tone: CombatLogEntry['tone'], createdAt: string): CombatLogEntry {
  return {
    id: `combat-log-${createdAt}-${Math.random().toString(36).slice(2, 7)}`,
    text,
    tone,
    createdAt,
  };
}

function makeInjury(target: '玩家' | '敵人', bodyPart: BodyPart, damage: number, createdAt: string): Injury {
  const severity = damage >= 7 ? '重傷' : damage >= 4 ? '中傷' : '輕傷';
  const note = getInjuryNote(bodyPart);
  return { id: `injury-${target}-${bodyPart}-${createdAt}`, target, bodyPart, severity, note, createdAt };
}

function getInjuryNote(part: BodyPart): string {
  if (part === '頭部') return '視線同判斷受影響';
  if (part === '眼睛') return '視線嚴重模糊，命中率下降';
  if (part === '咽喉') return '呼吸受阻，體力恢復變慢';
  if (part === '胸部') return '呼吸被打亂，行動受限';
  if (part === '腹部') return '腹痛，爆發力下降';
  if (part === '左臂' || part === '右臂' || part === '左手' || part === '右手') return '出手速度下降';
  if (part === '左腿' || part === '右腿' || part === '左腳') return '移動唔穩，撤退更難';
  return '局部受創';
}

function rollFrom(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % 12;
}

function getEnemyIntent(round: number, morale: number): string {
  if (morale <= 2) return '對方士氣低落，似乎想撤退';
  if (round % 4 === 0) return '對方蓄力，準備猛攻';
  if (round % 3 === 0) return '對方試圖壓近';
  if (round % 2 === 0) return '對方護住要害';
  return '對方試探你嘅破綻';
}

function getInitialTerrain(world: WorldSeed): string {
  if (world.type === '武俠') return '街道石板地';
  if (world.type === '修仙') return '坊市廣場';
  if (world.type === '末日') return '殘破廢墟';
  return '密室走廊';
}

function getInitialLight(world: WorldSeed): LightCondition {
  if (world.type === '末日') return '黃昏';
  if (world.type === '無限流') return '夜晚';
  return '白晝';
}

function getInitialWeather(world: WorldSeed): string {
  if (world.type === '末日') return '沙塵';
  if (world.type === '修仙') return '雲霧';
  return '晴';
}

function lightCondition2text(light: LightCondition): string {
  if (light === '白晝') return '光線充足';
  if (light === '黃昏') return '光線昏暗';
  if (light === '夜晚') return '月光微弱';
  return '伸手不見五指';
}

function createEnemy(world: WorldSeed): Enemy {
  const template = getEnemyTemplate(world);
  return {
    ...template,
    id: `enemy-${world.seed}`,
    stamina: template.maxStamina,
    bodyParts: makeHealthyParts(),
    intent: '試探你嘅反應',
  };
}

function getEnemyTemplate(world: WorldSeed): Omit<Enemy, 'id' | 'bodyParts' | 'intent'> & { stamina: number } {
  if (world.type === '武俠') {
    return { name: '街邊惡漢', type: '人類', level: 1, hp: 18, maxHp: 18, stamina: 10, maxStamina: 10, attack: 4, defense: 2, speed: 4, morale: 5 };
  }
  if (world.type === '修仙') {
    return { name: '坊市打手', type: '人類', level: 2, hp: 20, maxHp: 20, stamina: 12, maxStamina: 12, attack: 5, defense: 3, speed: 3, morale: 6 };
  }
  if (world.type === '末日') {
    return { name: '飢餓拾荒者', type: '人類', level: 1, hp: 14, maxHp: 14, stamina: 8, maxStamina: 8, attack: 3, defense: 1, speed: 5, morale: 3 };
  }
  return { name: '沉默參與者', type: '未知', level: 3, hp: 22, maxHp: 22, stamina: 14, maxStamina: 14, attack: 5, defense: 4, speed: 5, morale: 8 };
}
