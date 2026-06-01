# 浮世行 (Fushi Xing) — Project Handoff

## 1. What Has Been Built

Project Wanderer is a local-first, mobile-first open-world text RPG prototype built with React Native Expo, TypeScript, Zustand, and SQLite.

Core playable loop:
- Opening screen in Traditional Chinese Cantonese.
- World type selection: `武俠`, `修仙`, `末日`, `無限流`.
- Character setup asks only for name, gender, and age.
- No class, profession, skills, faction, title, chosen-one setup, fixed ending, or forced main quest at start.
- World-specific personality test.
- Deterministic character stats and world seed generation.
- Story screen with A/B/C/D/E choices.
- Custom free action input.
- Character, inventory, map, quest, NPC, combat, world log, and save/load screens.
- Local save/load through SQLite on native platforms.
- Web preview fallback uses `localStorage`.

Implemented systems:
- Character creation and stats engine.
- Personality test engine by world type.
- World seed generator.
- Story and choice system.
- Free action system.
- Hybrid combat system:
  - Default combat buttons.
  - Custom combat input.
  - Body-part targeting.
  - Injury system.
  - Invalid action rejection.
  - Combat log.
  - No AI calculation.
- NPC memory and relationship system:
  - NPCs per world.
  - Relationship values: trust, caution, respect, familiarity.
  - Disposition states.
  - NPC memory records with importance, date, emotional effect.
- Dynamic world event simulation:
  - World clock.
  - World tension.
  - World event pressure/status/visibility.
  - World advances on story choices, free actions, combat, and NPC interactions.
- World History Log and Rumor System:
  - New `日誌` page.
  - World history records every simulated event tick.
  - Rumors may be true, false, half-true, or outdated.
  - Rumors can come from tea houses, markets, merchants, NPCs, or faction members.
  - Story page shows latest rumors.
  - Map page only shows public events and rumors, not all hidden world state.

## 2. Current File Structure

Important project files:

```text
.
├── App.tsx
├── app.json
├── index.ts
├── package.json
├── package-lock.json
├── tsconfig.json
├── HANDOFF.md
├── assets/
│   ├── icon.png
│   ├── splash-icon.png
│   ├── favicon.png
│   ├── android-icon-background.png
│   ├── android-icon-foreground.png
│   └── android-icon-monochrome.png
└── src/
    ├── data/
    │   └── personalityQuestions.ts
    ├── engine/
    │   ├── combatEngine.ts
    │   ├── npcEngine.ts
    │   ├── personalityTestEngine.ts
    │   ├── statsEngine.ts
    │   ├── storyEngine.ts
    │   ├── worldEventEngine.ts
    │   └── worldSeedGenerator.ts
    ├── state/
    │   └── useGameStore.ts
    ├── storage/
    │   └── saveRepository.ts
    └── types/
        └── game.ts
```

Generated / dependency folders:
- `node_modules/`
- `.expo/`

## 3. Important Files

`App.tsx`
- Main UI shell and all current screens.
- Screens include opening, create, personality, story, combat, NPCs, character, inventory, map, log, quest, saves.
- All interface copy is Traditional Chinese Cantonese.

`src/types/game.ts`
- Central domain model.
- Defines world types, character, stats, story, combat, NPCs, world events, world history, rumors, saves.
- Start here before changing data shape.

`src/state/useGameStore.ts`
- Zustand store.
- Orchestrates game flow and connects engines together.
- Most actions eventually update `game`.
- Important migrations happen here when loading saves via `ensureCombat`, `ensureNPCs`, and `ensureWorldSimulation`.

`src/storage/saveRepository.ts`
- Local persistence layer.
- Native: `expo-sqlite`.
- Web preview: `localStorage`.
- Save payload is serialized full `GameState`.

`src/engine/worldEventEngine.ts`
- Dynamic world simulation.
- Creates world clock, events, history entries, and rumors.
- `advanceWorld` is called after player actions.

`src/engine/npcEngine.ts`
- NPC generation, relationship deltas, memory recording, and save migration for old NPC memory shapes.

`src/engine/combatEngine.ts`
- Local deterministic combat calculations.
- Handles target body parts, default/custom actions, injury generation, invalid action rejection, enemy counter.

`src/engine/storyEngine.ts`
- Opening story, A/B/C/D/E choices, free action story updates, map and quest seeds.

`src/data/personalityQuestions.ts`
- World-specific personality test content.

## 4. Current Bugs / Known Issues

No TypeScript errors:
- `npx tsc --noEmit` currently passes.

Known issues / limitations:
- No automated unit tests yet.
- No native-device QA has been done in this handoff; most verification was Expo web preview.
- Browser preview URL is `http://localhost:8091/`; `http://localhost:8090/` may show the Expo native manifest, not the app UI.
- Bottom tab bar is crowded because there are many systems: story, combat, NPCs, character, inventory, map, log, quest, saves. Mobile UX may need grouping or a menu.
- `App.tsx` is large and should be split into screen components soon.
- Save format is full JSON payload. Good for prototype, but future migrations should be formalized.
- Combat custom input works in app, but browser automation had trouble typing due to in-app browser clipboard limitations. This is a test-tool limitation, not confirmed app logic failure.
- `npm install` previously reported moderate dependency audit warnings. They were not force-fixed to avoid breaking Expo SDK compatibility.
- World history can include undiscovered internal events marked `未證實`; design intent is okay, but UX copy may need tuning if this feels too revealing.

## 5. Recommended Next Task

Recommended next task: split the monolithic UI and stabilize save migrations.

Suggested order:
1. Split `App.tsx` into screen components under `src/screens/`.
2. Add a migration/version field to save payloads.
3. Add basic unit tests for:
   - `advanceWorld`
   - rumor generation truth states
   - NPC memory importance/emotional effect
   - combat invalid action rejection
4. Add a compact navigation pattern for mobile, because the bottom tab bar is now too crowded.
5. Add NPC dialogue snippets that reference memories:
   - If trust increased, greeting text changes.
   - If caution increased, NPC gives vaguer rumors.
   - If memory importance is 3, NPC explicitly references it.

Good next feature after cleanup:
- A `Talk` interaction screen for each NPC, using local rules only.
- It should draw from NPC memories, relationship, current world rumors, and world event visibility.

## 6. Design Decisions Already Made

Project rules:
- The player is not the chosen one.
- The world does not revolve around the player.
- The player starts with no class, no profession, no skills, no faction, and no meaningful title.
- Skills, identity, jobs, reputation, and relationships should emerge from actions.
- The player can ignore main stories and rumors.
- Early game should not be a world-ending quest.
- No AI integration yet.
- No backend, multiplayer, payment, combat economy, or full faction simulation yet.

Architecture:
- Local-first.
- Zustand owns in-memory game state.
- SQLite persists full game state on native.
- `localStorage` is only for Expo web preview.
- Engines are pure/local TypeScript modules as much as possible.
- UI is currently in `App.tsx`, but should be split soon.
- Save/load should preserve old data through `ensure*` migration helpers.

Language / UI:
- Interface language is Traditional Chinese Cantonese.
- Mobile-first, dark fantasy, text-focused, easy-to-tap buttons.
- Clean card-based layout, 8px-ish radius.
- No decorative landing page; first screen is the actual game start.

World simulation:
- Internal world events exist even if player does not act.
- Not every world event is shown directly to the player.
- Rumors are the player-facing discovery layer.
- Rumors can be true, false, half-true, or outdated.
- World history records all ticks, with discovered/undiscovered state.

NPC system:
- NPCs are not omniscient.
- NPC memories represent what they saw, heard, or experienced.
- Relationships are multidimensional, not a single affection meter.
- NPC memories include importance and emotional effect so future dialogue can reference them.

Combat:
- No AI required for basic calculation.
- Combat uses local deterministic-ish rules.
- Body part targeting affects accuracy, damage, and injury chance.
- Invalid custom actions are rejected instead of interpreted magically.

## Run / Verify

Install dependencies:

```bash
npm install
```

Type check:

```bash
npx tsc --noEmit
```

Native Expo:

```bash
npm start
```

Web preview:

```bash
npx expo start --web --localhost --port 8091
```

Open:

```text
http://localhost:8091/
```
