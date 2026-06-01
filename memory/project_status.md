---
name: project-status
description: Current build state of 浮世行 (Fushi Xing) — all engines, screens, and architecture as of session end
metadata:
  type: project
---

# 浮世行 (Fushi Xing) — Project Status

Project renamed from "Project Wanderer". English codename: Fushi Xing / Project Fushi.
Stack: React Native Expo ~56, TypeScript, Zustand, expo-sqlite.
Working directory: /Users/hui/Documents/MUD Game (Codex)

**Why:** Local-first mobile text RPG. Player is not the chosen one. No class/skill/faction at start. Everything emerges from actions.

**How to apply:** Always read HANDOFF.md first. TypeScript must pass clean (`npx tsc --noEmit`) before finishing any task. Never rewrite the app — always extend existing engines with backward-compat migration helpers.

## Engines built (all in src/engine/)

| Engine | File | Key exports |
|---|---|---|
| Combat v2 | combatEngine.ts | stamina, distance, 9 body parts, 6-level injury, enemy stats |
| World events | worldEventEngine.ts | advanceWorld, rumor system, world history |
| NPC | npcEngine.ts | memories, relationships, 4 interaction types |
| Story | storyEngine.ts | A-E choices, free action resolution |
| Personality test | personalityTestEngine.ts | per-world-type questions |
| Stats | statsEngine.ts | character stat derivation |
| World seed | worldSeedGenerator.ts | deterministic world generation |
| Skill & Profession | skillEngine.ts | 10 skills, 9 professions, action tracking, diminishing returns |
| Economy | economyEngine.ts | 3-tier currency, market items (10/world), dynamic pricing, buy/sell |
| Story Hook | storyHookEngine.ts | 24 hook templates (6/world), 6 stages, auto-advance, discovery system |
| AI narration | ai/ (4 files) | OpenAI + Claude providers, context builder, prompts, offProvider |

## State (src/state/)

- `useGameStore.ts` — main game store. Uses `worldTick()` helper (wraps advanceWorld + advanceHooks every 2 turns).
- `useSettingsStore.ts` — AI provider settings, persisted via settingsRepository

## Storage (src/storage/)

- `saveRepository.ts` — expo-sqlite (native) / localStorage (web). DB name: `project-wanderer.db` (kept for save compat)
- `settingsRepository.ts` — same DB, separate `settings` table

## Screens (all in App.tsx — not yet split into components)

opening, create, personality, story, character, inventory, market, map, quest, npcs, combat, log, saves, settings

Market is accessed via button in inventory screen (not a tab — tab bar already crowded with 9 tabs).

## Key GameState fields added in this session

- `storyHooks: StoryHook[]` — 5 active hooks per new game
- `wallet: Currency` — copper integer
- `market: Market` — 10 items, dynamic prices
- `tradeHistory: TradeRecord[]`
- `actionLog: ActionRecord[]` — last 100 actions for skill tracking
- `skillProgress: Record<string, SkillRecord>` — 10 skills, hidden until discovered
- `professionTendencies: Record<string, number>` — 9 professions, 0-100
- `mainProfession / sideProfessions / pendingProfessionUnlock`

## Migration pattern

Every load goes through a chain of `ensure*` helpers:
```
ensureHookSystem(ensureEconomy(ensureSkillSystem(ensureWorldSimulation(ensureNPCs(ensureCombat(game))))))
```

## Known issues / next steps (from HANDOFF.md)

- App.tsx is a monolith (~2200 lines) — needs splitting into src/screens/
- Tab bar is crowded (9 tabs) — needs grouping or menu
- No unit tests
- AI narration works but API calls happen client-side (no backend yet)
- Story hook discovery is working but hooks start undiscovered — player needs to actively interact to find them
