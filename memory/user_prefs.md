---
name: user-prefs
description: How this user likes to work — pace, scope, style preferences observed across the session
metadata:
  type: user
---

# User Working Style

**Task scope:** User gives large, detailed spec documents as tasks. They want full implementation — not a plan, not a skeleton. Write all files completely.

**Pace:** Ships fast. Multiple major engines in one session. Don't ask for confirmation before starting — just read the codebase, plan briefly in writing, then implement.

**Scope discipline:** User explicitly says "do not rewrite the app" and "continue from current codebase." Always extend, never replace. Backward-compat migration helpers (`ensure*` pattern) are expected.

**TypeScript:** Must pass `npx tsc --noEmit` clean before reporting done. Run it after every major set of changes.

**Language:** All UI copy in Traditional Chinese Cantonese. Keep this strictly — no Mandarin, no English in the game UI.

**Architecture:** Local-first, no backend, no multiplayer, no AI for game math. AI only for narration/dialogue (optional layer).

**No bloat:** No comments explaining what code does. No extra abstractions. No "future-proofing." Three similar lines > premature abstraction.

**Feedback signals:**
- User rarely pushes back on implementation choices — they redirect with a new task if something needs changing.
- When user says "font 轉一轉 好難睇" — they want targeted style fixes, not a full redesign.
- User reads HANDOFF.md actively and trusts it as the source of truth for project state.
