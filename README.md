# 浮世行 (Fushi Xing)

A local-first mobile text RPG in Traditional Chinese (Cantonese). No chosen one. No forced main quest. Everything emerges from your actions.

---

## Features

- **4 World Types** — 武俠, 修仙, 末日, 無限流
- **Combat Engine** — Stamina, distance, 9 body parts, 6-level injury system
- **Living World** — World events, rumors, world history that evolves over time
- **NPC System** — NPCs with memories, relationships, and dynamic dialogue
- **Story Engine** — A–E choices plus free action resolution
- **Skill & Profession** — 10 hidden skills, 9 professions, emergent from actions
- **Economy** — 3-tier currency, dynamic market pricing, buy/sell
- **Story Hooks** — 24 hook templates, 6 stages, discovered through exploration and NPC interaction
- **Offline Mode** — Fully playable without any API key using template-based narration
- **AI Enhanced Mode** — Optional OpenAI or Claude narration/dialogue (bring your own key)

## Design Philosophy

- Player is **not** the chosen one
- No class, profession, or skill assigned at start — everything emerges from play
- No forced main quest
- No backend, no multiplayer, no cloud sync
- Local-first: SQLite on native, localStorage on web

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native + Expo ~56 |
| Language | TypeScript |
| State | Zustand |
| Storage | expo-sqlite (native) / localStorage (web) |
| AI (optional) | OpenAI API or Anthropic Claude API |

---

## Getting Started

```bash
npm install
npx expo start
```

Scan the QR code with Expo Go, or press `w` for browser preview.

No API key needed — the game runs fully offline by default.

---

## AI Enhanced Mode

If you want richer narration and NPC dialogue, go to **設定 → AI 增強模式** and enter your own OpenAI or Claude API key. Keys are stored locally on your device only.

---

## Project Structure

```
src/
  ai/          # AI providers (offline template engine + OpenAI + Claude)
  engine/      # Game logic (combat, world, NPC, story, skill, economy, hooks)
  state/       # Zustand stores
  storage/     # SQLite / localStorage repositories
  types/       # TypeScript types
App.tsx        # All screens (opening, story, combat, inventory, market, NPC, map, saves, settings)
```

---

## License

MIT
