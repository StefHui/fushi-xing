# 浮世行 (Fushi Xing) — Next Chat Handoff

## Project
Local-first mobile text RPG. React Native Expo ~56 + TypeScript + Zustand + expo-sqlite.
Working directory: `/Users/hui/Documents/MUD Game (Codex)`
GitHub: https://github.com/StefHui/fushi-xing (public repo)
Live web: https://stefhui.github.io/fushi-xing (auto-deploys on push to main)

## What's built

| Engine | File | What it does |
|---|---|---|
| Combat v2 | `src/engine/combatEngine.ts` | Stamina, distance, 9 body parts, 6-level injury, full enemy stats |
| World events | `src/engine/worldEventEngine.ts` | `advanceWorld`, rumors, world history |
| NPC | `src/engine/npcEngine.ts` | Memories, relationships, 4 interaction types |
| Story | `src/engine/storyEngine.ts` | Choice router: work-menu / work-do / npc-talk / observe / free-move |
| Location | `src/engine/locationEngine.ts` | 6 locations per world type, scene text, work opportunities, NPC roles |
| Work | `src/engine/workEngine.ts` | 7 work actions (劈柴/搬貨/採藥/打獵/跟獵人入山/客棧幫工/跑腿), time/reward/NPC/combat |
| Skill & Profession | `src/engine/skillEngine.ts` | 10 hidden skills, 9 professions, action tracking, diminishing returns |
| Economy | `src/engine/economyEngine.ts` | 3-tier currency, 10 market items/world, dynamic pricing, buy/sell |
| Story Hooks | `src/engine/storyHookEngine.ts` | 24 hook templates (6/world), 6 stages, auto-advance, discovery via NPC/exploration |
| AI narration | `src/ai/` (5 files) | Offline template provider + OpenAI + Claude providers, contextBuilder, prompts |

## Key architecture rules
- **Never rewrite** — always extend with `ensure*` migration helpers
- Load chain: `ensureHookSystem(ensureEconomy(ensureSkillSystem(ensureWorldSimulation(ensureNPCs(ensureCombat(game))))))`
- `worldTick()` in store wraps `advanceWorld` + `advanceHooks` every 2 turns
- TypeScript must pass clean: `npx tsc --noEmit`
- All UI copy: Traditional Chinese Cantonese
- No AI for game math — AI only for narration/dialogue

## Game Mode System
- **Offline Mode** (default) — fully playable with template-based narration, no API key needed
- **AI Enhanced Mode** — optional OpenAI or Claude for narration/dialogue/action interpretation
- Settings screen (`設定`) shows mode selector at the top

## Environment Setup
| Env | App Name | Bundle ID | DB file |
|---|---|---|---|
| test | 浮世行 TEST | com.stefhui.fushixing.test | project-wanderer-test.db |
| uat | 浮世行 UAT | com.stefhui.fushixing.uat | project-wanderer-uat.db |
| production | 浮世行 | com.stefhui.fushixing | project-wanderer.db |

Switch env: `APP_ENV=uat npx expo start --web`

## Current state of App.tsx
Monolithic ~2450 lines. All screens in one file — most urgent tech debt.
Screens: opening, create, personality, story, character, inventory, market, map, quest, npcs, combat, log, saves, settings.

**Bottom tab bar (5 tabs):** 故事 / 地圖 / 角色 / 背包 / 日誌
人物 and 戰鬥 removed from tabs — they appear inside story flow.

## Story Flow (as designed)
- Story is the main screen
- Choices are contextual by `story.phase`: work-menu → job list → job result → follow-up
- NPC dialogue happens inline in story (no separate tab needed)
- Inline combat panel appears when `game.combat.status === '進行中'`
- Map tab shows tappable locations with 📍 current location marker
- Stat strip shows: character stats / money / current location / stamina

## GameState fields (recent additions)
- `currentLocation: string` — current location ID (migrated in loadGame)
- `story.phase?: StoryPhase` — 'scene' | 'work-menu' | 'work-result' | 'npc-talk' | 'location-arrive'
- `story.activeNpcId?: string` — NPC in focus during npc-talk

## Story choice ID format
Choice IDs encode routing:
- `work-menu::<locationId>` → show work menu
- `work-do::<workId>::<locationId>` → execute work action
- `npc-talk::<npcId>` → inline NPC dialogue
- `observe::<locationId>` → observation scene
- `back-to-scene::<locationId>` → return to location
- `free-move` → hint player to open map tab

## Local dev
```bash
cd "/Users/hui/Documents/MUD Game (Codex)"
npx expo start --web        # localhost:8081
```
Claude Code preview: `.claude/launch.json` configured for port 8081.

## Known issues / next tasks
1. **Split App.tsx** into `src/screens/` — most urgent tech debt
2. `npc-ask-work` and `npc-ask-rumor` in storyEngine.ts are stubbed — need real resolution
3. Story hooks start undiscovered — early game feels sparse
4. Save format has no version field yet
5. iPhone: Expo Go incompatible with SDK 56; need Xcode (USB) or EAS build

## Design rules (never break these)
- Player is NOT the chosen one
- No class/profession/skill at start — everything emerges from actions
- No forced main quest
- No backend, no multiplayer, no AI for game math
- Local-first, SQLite on native / localStorage on web
- DB file name stays `project-wanderer.db` for production (changing it orphans existing saves)
