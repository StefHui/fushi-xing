import type { GameState, Rumor, WorldClock, WorldEvent, WorldHistoryEntry, WorldSeed } from '../types/game';

const PHASES: WorldClock['phase'][] = ['清晨', '日間', '黃昏', '深夜'];

export function createInitialWorldClock(): WorldClock {
  return {
    day: 1,
    phase: '清晨',
    tension: 2,
    lastTickReason: '世界開始照自己節奏運行。',
  };
}

export function createInitialWorldEvents(world: WorldSeed): WorldEvent[] {
  return [
    {
      id: `event-${world.seed}-pressure`,
      title: getPressureTitle(world),
      location: world.regionName,
      status: '醞釀中',
      pressure: 2,
      visibility: '公開',
      description: world.ordinaryPressure,
      lastChange: '呢件事本來就存在，唔係因你而起。',
    },
    {
      id: `event-${world.seed}-background`,
      title: getBackgroundTitle(world),
      location: world.startingPlace,
      status: '醞釀中',
      pressure: 1,
      visibility: '少數人知道',
      description: world.backgroundEvent,
      lastChange: '有人私下提過，但未成氣候。',
    },
    {
      id: `event-${world.seed}-rumor`,
      title: '傳聞自己長腳',
      location: '傳聞地點',
      status: '醞釀中',
      pressure: 1,
      visibility: '街談巷議',
      description: world.localRumor,
      lastChange: '茶水、隊伍、避難角落入面，有人重複講起。',
    },
  ];
}

export function createInitialWorldHistory(world: WorldSeed, events = createInitialWorldEvents(world)): WorldHistoryEntry[] {
  return events.map((event) => ({
    id: `history-${event.id}-start`,
    date: '第 1 日 清晨',
    location: event.location,
    eventType: event.title,
    shortSummary: event.description,
    impactSummary: event.lastChange,
    discovered: event.visibility === '公開',
  }));
}

export function createInitialRumors(world: WorldSeed, events = createInitialWorldEvents(world)): Rumor[] {
  return events
    .filter((event) => event.visibility !== '少數人知道')
    .map((event, index) => ({
      id: `rumor-${event.id}-start`,
      date: '第 1 日 清晨',
      source: index % 2 === 0 ? '茶寮' : '市集',
      location: event.location,
      truthState: event.visibility === '公開' ? '真' : '半真',
      text: makeRumorText(event, event.visibility === '公開' ? '真' : '半真'),
      relatedEventId: event.id,
    }));
}

export function ensureWorldSimulation(game: GameState): GameState {
  const worldEvents = game.worldEvents?.length ? game.worldEvents : createInitialWorldEvents(game.world);
  return {
    ...game,
    worldClock: game.worldClock ?? createInitialWorldClock(),
    worldEvents,
    worldHistory: game.worldHistory?.length ? game.worldHistory : createInitialWorldHistory(game.world, worldEvents),
    rumors: game.rumors?.length ? game.rumors : createInitialRumors(game.world, worldEvents),
  };
}

export function advanceWorld(game: GameState, reason: string): GameState {
  const safeGame = ensureWorldSimulation(game);
  const now = new Date().toISOString();
  const nextClock = advanceClock(safeGame.worldClock, reason);
  const tickSeed = `${safeGame.id}-${safeGame.turn}-${nextClock.day}-${nextClock.phase}-${reason}`;
  const changedEvents = safeGame.worldEvents.map((event, index) =>
    advanceEvent(event, tickSeed, index, reason),
  );
  const tension = clampTension(Math.round(changedEvents.reduce((sum, event) => sum + event.pressure, 0) / changedEvents.length));
  const clockWithTension = { ...nextClock, tension };
  const visibleChange = changedEvents.find((event) => event.lastChange.includes('升溫') || event.lastChange.includes('平息')) ?? changedEvents[0];
  const historyEntries = changedEvents.map((event) => createHistoryEntry(event, clockWithTension));
  const discoveredHistory = historyEntries.map((entry) => ({
    ...entry,
    discovered: entry.discovered || shouldRevealHistory(entry, safeGame.rumors),
  }));
  const nextRumors = createRumorsFromTick(changedEvents, clockWithTension, reason, safeGame.rumors);

  return {
    ...safeGame,
    worldClock: clockWithTension,
    worldEvents: changedEvents,
    worldHistory: [...discoveredHistory, ...safeGame.worldHistory].slice(0, 80),
    rumors: [...nextRumors, ...safeGame.rumors].slice(0, 40),
    journal: [
      {
        id: `${safeGame.id}-world-${now}`,
        kind: 'world' as const,
        text: `${nextClock.phase}，${visibleChange.title}：${visibleChange.lastChange}`,
        createdAt: now,
      },
      ...safeGame.journal,
    ].slice(0, 30),
    updatedAt: now,
  };
}

function createHistoryEntry(event: WorldEvent, clock: WorldClock): WorldHistoryEntry {
  return {
    id: `history-${event.id}-${clock.day}-${clock.phase}-${Math.random().toString(36).slice(2, 7)}`,
    date: `第 ${clock.day} 日 ${clock.phase}`,
    location: event.location,
    eventType: event.title,
    shortSummary: event.description,
    impactSummary: event.lastChange,
    discovered: event.visibility === '公開',
  };
}

function createRumorsFromTick(events: WorldEvent[], clock: WorldClock, reason: string, existingRumors: Rumor[]): Rumor[] {
  const candidate = events.find((event) => event.visibility !== '少數人知道') ?? events[0];
  if (!candidate) return [];

  const roll = rollFrom(`${candidate.id}-${clock.day}-${clock.phase}-${reason}-rumor`);
  if (roll < 3 && candidate.visibility !== '公開') return [];

  const truthState = getRumorTruthState(roll, candidate.status);
  const source = getRumorSource(roll, reason);
  const id = `rumor-${candidate.id}-${clock.day}-${clock.phase}-${roll}`;
  if (existingRumors.some((rumor) => rumor.id === id)) return [];

  return [
    {
      id,
      date: `第 ${clock.day} 日 ${clock.phase}`,
      source,
      location: candidate.location,
      truthState,
      text: makeRumorText(candidate, truthState),
      relatedEventId: candidate.id,
    },
  ];
}

function shouldRevealHistory(entry: WorldHistoryEntry, rumors: Rumor[]) {
  return rumors.some((rumor) => rumor.relatedEventId && entry.id.includes(rumor.relatedEventId));
}

function makeRumorText(event: WorldEvent, truthState: Rumor['truthState']) {
  if (truthState === '假') return `有人話${event.location}出咗大事，但講法太誇，未必可信。`;
  if (truthState === '半真') return `有人提起${event.location}有異動，細節同你聽過嘅唔完全一致。`;
  if (truthState === '過時') return `有人仲喺講${event.location}嘅舊消息，但可能已經變咗。`;
  return `${event.location}有人傳：${event.description}`;
}

function getRumorTruthState(roll: number, status: WorldEvent['status']): Rumor['truthState'] {
  if (status === '自行平息' && roll % 2 === 0) return '過時';
  if (roll <= 2) return '假';
  if (roll <= 6) return '半真';
  return '真';
}

function getRumorSource(roll: number, reason: string): Rumor['source'] {
  if (reason.includes('NPC')) return 'NPC';
  if (reason.includes('戰鬥')) return '商人';
  if (roll % 5 === 0) return '派系成員';
  if (roll % 2 === 0) return '市集';
  return '茶寮';
}

function advanceClock(clock: WorldClock, reason: string): WorldClock {
  const currentIndex = PHASES.indexOf(clock.phase);
  const nextIndex = (currentIndex + 1) % PHASES.length;
  return {
    day: clock.day + (nextIndex === 0 ? 1 : 0),
    phase: PHASES[nextIndex],
    tension: clock.tension,
    lastTickReason: reason,
  };
}

function advanceEvent(event: WorldEvent, seed: string, index: number, reason: string): WorldEvent {
  if (event.status === '已結束') return event;

  const roll = rollFrom(`${seed}-${event.id}-${index}`);
  const playerIgnored = reason.includes('離開') || reason.includes('保持距離');
  const playerInvestigated = reason.includes('追查') || reason.includes('打探') || reason.includes('觀察');
  const playerHelped = reason.includes('幫') || reason.includes('搵份臨時活') || reason.includes('打招呼');
  const delta = getPressureDelta(roll, playerIgnored, playerInvestigated, playerHelped);
  const pressure = clampPressure(event.pressure + delta);
  const status = getStatus(pressure, event.status);
  const visibility = getVisibility(pressure, event.visibility);

  return {
    ...event,
    pressure,
    status,
    visibility,
    lastChange: getLastChange(delta, pressure, reason),
  };
}

function getPressureDelta(roll: number, ignored: boolean, investigated: boolean, helped: boolean) {
  if (helped && roll <= 6) return -1;
  if (investigated && roll >= 8) return 1;
  if (ignored && roll >= 5) return 1;
  if (roll <= 2) return -1;
  if (roll >= 9) return 1;
  return 0;
}

function getStatus(pressure: number, previous: WorldEvent['status']): WorldEvent['status'] {
  if (pressure <= 0) return '自行平息';
  if (pressure >= 7) return '擴散';
  if (pressure >= 4) return '升溫';
  if (previous === '自行平息' && pressure > 0) return '醞釀中';
  return '醞釀中';
}

function getVisibility(pressure: number, previous: WorldEvent['visibility']): WorldEvent['visibility'] {
  if (pressure >= 5) return '公開';
  if (pressure >= 3) return '街談巷議';
  return previous === '公開' ? '街談巷議' : '少數人知道';
}

function getLastChange(delta: number, pressure: number, reason: string) {
  if (delta > 0) return `因為「${reason}」之後無人完全掌控局面，事件升溫。`;
  if (delta < 0) return `因為「${reason}」帶來少少緩衝，事件暫時平息。`;
  if (pressure >= 6) return '局勢未爆，但已經多人留意。';
  return '暫時無大變化，世界繼續自己行。';
}

function getPressureTitle(world: WorldSeed) {
  if (world.type === '武俠') return '街面暗湧';
  if (world.type === '修仙') return '坊市規矩變緊';
  if (world.type === '末日') return '補給壓力';
  return '規則變動';
}

function getBackgroundTitle(world: WorldSeed) {
  if (world.type === '武俠') return '鏢局風聲';
  if (world.type === '修仙') return '山門雜音';
  if (world.type === '末日') return '避難所異動';
  return '房間異常';
}

function rollFrom(seed: string) {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % 12;
}

function clampPressure(value: number) {
  return Math.max(0, Math.min(8, value));
}

function clampTension(value: number) {
  return Math.max(0, Math.min(8, value));
}
