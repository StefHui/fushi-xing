// locationEngine.ts
// Defines locations per world type and generates scene text + contextual choices.

import type { Choice, GameState, MapLocation, StoryNode, WorldType } from '../types/game';

export interface LocationDef {
  id: string;
  name: string;
  description: string;
  danger: 'none' | 'low' | 'medium' | 'high';
  workIds: string[];   // work actions available here
  npcRoles: string[];  // typical NPC roles found here
}

// ─── Location Definitions per World Type ─────────────────────────────────────

const LOCATIONS: Record<WorldType, LocationDef[]> = {
  武俠: [
    {
      id: 'market',
      name: '市集',
      description: '人聲鼎沸，各色攤檔林立。小販叫賣聲同秘密交易同時進行。',
      danger: 'low',
      workIds: ['搬貨', '跑腿'],
      npcRoles: ['商人', '遊俠', '探子'],
    },
    {
      id: 'inn',
      name: '客棧',
      description: '酒香混著塵土味，各路人馬在此歇腳。消息最容易從這裡流出。',
      danger: 'none',
      workIds: ['劈柴', '客棧幫工'],
      npcRoles: ['掌櫃', '旅人', '賭徒'],
    },
    {
      id: 'pharmacy',
      name: '藥鋪',
      description: '草藥香氣瀰漫，老藥師低頭炮製。傷藥在這裡，毒藥也在這裡。',
      danger: 'none',
      workIds: ['搬貨', '採藥'],
      npcRoles: ['藥師', '學徒', '病人'],
    },
    {
      id: 'mountain',
      name: '後山',
      description: '樹林遮天，山路崎嶇。猛獸出沒，也有隱士藏身。',
      danger: 'high',
      workIds: ['採藥', '打獵', '跟獵人入山'],
      npcRoles: ['獵人', '採藥人', '逃犯'],
    },
    {
      id: 'riverside',
      name: '河邊',
      description: '水聲潺潺，漁船搖擺。有人在這裡洗去血跡，也有人在這裡數銀子。',
      danger: 'low',
      workIds: ['搬貨', '跑腿'],
      npcRoles: ['漁民', '船夫', '洗衣婦'],
    },
    {
      id: 'village',
      name: '村口',
      description: '這裡是出入的咽喉。陌生人在這裡最容易被認出，也最容易打聽消息。',
      danger: 'none',
      workIds: ['劈柴', '搬貨'],
      npcRoles: ['村民', '守衛', '小孩'],
    },
  ],
  修仙: [
    {
      id: 'market',
      name: '坊市',
      description: '靈石交換，丹藥流通。各方修士在此買賣，表面平靜，暗流洶湧。',
      danger: 'low',
      workIds: ['搬貨', '跑腿'],
      npcRoles: ['散修', '丹師', '掌櫃'],
    },
    {
      id: 'inn',
      name: '茶館',
      description: '靈茶飄香，修士們在此休歇。消息在茶杯之間悄悄傳遞。',
      danger: 'none',
      workIds: ['客棧幫工', '劈柴'],
      npcRoles: ['散修', '旅人', '說書人'],
    },
    {
      id: 'pharmacy',
      name: '藥坊',
      description: '靈草藥材堆積，煉丹爐火不熄。一株普通草藥可能是解毒靈藥。',
      danger: 'none',
      workIds: ['採藥', '搬貨'],
      npcRoles: ['丹師', '學徒', '藥農'],
    },
    {
      id: 'mountain',
      name: '靈山',
      description: '靈氣聚集之地，也是凶獸出沒之所。機遇與危險並存。',
      danger: 'high',
      workIds: ['採藥', '打獵', '跟獵人入山'],
      npcRoles: ['採藥人', '獵人', '散修'],
    },
    {
      id: 'riverside',
      name: '靈溪',
      description: '溪水含靈氣，可洗滌心神。偶有水族出沒，不可大意。',
      danger: 'low',
      workIds: ['採藥', '搬貨'],
      npcRoles: ['漁民', '修士', '採藥人'],
    },
    {
      id: 'village',
      name: '山門外',
      description: '宗門入口，凡人與修士混雜。消息從這裡進進出出。',
      danger: 'none',
      workIds: ['劈柴', '跑腿'],
      npcRoles: ['守門弟子', '凡人', '外門弟子'],
    },
  ],
  末日: [
    {
      id: 'market',
      name: '黑市',
      description: '廢墟角落，物資交換的地方。信任是奢侈品，刀比話語更有說服力。',
      danger: 'medium',
      workIds: ['搬貨', '跑腿'],
      npcRoles: ['商人', '傭兵', '情報販'],
    },
    {
      id: 'inn',
      name: '庇護所',
      description: '破舊建築改建，勉強遮風擋雨。倖存者在這裡分享食物和消息。',
      danger: 'none',
      workIds: ['劈柴', '客棧幫工'],
      npcRoles: ['倖存者', '老人', '孩子'],
    },
    {
      id: 'pharmacy',
      name: '醫療站',
      description: '藥品緊缺，每一片藥都珍貴。醫生在這裡決定誰能活下去。',
      danger: 'none',
      workIds: ['搬貨', '採藥'],
      npcRoles: ['醫生', '護士', '傷員'],
    },
    {
      id: 'mountain',
      name: '廢墟深處',
      description: '輻射塵埃，變異生物出沒。也有舊世界的物資等待被發現。',
      danger: 'high',
      workIds: ['打獵', '跟獵人入山'],
      npcRoles: ['搜索者', '傭兵', '流浪者'],
    },
    {
      id: 'riverside',
      name: '污染河道',
      description: '水質堪憂，但仍有人在此捕魚維生。偶爾有物資順流漂來。',
      danger: 'low',
      workIds: ['搬貨', '跑腿'],
      npcRoles: ['漁民', '孩子', '流浪者'],
    },
    {
      id: 'village',
      name: '營地入口',
      description: '所有進出都在這裡登記。守衛疲憊，規矩隨時可以用食物換。',
      danger: 'none',
      workIds: ['劈柴', '搬貨'],
      npcRoles: ['守衛', '難民', '偵察員'],
    },
  ],
  無限流: [
    {
      id: 'market',
      name: '交易廣場',
      description: '副本內的交易中心。積分、道具、情報，什麼都可以買賣。',
      danger: 'low',
      workIds: ['搬貨', '跑腿'],
      npcRoles: ['玩家', 'NPC商人', '情報商'],
    },
    {
      id: 'inn',
      name: '休息區',
      description: '系統設置的安全區域。在這裡可以恢復狀態，也可以組隊。',
      danger: 'none',
      workIds: ['客棧幫工', '劈柴'],
      npcRoles: ['玩家', '嚮導NPC', '任務發布者'],
    },
    {
      id: 'pharmacy',
      name: '補給站',
      description: '消耗品和補給道具的來源。資源有限，先到先得。',
      danger: 'none',
      workIds: ['搬貨', '採藥'],
      npcRoles: ['補給商', '醫療NPC', '任務NPC'],
    },
    {
      id: 'mountain',
      name: '危險區域',
      description: '高收益高風險。積分豐厚，但死亡懲罰也最重。',
      danger: 'high',
      workIds: ['打獵', '跟獵人入山', '採藥'],
      npcRoles: ['精英怪', '隱藏NPC', '其他玩家'],
    },
    {
      id: 'riverside',
      name: '資源點',
      description: '固定刷新的資源採集點。效率不高，但相對安全。',
      danger: 'low',
      workIds: ['採藥', '搬貨'],
      npcRoles: ['採集者', '守衛NPC', '隱藏角色'],
    },
    {
      id: 'village',
      name: '新手區',
      description: '副本起始點附近。規則在這裡最明確，危險也最少。',
      danger: 'none',
      workIds: ['劈柴', '跑腿'],
      npcRoles: ['引導NPC', '新手玩家', '任務NPC'],
    },
  ],
};

// ─── Public Helpers ───────────────────────────────────────────────────────────

export function getLocationsForWorld(worldType: WorldType): LocationDef[] {
  return LOCATIONS[worldType] ?? LOCATIONS['武俠'];
}

export function getLocationDef(worldType: WorldType, locationId: string): LocationDef {
  const locs = getLocationsForWorld(worldType);
  return locs.find((l) => l.id === locationId) ?? locs[0];
}

export function buildInitialLocations(worldType: WorldType, startingPlace: string): MapLocation[] {
  const locs = getLocationsForWorld(worldType);
  return locs.map((loc, i) => ({
    id: loc.id,
    name: i === 0 ? startingPlace : loc.name,
    note: loc.description,
    status: i <= 1 ? ('已知' as const) : ('未到過' as const),
  }));
}

export function buildLocationArriveStory(game: GameState, locationId: string): StoryNode {
  const loc = getLocationDef(game.world.type, locationId);
  const mapLoc = game.map.find((m) => m.id === locationId);
  const displayName = mapLoc?.name ?? loc.name;

  // Find any NPC at this location
  const localNpc = game.npcs.find((n) => n.location === locationId || n.location === displayName);

  let body = `你來到${displayName}。${loc.description}`;
  if (localNpc) {
    body += `\n\n${localNpc.name}（${localNpc.role}）就喺附近，神情${localNpc.mood}。`;
  }

  const choices: Choice[] = [];
  const keys: Array<'A' | 'B' | 'C' | 'D' | 'E'> = ['A', 'B', 'C', 'D', 'E'];
  let keyIdx = 0;

  // Work option
  if (loc.workIds.length > 0) {
    choices.push({
      id: `work-menu::${locationId}`,
      key: keys[keyIdx++],
      label: '搵份工做',
      hint: `喺${displayName}搵臨時工，賺取收入。`,
      effects: {},
      nextBeat: '搵工',
    });
  }

  // Talk to NPC if present
  if (localNpc) {
    choices.push({
      id: `npc-talk::${localNpc.id}`,
      key: keys[keyIdx++],
      label: `同${localNpc.name}傾計`,
      hint: `${localNpc.role}，${localNpc.mood}。`,
      effects: { 口才: 1 },
      nextBeat: '傾計',
    });
  }

  // Observe
  choices.push({
    id: `observe::${locationId}`,
    key: keys[keyIdx++],
    label: '觀察四周',
    hint: '先睇清楚環境，搵出路或機會。',
    effects: { 機敏: 1 },
    nextBeat: '觀察',
  });

  // Go somewhere else
  choices.push({
    id: `free-move`,
    key: keys[keyIdx++],
    label: '去另一個地方',
    hint: '打開地圖，移動到其他位置。',
    effects: {},
    nextBeat: '移動',
  });

  return {
    id: `arrive-${locationId}-${Date.now()}`,
    title: `📍 ${displayName}`,
    body,
    choices: choices.slice(0, 5),
    phase: 'location-arrive',
  };
}

export function buildWorkMenuStory(game: GameState, locationId: string): StoryNode {
  const loc = getLocationDef(game.world.type, locationId);
  const mapLoc = game.map.find((m) => m.id === locationId);
  const displayName = mapLoc?.name ?? loc.name;

  const workLabels: Record<string, { label: string; hint: string }> = {
    劈柴: { label: '劈柴', hint: '體力活，穩定但辛苦。賺少少銅錢。' },
    搬貨: { label: '搬貨', hint: '幫人搬運，無需技術。量多辛苦。' },
    採藥: { label: '採藥', hint: '入山採草藥，有危險但收益不錯。' },
    打獵: { label: '打獵', hint: '追蹤獵物，有機會遇上危險。' },
    跟獵人入山: { label: '跟獵人入山', hint: '跟有經驗嘅獵人一起，較安全但分成少。' },
    客棧幫工: { label: '客棧幫工', hint: '打掃、端茶、聽消息。有時比勞力更值錢。' },
    跑腿: { label: '跑腿送信', hint: '幫人傳遞消息，快而不問。' },
  };

  const availableWork = loc.workIds.slice(0, 4);
  const keys: Array<'A' | 'B' | 'C' | 'D' | 'E'> = ['A', 'B', 'C', 'D', 'E'];

  const choices: Choice[] = availableWork.map((workId, i) => {
    const info = workLabels[workId] ?? { label: workId, hint: '做份工。' };
    return {
      id: `work-do::${workId}::${locationId}`,
      key: keys[i],
      label: info.label,
      hint: info.hint,
      effects: {},
      nextBeat: workId,
    };
  });

  // Add "back" option
  if (choices.length < 5) {
    choices.push({
      id: `back-to-scene::${locationId}`,
      key: keys[choices.length],
      label: '唔做了，四處打聽',
      hint: '留係原地，睇下有冇更好機會。',
      effects: { 機敏: 1 },
      nextBeat: '打聽',
    });
  }

  return {
    id: `work-menu-${locationId}-${Date.now()}`,
    title: `${displayName} — 搵工機會`,
    body: `你喺${displayName}打聽有咩工可以做。今日有${availableWork.length}個機會，你揀一個：`,
    choices,
    phase: 'work-menu',
  };
}
