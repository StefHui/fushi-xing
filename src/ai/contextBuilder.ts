// Builds minimal AI context objects from GameState.
// Strict limits enforced here — never send full history, full inventory, or all NPCs.

import type { GameState, NpcProfile } from '../types/game';
import type { DialogueContext, NarrationContext } from './aiProvider';

export function buildNarrationContext(game: GameState, playerAction: string): NarrationContext {
  // At most 5 journal entries with kind 'choice' | 'free-action' | 'npc'
  const recentMemories = game.journal
    .filter((entry) => entry.kind !== 'system' && entry.kind !== 'world')
    .slice(0, 5)
    .map((entry) => entry.text);

  // At most 3 most-recent rumors
  const activeRumors = game.rumors.slice(0, 3).map((rumor) => `[${rumor.truthState}] ${rumor.text}`);

  return {
    worldType: game.world.type,
    location: game.world.startingPlace,
    timePhase: `${game.worldClock.phase}（第${game.worldClock.day}日）`,
    tension: game.worldClock.tension,
    playerName: game.character.name,
    playerAction,
    currentBeat: game.story.title,
    recentMemories,
    activeRumors,
  };
}

export function buildDialogueContext(
  npc: NpcProfile,
  game: GameState,
  playerAction: string,
): DialogueContext {
  // Only important memories (importance >= 2), max 3
  const importantMemories = npc.memories
    .filter((memory) => memory.importance >= 2)
    .slice(0, 3)
    .map((memory) => memory.memoryText);

  // Find a rumor the NPC might know based on location match (optional)
  const relevantRumor = game.rumors.find(
    (rumor) => rumor.location === npc.location || rumor.source === 'NPC',
  )?.text;

  return {
    npcName: npc.name,
    npcRole: npc.role,
    npcMood: npc.mood,
    disposition: npc.relationship.disposition,
    trustLevel: npc.relationship.trust,
    importantMemories,
    relevantRumor,
    playerAction,
  };
}
