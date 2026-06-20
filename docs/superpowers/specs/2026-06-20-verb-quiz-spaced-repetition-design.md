# Verb Quiz — Spaced-Repetition Rounds + Reset + Hosting

Date: 2026-06-20

Files:
- Modify: `verb-quiz.html` (UI, wiring, persistence, mobile)
- Create: `quiz-logic.js` (pure spaced-repetition logic, UMD: browser + Node)
- Create: `quiz-logic.test.js` (Node built-in test runner)
- Create: `index.html` (redirect to `verb-quiz.html` for a clean hosted URL)

## Goal

Replace the current "retry only wrong words each round" loop with a spaced-repetition
scheme driven by a single mastery rule; add a reset button; persist progress to
`localStorage` plus file export/import; add a usage/how-it-works panel to the setup
screen; keep the layout intact on phones; deploy to GitHub Pages.

## Core Algorithm

### Per-problem state (keyed by parsed-list index)
- `streak`: consecutive correct answers within the current cycle. Counts only rounds
  where the problem was actually presented (excluded rounds do not change it).
- `mastered`: whether the problem is excluded for the rest of the current cycle.

### Global state
- `cycleIndex`: 1, 2, 3, … (a "cycle" = one full pass that ends at 100점).
- `roundInCycle`: round number within the current cycle (1-based).
- `starCount`: cumulative stars (unchanged from current app).

### Mastery decision (evaluated immediately after each answer)
- correct → `streak++`; wrong → `streak = 0`.
- If `cycleIndex >= 2 && roundInCycle == 1 && correct` → mastered
  (single correct re-confirms a previously-cleared deck).
- Else if `streak >= 2` → mastered.
- `mastered` is sticky within a cycle; a mastered problem is not presented again, so it
  cannot flip back to false mid-cycle.

### Round pool (computed at round start)
Include a problem iff `mastered == false`.

This single rule + the mastery decision reproduces the full spec:

| Round | Presented set | Why |
|---|---|---|
| Cycle 1, R1 | all | none mastered at start |
| Cycle 1, R2 | all | max streak after R1 is 1 (< 2), cycle 1 has no 1-correct rule |
| Cycle 1, R3 | wrong-at-least-once in R1/R2 | those correct in both reached streak 2 → mastered |
| Cycle 1, R4+ | not mastered | streak-2 exclusion continues, pool shrinks |
| → all mastered | (pool empty) | 100점 trigger |
| Cycle 2+, R1 | all | streaks/mastered reset at cycle start |
| Cycle 2+, R2 | wrong in R1 | R1-correct → mastered via 1-correct rule |
| Cycle 2+, R3+ | not mastered | streak-2 exclusion until all mastered |

### 100점 / cycle transition
- After a round finishes, if every problem is `mastered` → show the 100점 celebration
  screen (confetti + sound) with a `다음 단계 ▶` button.
- `다음 단계 ▶` starts the next cycle: `cycleIndex++`, reset every problem to
  `streak = 0, mastered = false`, run a full round.
- If not all mastered → show a round-summary banner (mastered N / remaining M) with a
  `다음 회차 ▶` button that increments `roundInCycle` and starts the next round.

## Persistence

### Auto-save (localStorage, key `verbquiz.v1`)
Payload: `listText`, `progress` (array of `{streak, mastered}`), `cycleIndex`,
`roundInCycle`, `starCount`, `roundIds` (fixed indices for the in-progress round),
`idx` (cursor), `results` (per-answer outcome map for the in-progress round).
- Save after **every answer** so a mid-round reload resumes at the same cursor.
- `streak`/`mastered` are committed only at round end (round set is pinned via
  `roundIds`, keeping the pool consistent across a mid-round reload).
- On app load, if a saved game exists the setup screen shows `이어하기 ▶ (라벨)`
  alongside `시작하기 ▶`. `시작하기 ▶` always starts fresh from the textarea and
  overwrites the save; `이어하기 ▶` restores and resumes at the saved cursor.

### Export / Import (file — cross-device)
- **Export**: serialize the current save payload to JSON and download it as
  `verb-quiz-save.json` (Blob + anchor `download`). Available during the quiz and on
  the 100점 screen.
- **Import**: a file picker reads a `.json` save with `FileReader`, validates it
  (`listText` is a string and `progress` is an array), restores state, writes it to
  `localStorage`, and resumes. Available on the setup screen.
- File export/import is the cross-device path; it also works where `file://`
  `localStorage` is restricted.

## Mobile / Responsive

The existing layout is already responsive (viewport meta, fluid `max-width:620px`,
≥16px inputs). New controls must not break narrow screens:
- Button rows (`setup` actions, top-bar controls, `done` actions) use `flex-wrap`
  so they wrap instead of overflowing.
- Top-bar `리셋` / `내보내기` buttons are compact (small padding, short labels).
- `@media (max-width: 360px)`: stack the 과거형 / 과거분사 inputs vertically.
- Verification includes a responsive check at 320–390px width.

## Hosting / Deployment (GitHub Pages)

- Public repo `Siu-verb-quiz` under account `gong0709`, created via `gh`.
- All asset paths are relative (`<script src="quiz-logic.js">`), so the app works over
  `http(s)` and from a subpath.
- `index.html` redirects (`meta refresh`) to `verb-quiz.html` for a clean root URL.
- Enable Pages on the default branch root via `gh`; site updates on every push.
- Public URL: `https://gong0709.github.io/Siu-verb-quiz/`.

## UI Changes (summary)

- **Setup**: `시작하기 ▶`; conditional `이어하기 ▶`; `파일 불러오기` (import); a
  usage / how-it-works panel below the buttons (styled like `.card` / `.hint`).
- **Top bar (during quiz)**: compact `리셋` and `내보내기` buttons, always visible.
- **Round tag**: cycle + round via `roundLabel`, e.g. `2바퀴 3회차` (cycle 1 →
  `3회차`).
- **Done screen**: 100점 celebration with `다음 단계 ▶`, `내보내기`, and `리셋 🔄`.

## Preserved (unchanged)

Mascot reactions, Web Audio sounds, confetti, speech synthesis, list parsing
(space/comma/tab split, `/` alternatives), star display logic.

## Out of Scope

- No backend, no accounts, no automatic cross-device sync (manual export/import only).
- No change to the verb list content or parsing format.
- Mid-round visual history of answered cards is not restored on reload; only the cursor
  position within the round is (the next unanswered question is shown).
