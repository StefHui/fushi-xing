import { create } from 'zustand';

import { buildDialogueContext, buildNarrationContext } from '../ai/contextBuilder';
import {
  createInitialCombat,
  ensureCombat,
  resolveCustomCombatAction,
  resolveDefaultCombatAction,
  resolveItemUse,
  setCombatTarget,
} from '../engine/combatEngine';
import {
  createInitialNPCs,
  ensureNPCs,
  interactWithNpc,
  recordCombatForNPCs,
  recordFreeActionForNPCs,
  recordStoryChoiceForNPCs,
} from '../engine/npcEngine';
import { getPersonalityQuestions, calculateTraitScores, isPersonalityComplete } from '../engine/personalityTestEngine';
import {
  createInitialMap,
  createInitialQuests,
  createOpeningStory,
  resolveChoice,
  resolveFreeAction,
} from '../engine/storyEngine';
import { buildLocationArriveStory } from '../engine/locationEngine';
import { buildCharacterStats } from '../engine/statsEngine';
import {
  advanceWorld,
  createInitialRumors,
  createInitialWorldClock,
  createInitialWorldEvents,
  createInitialWorldHistory,
  ensureWorldSimulation,
} from '../engine/worldEventEngine';
import {
  buyItem,
  createInitialMarket,
  createInitialWallet,
  ensureEconomy,
  sellItem,
  updateMarketPrices,
} from '../engine/economyEngine';
import {
  advanceHooks,
  createInitialHooks,
  ensureHookSystem,
  tryDiscoverFromExploration,
  tryDiscoverFromNpc,
} from '../engine/storyHookEngine';
import { generateWorldSeed } from '../engine/worldSeedGenerator';
import {
  acceptProfession,
  buildInitialSkillProgress,
  buildInitialTendencies,
  combatActionToCategory,
  combatActionToIntensity,
  declineProfession,
  ensureSkillSystem,
  inferFreeActionCategory,
  recordPlayerAction,
} from '../engine/skillEngine';
import { initializeDatabase, listSaves, loadGameState, saveGameState } from '../storage/saveRepository';
import { useSettingsStore } from './useSettingsStore';
import type {
  BodyPart,
  Character,
  CharacterDraft,
  CombatActionId,
  GameState,
  NpcInteractionId,
  PersonalityAnswers,
  SaveSummary,
  ScreenId,
  WorldType,
} from '../types/game';

interface GameStore {
  activeQuestionIndex: number;
  combatActionDraft: string;
  currentScreen: ScreenId;
  draftCharacter: CharacterDraft;
  freeActionDraft: string;
  game: GameState | null;
  isReady: boolean;
  lastSavedAt: string | null;
  personalityAnswers: PersonalityAnswers;
  saves: SaveSummary[];
  selectedWorldType: WorldType | null;

  // AI narration state — cleared when player takes a new action
  aiNarration: string | null;
  aiDialogue: Record<string, string>; // npcId -> last AI dialogue
  aiActionRejection: string | null;   // AI-rejected custom action reason
  isAiLoading: boolean;

  initialize: () => Promise<void>;
  setScreen: (screen: ScreenId) => void;
  setCombatActionDraft: (value: string) => void;
  setCombatBodyPart: (bodyPart: BodyPart) => void;
  executeCombatAction: (action: CombatActionId) => void;
  executeCustomCombatAction: () => void;
  executeCustomCombatActionWithAI: () => Promise<void>;
  executeItemUse: () => void;
  interactWithNpc: (npcId: string, interaction: NpcInteractionId) => void;
  interactWithNpcAndGenerateDialogue: (npcId: string, interaction: NpcInteractionId) => Promise<void>;
  selectWorldType: (worldType: WorldType) => void;
  setDraftCharacter: (draft: Partial<CharacterDraft>) => void;
  answerPersonalityQuestion: (questionId: string, optionId: string) => void;
  startNewGame: () => Promise<void>;
  selectChoice: (choiceId: string) => void;
  travelToLocation: (locationId: string) => void;
  setFreeActionDraft: (value: string) => void;
  submitFreeAction: () => void;
  submitFreeActionWithAI: () => Promise<void>;
  saveGame: () => Promise<void>;
  refreshSaves: () => Promise<void>;
  loadSave: (id: string) => Promise<void>;
  resetRun: () => void;
  dismissAiNarration: () => void;
  acceptProfession: () => void;
  declineProfession: () => void;
  buyMarketItem: (itemId: string, quantity: number) => string | null;
  sellInventoryItem: (itemName: string, quantity: number) => string | null;
  refreshMarket: () => void;
}

const initialDraft: CharacterDraft = {
  name: '',
  gender: null,
  age: '',
};

// Wraps advanceWorld + periodic hook advancement in one call
function worldTick(game: GameState, reason: string): GameState {
  const afterWorld = advanceWorld(game, reason);
  // Advance hooks every 2 turns
  if (afterWorld.turn % 2 === 0) {
    return advanceHooks(afterWorld);
  }
  return afterWorld;
}

export const useGameStore = create<GameStore>((set, get) => ({
  activeQuestionIndex: 0,
  combatActionDraft: '',
  currentScreen: 'opening',
  draftCharacter: initialDraft,
  freeActionDraft: '',
  game: null,
  isReady: false,
  lastSavedAt: null,
  personalityAnswers: {},
  saves: [],
  selectedWorldType: null,
  aiNarration: null,
  aiDialogue: {},
  aiActionRejection: null,
  isAiLoading: false,

  initialize: async () => {
    await initializeDatabase();
    const saves = await listSaves();
    set({ isReady: true, saves });
  },

  setScreen: (screen) => set({ currentScreen: screen }),

  selectWorldType: (worldType) =>
    set({
      selectedWorldType: worldType,
      currentScreen: 'create',
      activeQuestionIndex: 0,
      personalityAnswers: {},
    }),

  setDraftCharacter: (draft) =>
    set((state) => ({
      draftCharacter: { ...state.draftCharacter, ...draft },
    })),

  answerPersonalityQuestion: (questionId, optionId) =>
    set((state) => {
      if (!state.selectedWorldType) return state;
      const questions = getPersonalityQuestions(state.selectedWorldType);
      const nextAnswers = { ...state.personalityAnswers, [questionId]: optionId };
      const nextIndex = Math.min(state.activeQuestionIndex + 1, questions.length - 1);
      return {
        personalityAnswers: nextAnswers,
        activeQuestionIndex: nextIndex,
      };
    }),

  startNewGame: async () => {
    const { draftCharacter, personalityAnswers, selectedWorldType } = get();
    if (!selectedWorldType) {
      throw new Error('請先選擇世界。');
    }
    if (!isPersonalityComplete(selectedWorldType, personalityAnswers)) {
      throw new Error('請先完成性格測試。');
    }

    const age = Number(draftCharacter.age);
    if (!draftCharacter.name.trim() || !draftCharacter.gender || !Number.isFinite(age)) {
      throw new Error('請填好姓名、性別同年齡。');
    }

    const now = new Date().toISOString();
    const traits = calculateTraitScores(selectedWorldType, personalityAnswers);
    const stats = buildCharacterStats(selectedWorldType, traits);
    const character: Character = {
      id: createId('character'),
      name: draftCharacter.name.trim(),
      gender: draftCharacter.gender,
      age,
      identity: '未定',
      title: '無名之人',
      profession: '無',
      faction: '無',
      skills: [],
      reputation: '無人識你',
      traits,
      stats,
      createdAt: now,
    };
    const world = generateWorldSeed(selectedWorldType, draftCharacter, traits);
    const worldEvents = createInitialWorldEvents(world);
    const gameBase = { character, world };
    const game: GameState = {
      id: createId('game'),
      ...gameBase,
      worldClock: createInitialWorldClock(),
      worldEvents,
      worldHistory: createInitialWorldHistory(world, worldEvents),
      rumors: createInitialRumors(world, worldEvents),
      story: createOpeningStory(gameBase),
      combat: createInitialCombat(world),
      npcs: createInitialNPCs(world),
      inventory: [],
      map: createInitialMap(world),
      quests: createInitialQuests(world),
      journal: [
        {
          id: createId('journal'),
          kind: 'system',
          text: `${character.name}喺${world.regionName}開始，但世界無因此停低。`,
          createdAt: now,
        },
      ],
      turn: 1,
      updatedAt: now,
      wallet: createInitialWallet(world),
      market: createInitialMarket(world),
      tradeHistory: [],
      storyHooks: createInitialHooks(world, createInitialNPCs(world)),
      actionLog: [],
      skillProgress: buildInitialSkillProgress(),
      professionTendencies: buildInitialTendencies(),
      mainProfession: null,
      sideProfessions: [],
      pendingProfessionUnlock: null,
      currentLocation: 'market',
    };

    await saveGameState(game);
    const saves = await listSaves();
    set({ currentScreen: 'story', game, lastSavedAt: now, saves });
  },

  selectChoice: (choiceId) =>
    set((state) => {
      if (!state.game) return { game: state.game };
      const choice = state.game.story.choices.find((item) => item.id === choiceId);
      const nextGame = resolveChoice(state.game, choiceId);
      return {
        aiNarration: null,
        aiActionRejection: null,
        game: worldTick(choice ? recordStoryChoiceForNPCs(nextGame, choice.label) : nextGame, choice?.label ?? '故事選擇'),
      };
    }),

  travelToLocation: (locationId) =>
    set((state) => {
      if (!state.game) return { game: state.game };
      const now = new Date().toISOString();
      // Unlock location if not yet known
      const updatedMap = state.game.map.map((m) =>
        m.id === locationId && m.status === '未到過' ? { ...m, status: '已知' as const } : m,
      );
      const arriveStory = buildLocationArriveStory({ ...state.game, map: updatedMap }, locationId);
      return {
        game: {
          ...state.game,
          currentLocation: locationId,
          map: updatedMap,
          story: arriveStory,
          turn: state.game.turn + 1,
          updatedAt: now,
        },
        currentScreen: 'story' as const,
      };
    }),

  setCombatActionDraft: (value) => set({ combatActionDraft: value }),

  setCombatBodyPart: (bodyPart) =>
    set((state) => ({
      game: state.game ? setCombatTarget(state.game, bodyPart) : state.game,
    })),

  executeCombatAction: (action) =>
    set((state) => {
      if (!state.game) return { game: state.game };
      const afterCombat = resolveDefaultCombatAction(state.game, action);
      const category = combatActionToCategory(action, state.game.world.type);
      const intensity = combatActionToIntensity(action);
      const success = afterCombat.combat.status !== '失敗';
      const withSkills = recordPlayerAction(afterCombat, category, intensity, success, afterCombat.world.startingPlace);
      return {
        game: worldTick(
          recordCombatForNPCs(withSkills, `有人見過你喺衝突入面用「${action}」。`),
          `戰鬥：${action}`,
        ),
      };
    }),

  executeCustomCombatAction: () =>
    set((state) => {
      if (!state.game) return { combatActionDraft: '', game: state.game };
      const actionText = state.combatActionDraft.trim();
      const afterCombat = resolveCustomCombatAction(state.game, actionText);
      const withNpcMemory = actionText
        ? recordCombatForNPCs(afterCombat, `有人記得你戰鬥時試過：「${actionText}」。`)
        : afterCombat;
      // Infer category from action text
      const inferredCategory = inferFreeActionCategory(actionText) ??
        combatActionToCategory('快攻', state.game.world.type);
      const withSkills = recordPlayerAction(withNpcMemory, inferredCategory, 'medium', true, state.game.world.startingPlace);
      return {
        combatActionDraft: '',
        game: worldTick(withSkills, actionText ? `自訂戰鬥：${actionText}` : '自訂戰鬥'),
      };
    }),

  executeItemUse: () =>
    set((state) => {
      if (!state.game) return { game: state.game };
      const afterItem = resolveItemUse(state.game);
      const withSkills = recordPlayerAction(afterItem, 'medicine', 'low', true, state.game.world.startingPlace);
      return {
        game: worldTick(
          recordCombatForNPCs(withSkills, '有人見過你喺衝突中使用道具。'),
          '戰鬥：使用道具',
        ),
      };
    }),

  interactWithNpc: (npcId, interaction) =>
    set((state) => {
      if (!state.game) return { game: state.game };
      const afterNpc = interactWithNpc(state.game, npcId, interaction);
      const category = interaction === '保持距離' ? 'stealth' : 'social';
      const intensity = interaction === '幫小忙' || interaction === '打探消息' ? 'medium' : 'low';
      const withSkills = recordPlayerAction(afterNpc, category, intensity, true, state.game.world.startingPlace, npcId);
      // 打探消息 triggers hook discovery
      const withHooks = interaction === '打探消息' ? tryDiscoverFromNpc(withSkills, npcId) : withSkills;
      return { game: worldTick(withHooks, `NPC互動：${interaction}`) };
    }),

  setFreeActionDraft: (value) => set({ freeActionDraft: value }),

  submitFreeAction: () =>
    set((state) => {
      if (!state.game) return { freeActionDraft: '', game: state.game };
      const actionText = state.freeActionDraft.trim();
      const afterStory = resolveFreeAction(state.game, actionText);
      const withNpcMemory = actionText ? recordFreeActionForNPCs(afterStory, actionText) : afterStory;
      // Infer action category from text
      const category = actionText ? inferFreeActionCategory(actionText) : null;
      const withSkills = category
        ? recordPlayerAction(withNpcMemory, category, 'low', true, state.game.world.startingPlace)
        : withNpcMemory;
      // Exploration actions trigger hook discovery
      const withHooks = category === 'exploration' ? tryDiscoverFromExploration(withSkills) : withSkills;
      return {
        freeActionDraft: '',
        aiNarration: null,
        aiActionRejection: null,
        game: worldTick(withHooks, actionText || '自由行動'),
      };
    }),

  submitFreeActionWithAI: async () => {
    const actionText = get().freeActionDraft.trim();
    // Run local engine first — always instant
    get().submitFreeAction();

    const settings = useSettingsStore.getState();
    if (!settings.aiEnabled || settings.provider === 'off' || !actionText) return;

    set({ isAiLoading: true });
    try {
      const game = get().game;
      if (!game) return;
      const provider = settings.getActiveProvider();
      const ctx = buildNarrationContext(game, actionText);
      const result = await provider.generateNarration(ctx);
      if (result.storyText) set({ aiNarration: result.storyText });
    } catch {
      // Silently ignore — local narration is always the fallback
    } finally {
      set({ isAiLoading: false });
    }
  },

  executeCustomCombatActionWithAI: async () => {
    const { combatActionDraft, game } = get();
    const actionText = combatActionDraft.trim();
    const settings = useSettingsStore.getState();

    set({ aiActionRejection: null, aiNarration: null });

    if (!settings.aiEnabled || settings.provider === 'off' || !game) {
      get().executeCustomCombatAction();
      return;
    }

    set({ isAiLoading: true });
    try {
      const provider = settings.getActiveProvider();
      const combatCtx = `第${game.combat.round}回合，敵人：${game.combat.enemy.name}（${game.combat.enemy.hp}血）`;
      const result = await provider.interpretCustomAction(
        actionText,
        combatCtx,
        game.world.type,
        { 體魄: game.character.stats.體魄, 機敏: game.character.stats.機敏 },
      );

      if (!result.valid) {
        set({ aiActionRejection: result.reason, combatActionDraft: '', isAiLoading: false });
        return;
      }

      // AI approved — run local engine
      get().executeCustomCombatAction();

      // Optionally fetch narration for the action
      const updatedGame = get().game;
      if (updatedGame && actionText) {
        const narration = await provider.generateNarration(
          buildNarrationContext(updatedGame, actionText),
        );
        if (narration.storyText) set({ aiNarration: narration.storyText });
      }
    } catch {
      // If AI call fails, fall back to local engine validation
      get().executeCustomCombatAction();
    } finally {
      set({ isAiLoading: false });
    }
  },

  interactWithNpcAndGenerateDialogue: async (npcId, interaction) => {
    // Run local engine first
    get().interactWithNpc(npcId, interaction);

    const settings = useSettingsStore.getState();
    if (!settings.aiEnabled || settings.provider === 'off') return;

    set({ isAiLoading: true });
    try {
      const game = get().game;
      const npc = game?.npcs.find((item) => item.id === npcId);
      if (!npc || !game) return;

      const provider = settings.getActiveProvider();
      const ctx = buildDialogueContext(npc, game, getInteractionLabel(interaction));
      const dialogue = await provider.generateDialogue(ctx);
      if (dialogue) {
        set((state) => ({ aiDialogue: { ...state.aiDialogue, [npcId]: dialogue } }));
      }
    } catch {
      // Silent — interaction already resolved locally
    } finally {
      set({ isAiLoading: false });
    }
  },

  dismissAiNarration: () => set({ aiNarration: null, aiActionRejection: null }),

  acceptProfession: () =>
    set((state) => ({
      game: state.game ? acceptProfession(state.game) : state.game,
    })),

  declineProfession: () =>
    set((state) => ({
      game: state.game ? declineProfession(state.game) : state.game,
    })),

  buyMarketItem: (itemId, quantity) => {
    const { game } = get();
    if (!game) return '遊戲未載入。';
    const result = buyItem(game, itemId, quantity);
    if (result.error) return result.error;
    // Record trading action for skill system
    const withSkills = recordPlayerAction(result.game, 'trading', 'medium', true, game.world.startingPlace);
    set({ game: withSkills });
    return null; // no error
  },

  sellInventoryItem: (itemName, quantity) => {
    const { game } = get();
    if (!game) return '遊戲未載入。';
    const result = sellItem(game, itemName, quantity);
    if (result.error) return result.error;
    // Herb selling also counts toward herb_gathering if applicable
    const category = result.game.market.items.find((i) => i.name === itemName)?.category;
    const actionCategory = category === '藥材' ? 'herb_gathering' : 'trading';
    const withSkills = recordPlayerAction(result.game, actionCategory, 'low', true, game.world.startingPlace);
    set({ game: withSkills });
    return null;
  },

  refreshMarket: () =>
    set((state) => {
      if (!state.game) return {};
      const safe = ensureEconomy(state.game);
      return {
        game: {
          ...safe,
          market: updateMarketPrices(safe.market, safe.worldEvents, safe.turn),
        },
      };
    }),

  saveGame: async () => {
    const game = get().game;
    if (!game) return;
    const updatedGame = { ...game, updatedAt: new Date().toISOString() };
    await saveGameState(updatedGame);
    const saves = await listSaves();
    set({ game: updatedGame, lastSavedAt: updatedGame.updatedAt, saves });
  },

  refreshSaves: async () => {
    const saves = await listSaves();
    set({ saves });
  },

  loadSave: async (id) => {
    const game = await loadGameState(id);
    if (!game) {
      throw new Error('搵唔到呢個存檔。');
    }
    const loaded = ensureHookSystem(ensureEconomy(ensureSkillSystem(ensureWorldSimulation(ensureNPCs(ensureCombat(game))))));
    set({
      game: {
        ...loaded,
        currentLocation: loaded.currentLocation ?? loaded.map[0]?.id ?? 'market',
      },
      currentScreen: 'story',
      lastSavedAt: game.updatedAt,
      selectedWorldType: game.world.type,
    });
  },

  resetRun: () =>
    set({
      activeQuestionIndex: 0,
      combatActionDraft: '',
      currentScreen: 'opening',
      draftCharacter: initialDraft,
      freeActionDraft: '',
      game: null,
      lastSavedAt: null,
      personalityAnswers: {},
      selectedWorldType: null,
    }),
}));

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function getInteractionLabel(interaction: NpcInteractionId): string {
  if (interaction === '打招呼') return '主動打招呼';
  if (interaction === '幫小忙') return '主動幫小忙';
  if (interaction === '打探消息') return '打探消息';
  return '刻意保持距離';
}
