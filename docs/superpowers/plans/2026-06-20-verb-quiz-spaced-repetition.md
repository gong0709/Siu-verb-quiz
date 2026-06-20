# Verb Quiz — Spaced Repetition + Reset + Hosting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `verb-quiz.html` into a spaced-repetition trainer (mastery = 2 consecutive correct, cycles that restart at 100점), with a reset button, localStorage + file export/import persistence, a usage panel, mobile-safe layout, and GitHub Pages hosting.

**Architecture:** Pure round/mastery logic lives in a new `quiz-logic.js` (UMD: usable as a browser global `window.VerbQuizLogic` and as a Node `require`), unit-tested with Node's built-in test runner. `verb-quiz.html` keeps all DOM/audio/animation and now consumes the logic module, persists state, and gains reset / export / import / usage UI. An `index.html` redirect gives a clean hosted URL. Hosting is GitHub Pages on a public repo; every push redeploys.

**Tech Stack:** Vanilla JS (ES5 style to match the existing file), no build step, no runtime dependencies. Node 22 `node --test` for logic tests. `gh` CLI for repo creation + Pages.

## Global Constraints

- Match the existing code style: `var`, function declarations, no arrow functions, no ES modules. App is loaded via classic `<script src>` so it works over both `file://` and `http(s)`.
- No external libraries, no bundler, no framework.
- All asset paths relative (`<script src="quiz-logic.js">`).
- UI strings are Korean (the app is a Korean kids' quiz). Code identifiers/comments English.
- `quiz-logic.js` must be both `require`-able in Node (`module.exports`) and a browser global (`window.VerbQuizLogic`).
- Preserve existing features unchanged: Web Audio sounds, speech synthesis, confetti, mascot reactions, list parsing (space/comma/tab split + `/` alternatives), star display.
- Mastery rule (verbatim from spec): correct → `streak++`, wrong → `streak=0`; mastered if (`cycleIndex>=2 && roundInCycle==1 && correct`) or `streak>=2`; round pool = problems with `mastered==false`; 100점 = all problems mastered.
- Hosting: public repo `Siu-verb-quiz` under `gong0709`, GitHub Pages from `main` branch root. Public URL `https://gong0709.github.io/Siu-verb-quiz/`.

---

### Task 0: Git repo + GitHub Pages skeleton

**Files:**
- Create: `index.html`
- Repo: initialize git, create `Siu-verb-quiz` on GitHub, enable Pages

- [ ] **Step 1: Initialize git on main**

Run:
```bash
cd /Users/gong0709/Project/siu
git init -b main
```
Expected: `Initialized empty Git repository ...`

- [ ] **Step 2: Create `index.html` redirect**

Create `/Users/gong0709/Project/siu/index.html`:
```html
<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta http-equiv="refresh" content="0; url=verb-quiz.html">
<title>동사 변신 놀이 🦊</title>
</head>
<body><a href="verb-quiz.html">동사 변신 놀이 시작하기 ▶</a></body>
</html>
```

- [ ] **Step 3: Add a `.gitignore`**

Create `/Users/gong0709/Project/siu/.gitignore`:
```
.DS_Store
```

- [ ] **Step 4: Initial commit**

Run:
```bash
cd /Users/gong0709/Project/siu
git add -A
git commit -m "chore: initial commit — verb quiz + redirect + docs"
```
Expected: a commit is created listing `verb-quiz.html`, `index.html`, `.gitignore`, `docs/...`.

- [ ] **Step 5: Create the GitHub repo and push**

Run:
```bash
gh repo create Siu-verb-quiz --public --source=/Users/gong0709/Project/siu --remote=origin --push
```
Expected: repo created and `main` pushed. Verify: `gh repo view gong0709/Siu-verb-quiz --web` (or `gh repo view`).

- [ ] **Step 6: Enable GitHub Pages (main / root)**

Run:
```bash
gh api -X POST repos/gong0709/Siu-verb-quiz/pages -f "source[branch]=main" -f "source[path]=/"
```
Expected: JSON with `"status"` and an `html_url` of `https://gong0709.github.io/Siu-verb-quiz/`. If it returns `409` (already exists), run the same with `-X PUT` instead.

- [ ] **Step 7: Confirm the site is reachable**

Wait ~1–2 min for the first build, then:
```bash
curl -sS -o /dev/null -w "%{http_code}\n" https://gong0709.github.io/Siu-verb-quiz/
```
Expected: `200` (may be `404` for the first minute while Pages builds — retry). Opening the URL should redirect to the current `verb-quiz.html`.

---

### Task 1: Pure spaced-repetition logic module (`quiz-logic.js`) + tests

**Files:**
- Create: `quiz-logic.js`
- Test: `quiz-logic.test.js`

**Interfaces:**
- Produces (consumed by Task 2+):
  - `makeProgress(n) -> Array<{streak:number, mastered:boolean}>`
  - `applyAnswer(entry, correct:boolean, cycleIndex:number, roundInCycle:number) -> {streak, mastered}`
  - `poolFor(progress) -> number[]` (indices where `mastered === false`)
  - `allMastered(progress) -> boolean` (false for empty array)
  - `startCycle(progress) -> Array<{streak:0, mastered:false}>` (same length)
  - `roundLabel(cycleIndex, roundInCycle) -> string`
  - Browser global `window.VerbQuizLogic`; Node `module.exports` — same object.

- [ ] **Step 1: Write the failing tests**

Create `/Users/gong0709/Project/siu/quiz-logic.test.js`:
```js
"use strict";
var test = require("node:test");
var assert = require("node:assert");
var L = require("./quiz-logic.js");

test("makeProgress creates zeroed entries", function () {
  assert.deepStrictEqual(L.makeProgress(2), [
    { streak: 0, mastered: false },
    { streak: 0, mastered: false }
  ]);
});

test("cycle 1: two consecutive correct masters", function () {
  var e = { streak: 0, mastered: false };
  e = L.applyAnswer(e, true, 1, 1);
  assert.deepStrictEqual(e, { streak: 1, mastered: false });
  e = L.applyAnswer(e, true, 1, 2);
  assert.deepStrictEqual(e, { streak: 2, mastered: true });
});

test("cycle 1: wrong resets streak, no mastery", function () {
  var e = L.applyAnswer({ streak: 1, mastered: false }, false, 1, 2);
  assert.deepStrictEqual(e, { streak: 0, mastered: false });
});

test("cycle >=2 first round: single correct masters", function () {
  var e = L.applyAnswer({ streak: 0, mastered: false }, true, 2, 1);
  assert.strictEqual(e.mastered, true);
});

test("cycle >=2 first round: wrong does not master", function () {
  var e = L.applyAnswer({ streak: 0, mastered: false }, false, 2, 1);
  assert.deepStrictEqual(e, { streak: 0, mastered: false });
});

test("cycle >=2 later round: needs two consecutive", function () {
  var e = L.applyAnswer({ streak: 0, mastered: false }, true, 2, 2);
  assert.strictEqual(e.mastered, false);
  e = L.applyAnswer(e, true, 2, 3);
  assert.strictEqual(e.mastered, true);
});

test("poolFor returns non-mastered indices", function () {
  var p = [
    { streak: 2, mastered: true },
    { streak: 0, mastered: false },
    { streak: 1, mastered: false }
  ];
  assert.deepStrictEqual(L.poolFor(p), [1, 2]);
});

test("allMastered: true only when every entry mastered; false on empty", function () {
  assert.strictEqual(L.allMastered([{ mastered: true }, { mastered: true }]), true);
  assert.strictEqual(L.allMastered([{ mastered: true }, { mastered: false }]), false);
  assert.strictEqual(L.allMastered([]), false);
});

test("startCycle resets streak/mastered, preserves length", function () {
  var p = [{ streak: 2, mastered: true }, { streak: 1, mastered: false }];
  assert.deepStrictEqual(L.startCycle(p), [
    { streak: 0, mastered: false },
    { streak: 0, mastered: false }
  ]);
});

test("roundLabel formats cycle and round", function () {
  assert.strictEqual(L.roundLabel(1, 3), "3회차");
  assert.strictEqual(L.roundLabel(2, 1), "2바퀴 1회차");
});

test("integration: pools follow the spec across two cycles", function () {
  var p = L.makeProgress(3); // 0,1,2
  function round(cycleIndex, roundInCycle, answers) {
    var pool = L.poolFor(p);
    pool.forEach(function (idx) {
      p[idx] = L.applyAnswer(p[idx], !!answers[idx], cycleIndex, roundInCycle);
    });
    return pool;
  }
  // Cycle 1
  assert.deepStrictEqual(round(1, 1, { 0: true, 1: true, 2: false }), [0, 1, 2]);
  assert.deepStrictEqual(round(1, 2, { 0: true, 1: false, 2: true }), [0, 1, 2]);
  assert.deepStrictEqual(round(1, 3, { 1: true, 2: true }), [1, 2]); // 0 mastered
  assert.deepStrictEqual(round(1, 4, { 1: true }), [1]);             // 2 mastered
  assert.strictEqual(L.allMastered(p), true);                        // 100점
  // Cycle 2
  p = L.startCycle(p);
  assert.deepStrictEqual(round(2, 1, { 0: true, 1: false, 2: true }), [0, 1, 2]);
  assert.deepStrictEqual(round(2, 2, { 1: true }), [1]);             // only r1-wrong (1)
  assert.deepStrictEqual(round(2, 3, { 1: true }), [1]);
  assert.strictEqual(L.allMastered(p), true);
});
```

- [ ] **Step 2: Run the tests to confirm they fail**

Run:
```bash
cd /Users/gong0709/Project/siu && node --test quiz-logic.test.js
```
Expected: FAIL — `Cannot find module './quiz-logic.js'`.

- [ ] **Step 3: Implement `quiz-logic.js`**

Create `/Users/gong0709/Project/siu/quiz-logic.js`:
```js
(function (root) {
  "use strict";

  function makeProgress(n) {
    var a = [];
    for (var i = 0; i < n; i++) a.push({ streak: 0, mastered: false });
    return a;
  }

  function applyAnswer(entry, correct, cycleIndex, roundInCycle) {
    var streak = correct ? entry.streak + 1 : 0;
    var justMastered = correct &&
      ((cycleIndex >= 2 && roundInCycle === 1) || streak >= 2);
    return { streak: streak, mastered: entry.mastered || justMastered };
  }

  function poolFor(progress) {
    var out = [];
    for (var i = 0; i < progress.length; i++) {
      if (!progress[i].mastered) out.push(i);
    }
    return out;
  }

  function allMastered(progress) {
    return progress.length > 0 && progress.every(function (e) { return e.mastered; });
  }

  function startCycle(progress) {
    return progress.map(function () { return { streak: 0, mastered: false }; });
  }

  function roundLabel(cycleIndex, roundInCycle) {
    return (cycleIndex >= 2 ? cycleIndex + "바퀴 " : "") + roundInCycle + "회차";
  }

  var api = {
    makeProgress: makeProgress,
    applyAnswer: applyAnswer,
    poolFor: poolFor,
    allMastered: allMastered,
    startCycle: startCycle,
    roundLabel: roundLabel
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.VerbQuizLogic = api;
})(typeof self !== "undefined" ? self : this);
```

- [ ] **Step 4: Run the tests to confirm they pass**

Run:
```bash
cd /Users/gong0709/Project/siu && node --test quiz-logic.test.js
```
Expected: PASS — all tests, `# pass 11`, `# fail 0`.

- [ ] **Step 5: Commit and push**

Run:
```bash
cd /Users/gong0709/Project/siu
git add quiz-logic.js quiz-logic.test.js
git commit -m "feat: pure spaced-repetition logic module + tests"
git push
```

---

### Task 2: Wire HTML to the logic engine (rounds, cycles, localStorage, 100점)

**Files:**
- Modify: `verb-quiz.html` (include logic script; replace round-control engine; add persistence; rewire start; replace done screen)

**Interfaces:**
- Consumes: `window.VerbQuizLogic` from Task 1.
- Produces (used by Tasks 3–5): globals `words`, `progress`, `cycleIndex`, `roundInCycle`, `starCount`, `listTextSaved`, `round`; functions `save()`, `load()`, `startRound()`, `startGameFresh(text)`, `resumeGame(saved)` (added Task 4), `showQuiz()`, `nextCycle()`, `resetGame()` (added Task 3); DOM ids `nextCycleBtn`, `doneTitle`, `doneMsg`.

- [ ] **Step 1: Include the logic module before the main script**

In `verb-quiz.html`, find:
```html
<script>
(function () {
  "use strict";
```
Replace with:
```html
<script src="quiz-logic.js"></script>
<script>
(function () {
  "use strict";
```

- [ ] **Step 2: Replace the state globals**

Find:
```js
  var state = null;
  var starCount = 0;
```
Replace with:
```js
  var L = window.VerbQuizLogic;
  var STORE_KEY = "verbquiz.v1";
  var words = [];          // parsed full list
  var progress = [];       // [{streak, mastered}] by index
  var cycleIndex = 1;
  var roundInCycle = 1;
  var starCount = 0;
  var listTextSaved = "";
  var round = null;        // { ids:[], idx:0, results:{} }
```

- [ ] **Step 3: Replace `addStar` with star-text helpers**

Find:
```js
  function addStar() {
    starCount++;
    starsEl.textContent = "⭐".repeat(Math.min(starCount, 12)) + (starCount > 12 ? " ×" + starCount : "");
  }
```
Replace with:
```js
  function starText() {
    if (starCount <= 0) return "";
    return "⭐".repeat(Math.min(starCount, 12)) + (starCount > 12 ? " ×" + starCount : "");
  }
  function addStar() { starCount++; starsEl.textContent = starText(); }
```

- [ ] **Step 4: Replace the round-control engine**

Find the block that starts at:
```js
  // ---------- round control ----------
  function startRound(words, roundNo) {
```
…and ends at the close of `finishRound` (the lines through):
```js
    banner.querySelector(".retryBtn").addEventListener("click", function () {
      startRound(wrongWords, nextNo);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }
```
Replace the entire `startRound` → `finishRound` region with the following. (Leave `presentHtml`, `slotHtml`, and `escapeHtml` exactly as they are — they live just after this region and are reused below.)
```js
  // ---------- persistence ----------
  function currentSaveObject() {
    return {
      listText: listTextSaved,
      progress: progress,
      cycleIndex: cycleIndex,
      roundInCycle: roundInCycle,
      starCount: starCount,
      roundIds: round ? round.ids : [],
      idx: round ? round.idx : 0,
      results: round ? round.results : {}
    };
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(currentSaveObject())); } catch (e) {}
  }
  function load() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)); } catch (e) { return null; }
  }

  // ---------- round control ----------
  function showQuiz() {
    setupEl.classList.add("hidden");
    doneEl.classList.add("hidden");
    quizEl.classList.remove("hidden");
  }

  function setRoundTag() {
    document.getElementById("roundTag").textContent = L.roundLabel(cycleIndex, roundInCycle);
  }

  function updateBar() {
    var total = round ? round.ids.length : 0;
    var idx = round ? round.idx : 0;
    document.getElementById("count").textContent = idx + " / " + total;
    document.getElementById("progFill").style.width = (total ? idx / total * 100 : 0) + "%";
  }

  function startGameFresh(text) {
    var parsed = parseList(text);
    if (parsed.length === 0) { alert("동사 목록을 입력해요! 한 줄에 '현재 과거 과거분사'."); return; }
    words = parsed;
    listTextSaved = text;
    cycleIndex = 1; roundInCycle = 1; starCount = 0;
    progress = L.makeProgress(words.length);
    showQuiz();
    startRound();
  }

  function startRound() {
    round = { ids: shuffle(L.poolFor(progress)), idx: 0, results: {} };
    streamEl.innerHTML = "";
    setRoundTag();
    starsEl.textContent = starText();
    updateBar();
    save();
    nextQuestion();
  }

  function nextQuestion() {
    if (round.idx >= round.ids.length) { finishRound(); return; }
    var w = words[round.ids[round.idx]];

    var card = document.createElement("div");
    card.className = "card in";
    card.innerHTML =
      '<div>' + presentHtml(w) + '</div>' +
      '<div class="fields">' +
        '<div class="field"><label>과거형</label>' +
          '<input type="text" autocomplete="off" autocapitalize="off" autocorrect="off" class="i-past"></div>' +
        '<div class="field"><label>과거분사</label>' +
          '<input type="text" autocomplete="off" autocapitalize="off" autocorrect="off" class="i-pp"></div>' +
      '</div>';
    streamEl.appendChild(card);

    var iPast = card.querySelector(".i-past");
    var iPp   = card.querySelector(".i-pp");
    card.querySelector(".speak").addEventListener("click", function () { speak(w.present); });
    iPast.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); iPp.focus(); }
    });
    iPp.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); submit(card, w, iPast.value, iPp.value); }
    });
    iPast.focus();
    card.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function submit(card, w, pastVal, ppVal) {
    var okPast = check(pastVal, w.past);
    var okPp   = check(ppVal, w.pp);
    var allOk  = okPast && okPp;
    round.results[round.ids[round.idx]] = allOk;

    var msg = allOk ? PRAISE[Math.floor(Math.random() * PRAISE.length)]
                    : CHEER[Math.floor(Math.random() * CHEER.length)];
    card.className = "card " + (allOk ? "correct" : "wrong");
    card.innerHTML =
      '<div>' + presentHtml(w) + '</div>' +
      '<div class="result-row">' +
        slotHtml("과거형", pastVal, w.past, okPast) +
        slotHtml("과거분사", ppVal, w.pp, okPp) +
      '</div>' +
      '<div class="verdict ' + (allOk ? "ok" : "no") + '">' + (allOk ? "✓ " : "✗ ") + msg + '</div>';
    card.querySelector(".speak").addEventListener("click", function () { speak(w.present); });

    if (allOk) { soundCorrect(); confetti(); addStar(); }
    else { soundWrong(); speak(w.present); }
    mascotReact(allOk);

    round.idx++;
    updateBar();
    save();
    nextQuestion();
  }

  function finishRound() {
    round.ids.forEach(function (id) {
      progress[id] = L.applyAnswer(progress[id], !!round.results[id], cycleIndex, roundInCycle);
    });
    round = null;
    updateBar();

    if (L.allMastered(progress)) { showDone(); save(); return; }

    var remaining = L.poolFor(progress).length;
    var masteredCount = progress.length - remaining;
    save();

    var banner = document.createElement("div");
    banner.className = "card in center";
    banner.innerHTML =
      '<div style="font-size:40px">🐣</div>' +
      '<p style="margin:8px 0 12px;font-size:17px">마스터 <b>' + masteredCount + '</b>개 · 남은 단어 <b>' + remaining + '</b>개</p>' +
      '<button class="nextBtn">다음 회차 ▶</button>';
    streamEl.appendChild(banner);
    banner.scrollIntoView({ behavior: "smooth", block: "center" });
    banner.querySelector(".nextBtn").addEventListener("click", function () {
      roundInCycle++;
      startRound();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  function showDone() {
    quizEl.classList.add("hidden");
    doneEl.classList.remove("hidden");
    document.getElementById("doneTitle").textContent = "🏆 100점!";
    document.getElementById("doneMsg").textContent =
      "별 " + starCount + "개! " + cycleIndex + "바퀴 완성 — 전부 마스터했어요!";
    confetti(); setTimeout(confetti, 350); soundCorrect();
  }

  function nextCycle() {
    cycleIndex++;
    roundInCycle = 1;
    progress = L.startCycle(progress);
    showQuiz();
    startRound();
    window.scrollTo({ top: 0 });
  }
```

- [ ] **Step 5: Replace the done-screen button**

In the `<!-- DONE -->` section, find:
```html
      <div class="center"><button class="ghost" id="restartBtn">다시 놀기 🔄</button></div>
```
Replace with:
```html
      <div class="center" id="doneBtns">
        <button id="nextCycleBtn">다음 단계 ▶</button>
      </div>
```

- [ ] **Step 6: Rewire the start button (remove old restart handler)**

Find the wiring block:
```js
  document.getElementById("startBtn").addEventListener("click", function () {
    var words = parseList(document.getElementById("listInput").value);
    if (words.length === 0) { alert("동사 목록을 입력해요! 한 줄에 '현재 과거 과거분사'."); return; }
    audio(); // unlock sound on first gesture
    starCount = 0; starsEl.textContent = "";
    setupEl.classList.add("hidden");
    quizEl.classList.remove("hidden");
    startRound(words, 1);
  });

  document.getElementById("restartBtn").addEventListener("click", function () {
    doneEl.classList.add("hidden");
    setupEl.classList.remove("hidden");
    window.scrollTo({ top: 0 });
  });
```
Replace with:
```js
  document.getElementById("startBtn").addEventListener("click", function () {
    audio(); // unlock sound on first gesture
    startGameFresh(document.getElementById("listInput").value);
  });
  document.getElementById("nextCycleBtn").addEventListener("click", nextCycle);
```

- [ ] **Step 7: Manually verify the engine (deterministic 3-verb run)**

Run a local http server (so `localStorage` works):
```bash
cd /Users/gong0709/Project/siu && python3 -m http.server 8000
```
Open `http://localhost:8000/verb-quiz.html`, clear the textarea, paste:
```
go went gone 가다
eat ate eaten 먹다
run ran run 달리다
```
Click 시작하기, then verify each step:
- R1 (tag `1회차`, 3 questions): go ✓, eat ✓, run ✗ → banner shows `마스터 0개 · 남은 단어 3개`.
- 다음 회차 → R2 (3 questions): go ✓, eat ✗, run ✓ → banner `마스터 1개 · 남은 단어 2개`.
- 다음 회차 → R3 (2 questions: eat, run): eat ✓, run ✓ → banner `마스터 2개 · 남은 단어 1개`.
- 다음 회차 → R4 (1 question: eat): eat ✓ → done screen `🏆 100점!`, message `... 1바퀴 완성 ...`.
- 다음 단계 → cycle 2 R1 (tag `2바퀴 1회차`, 3 questions): all ✓ → done screen again, message `... 2바퀴 완성 ...`.

Stop the server with Ctrl-C when done. Expected: every banner count and round tag matches the above.

- [ ] **Step 8: Commit and push**

Run:
```bash
cd /Users/gong0709/Project/siu
git add verb-quiz.html
git commit -m "feat: spaced-repetition engine with cycles, 100점, localStorage save"
git push
```

---

### Task 3: Reset button (top bar + done screen)

**Files:**
- Modify: `verb-quiz.html` (top-bar controls, done-screen control, `resetGame`, CSS)

**Interfaces:**
- Consumes: `words`, `progress`, `cycleIndex`, `roundInCycle`, `starCount`, `showQuiz()`, `startRound()`, `L.makeProgress` from Task 2.
- Produces: `resetGame()`; DOM ids `resetBtn`, `doneResetBtn`; container class `.topbtns`, button class `.mini` (used by Task 5).

- [ ] **Step 1: Add the top-bar controls container**

In the `<!-- QUIZ -->` section, find:
```html
        <div class="meta">
          <div class="stars" id="stars"></div>
          <div class="progress"><i id="progFill"></i></div>
          <div class="countline">
            <span class="round-tag" id="roundTag">1회차</span>
            <span id="count">0 / 0</span>
          </div>
        </div>
      </div>
```
Replace with:
```html
        <div class="meta">
          <div class="stars" id="stars"></div>
          <div class="progress"><i id="progFill"></i></div>
          <div class="countline">
            <span class="round-tag" id="roundTag">1회차</span>
            <span id="count">0 / 0</span>
          </div>
        </div>
        <div class="topbtns">
          <button id="resetBtn" class="ghost mini">리셋</button>
        </div>
      </div>
```

- [ ] **Step 2: Add a reset button to the done screen**

Find:
```html
      <div class="center" id="doneBtns">
        <button id="nextCycleBtn">다음 단계 ▶</button>
      </div>
```
Replace with:
```html
      <div class="center" id="doneBtns">
        <button id="nextCycleBtn">다음 단계 ▶</button>
        <button class="ghost" id="doneResetBtn">리셋 🔄</button>
      </div>
```

- [ ] **Step 3: Add CSS for the controls**

In the `<style>` block, immediately after the existing `.round-tag { ... }` rule, add:
```css
  .topbtns { display: flex; flex-wrap: wrap; gap: 6px; align-items: flex-start; }
  button.mini { padding: 8px 12px; font-size: 13px; box-shadow: 0 3px 0 #4f6ad6; }
  button.mini:active { box-shadow: 0 1px 0 #4f6ad6; }
```

- [ ] **Step 4: Implement `resetGame` and wire it**

After the `nextCycle` function (added in Task 2), add:
```js
  function resetGame() {
    if (!confirm("처음(1회차)부터 다시 시작할까요? 진행 기록과 별이 초기화됩니다.")) return;
    cycleIndex = 1; roundInCycle = 1; starCount = 0;
    progress = L.makeProgress(words.length);
    showQuiz();
    starsEl.textContent = "";
    startRound();
    window.scrollTo({ top: 0 });
  }
```
Then in the wiring section, after the `nextCycleBtn` line, add:
```js
  document.getElementById("resetBtn").addEventListener("click", resetGame);
  document.getElementById("doneResetBtn").addEventListener("click", resetGame);
```

- [ ] **Step 5: Manually verify reset**

Start `python3 -m http.server 8000`, open `http://localhost:8000/verb-quiz.html`, start the 3-verb deck, answer R1 partly (earn some stars and advance to R2). Click 리셋 (top bar) → confirm dialog → after OK: round tag returns to `1회차`, stars cleared, all 3 verbs presented again. Reach the done screen once more and verify 리셋 🔄 there does the same. Ctrl-C the server.

- [ ] **Step 6: Commit and push**

```bash
cd /Users/gong0709/Project/siu
git add verb-quiz.html
git commit -m "feat: reset button (top bar + done screen)"
git push
```

---

### Task 4: Resume saved game (이어하기)

**Files:**
- Modify: `verb-quiz.html` (setup buttons, `resumeGame`, startup wiring)

**Interfaces:**
- Consumes: `load()`, `save()`, `showQuiz()`, `startRound()`, `setRoundTag()`, `starText()`, `updateBar()`, `nextQuestion()`, `parseList`, `L.makeProgress`, `L.roundLabel`.
- Produces: `resumeGame(saved)` (used by Task 5 import); DOM id `resumeBtn`.

- [ ] **Step 1: Add the resume button to the setup screen**

In the `<!-- SETUP -->` section, find:
```html
    <div class="center"><button id="startBtn">시작하기 ▶</button></div>
```
Replace with:
```html
    <div class="center" id="setupBtns">
      <button id="startBtn">시작하기 ▶</button>
      <button id="resumeBtn" class="ghost hidden"></button>
    </div>
```

- [ ] **Step 2: Implement `resumeGame`**

After the `resetGame` function, add:
```js
  function resumeGame(saved) {
    var parsed = parseList(saved.listText || "");
    if (parsed.length === 0) { alert("저장된 목록을 읽을 수 없어요."); return; }
    words = parsed;
    listTextSaved = saved.listText;
    progress = (saved.progress && saved.progress.length === parsed.length)
      ? saved.progress : L.makeProgress(parsed.length);
    cycleIndex = saved.cycleIndex || 1;
    roundInCycle = saved.roundInCycle || 1;
    starCount = saved.starCount || 0;
    showQuiz();
    if (saved.roundIds && saved.roundIds.length) {
      round = { ids: saved.roundIds, idx: saved.idx || 0, results: saved.results || {} };
      streamEl.innerHTML = "";
      setRoundTag();
      starsEl.textContent = starText();
      updateBar();
      nextQuestion();
    } else {
      startRound();
    }
  }
```

- [ ] **Step 3: Show the resume button on load if a save exists**

In the wiring section, after the reset wiring lines, add:
```js
  (function initResume() {
    var saved = load();
    if (!saved || !saved.listText) return;
    var rb = document.getElementById("resumeBtn");
    rb.textContent = "이어하기 ▶ (" + L.roundLabel(saved.cycleIndex || 1, saved.roundInCycle || 1) + ")";
    rb.classList.remove("hidden");
    rb.addEventListener("click", function () { audio(); resumeGame(load()); });
  })();
```

- [ ] **Step 4: Manually verify resume**

Start `python3 -m http.server 8000`, open the page, start the 3-verb deck, answer the first verb of R1, then **reload the page** (browser refresh). Expected: the setup screen now shows an `이어하기 ▶ (1회차)` button. Click it → quiz resumes at the second verb of R1 (the first answer is not re-asked), stars preserved. Advance to R2, reload, 이어하기 should read `이어하기 ▶ (2회차)`. Ctrl-C the server.

- [ ] **Step 5: Commit and push**

```bash
cd /Users/gong0709/Project/siu
git add verb-quiz.html
git commit -m "feat: resume saved game (이어하기)"
git push
```

---

### Task 5: Export / Import save file

**Files:**
- Modify: `verb-quiz.html` (export buttons, import control, `exportSave`/`importSave`, wiring)

**Interfaces:**
- Consumes: `currentSaveObject()`, `resumeGame(saved)`, `STORE_KEY`, `.topbtns`, `.mini`, `#doneBtns`, `#setupBtns`.
- Produces: `exportSave()`, `importSave(file)`; DOM ids `exportBtn`, `doneExportBtn`, `importBtn`, `importFile`.

- [ ] **Step 1: Add export buttons (top bar + done screen)**

In the top-bar `.topbtns` container, after the reset button, add:
```html
          <button id="exportBtn" class="ghost mini">내보내기</button>
```
In `#doneBtns`, after `doneResetBtn`, add:
```html
        <button class="ghost" id="doneExportBtn">내보내기</button>
```

- [ ] **Step 2: Add the import control to the setup screen**

In `#setupBtns`, after `resumeBtn`, add:
```html
      <button id="importBtn" class="ghost">파일 불러오기</button>
      <input type="file" id="importFile" accept="application/json,.json" class="hidden">
```

- [ ] **Step 3: Implement export/import**

After `resumeGame`, add:
```js
  function exportSave() {
    var data = JSON.stringify(currentSaveObject(), null, 2);
    var blob = new Blob([data], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = "verb-quiz-save.json";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function importSave(file) {
    var reader = new FileReader();
    reader.onload = function () {
      var saved;
      try { saved = JSON.parse(reader.result); } catch (e) { alert("올바른 저장 파일이 아니에요."); return; }
      if (!saved || typeof saved.listText !== "string" || !Array.isArray(saved.progress)) {
        alert("저장 파일 형식이 올바르지 않아요."); return;
      }
      try { localStorage.setItem(STORE_KEY, JSON.stringify(saved)); } catch (e) {}
      resumeGame(saved);
    };
    reader.readAsText(file);
  }
```

- [ ] **Step 4: Wire export/import**

In the wiring section, after the resume wiring, add:
```js
  document.getElementById("exportBtn").addEventListener("click", exportSave);
  document.getElementById("doneExportBtn").addEventListener("click", exportSave);
  document.getElementById("importBtn").addEventListener("click", function () {
    document.getElementById("importFile").click();
  });
  document.getElementById("importFile").addEventListener("change", function (e) {
    if (e.target.files && e.target.files[0]) { importSave(e.target.files[0]); e.target.value = ""; }
  });
```

- [ ] **Step 5: Manually verify export/import round-trip**

Start `python3 -m http.server 8000`, open the page, start the 3-verb deck, advance to R2 (so progress is non-trivial), click 내보내기 → a `verb-quiz-save.json` downloads. Click 리셋 to wipe, then on the setup screen click 파일 불러오기 and pick the downloaded file. Expected: the quiz resumes at the same round/state captured at export (round tag `2회차`, same remaining verbs). Open the JSON in a text editor and confirm it has `listText`, `progress`, `cycleIndex`, `roundInCycle`. Ctrl-C the server.

- [ ] **Step 6: Commit and push**

```bash
cd /Users/gong0709/Project/siu
git add verb-quiz.html
git commit -m "feat: export/import save file for cross-device transfer"
git push
```

---

### Task 6: Usage / how-it-works panel + mobile responsiveness

**Files:**
- Modify: `verb-quiz.html` (setup usage panel, responsive CSS)

**Interfaces:**
- Consumes: existing `.card` / `.hint` styles, `#setupBtns`, `.fields`, `.mascot-row`.
- Produces: none (UI/CSS only).

- [ ] **Step 1: Add the usage / how-it-works panel below the setup buttons**

In the `<!-- SETUP -->` section, find the closing of the setup buttons block:
```html
      <button id="importBtn" class="ghost">파일 불러오기</button>
      <input type="file" id="importFile" accept="application/json,.json" class="hidden">
    </div>
  </section>
```
Replace with:
```html
      <button id="importBtn" class="ghost">파일 불러오기</button>
      <input type="file" id="importFile" accept="application/json,.json" class="hidden">
    </div>

    <div class="card howto">
      <b>📖 사용법</b>
      <ul>
        <li>한 줄에 동사 하나: <code>현재 과거 과거분사 (뜻)</code></li>
        <li>과거형·과거분사 칸에 답을 적고 <b>Enter</b></li>
        <li>🔊 버튼으로 발음을 들을 수 있어요</li>
        <li>진행 상황은 자동 저장 — 다음에 <b>이어하기</b>로 계속</li>
        <li>다른 기기로 옮기려면 <b>내보내기 / 파일 불러오기</b></li>
        <li>처음부터 다시 하려면 위쪽 <b>리셋</b> 버튼</li>
      </ul>
      <b>🧠 작동 원리</b>
      <ul>
        <li>한 단어를 <b>연속 2번</b> 맞히면 잠시 쉬어가요(제외)</li>
        <li>틀린 단어는 맞힐 때까지 계속 나와요</li>
        <li>남은 단어가 0개가 되면 <b>100점</b> 🎉 → 전체를 한 바퀴 더!</li>
        <li>2바퀴부터는 첫 회차에 1번만 맞혀도 통과, 틀리면 다시 2번 연속 필요</li>
      </ul>
    </div>
  </section>
```

- [ ] **Step 2: Add responsive CSS**

In the `<style>` block, immediately before the closing `@media (prefers-reduced-motion: reduce) { ... }` rule, add:
```css
  .mascot-row { flex-wrap: wrap; }
  #setupBtns, #doneBtns { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; }
  .howto ul { margin: 8px 0 14px; padding-left: 20px; font-size: 14px; line-height: 1.6; }
  .howto ul:last-child { margin-bottom: 0; }
  .howto code { background: #fff2e2; color: var(--accent); padding: 1px 6px; border-radius: 6px; }
  @media (max-width: 360px) { .fields { flex-direction: column; } }
```

- [ ] **Step 3: Manually verify content + responsiveness**

Start `python3 -m http.server 8000`, open the page. On the setup screen confirm the 📖 사용법 and 🧠 작동 원리 panel renders below the buttons. Open browser devtools responsive mode and set width to 320px and 390px:
- Setup buttons wrap instead of overflowing horizontally.
- Start a round; the top-bar 리셋/내보내기 buttons wrap under the progress bar without overflow.
- At ≤360px the 과거형/과거분사 inputs stack vertically; above that they sit side by side.
No horizontal page scroll at any width. Ctrl-C the server.

- [ ] **Step 4: Commit and push**

```bash
cd /Users/gong0709/Project/siu
git add verb-quiz.html
git commit -m "feat: usage/how-it-works panel + mobile-responsive controls"
git push
```

---

### Task 7: Final live verification (desktop + phone)

**Files:** none (verification only)

- [ ] **Step 1: Confirm the deployed site serves the latest build**

```bash
curl -sS https://gong0709.github.io/Siu-verb-quiz/verb-quiz.html | grep -c "quiz-logic.js"
```
Expected: `1` (the deployed page includes the logic module). If `0`, wait ~1 min for the Pages build and retry.

- [ ] **Step 2: Desktop smoke test on the live URL**

Open `https://gong0709.github.io/Siu-verb-quiz/`. Confirm it redirects to the quiz, run the deterministic 3-verb scenario from Task 2 Step 7 once, refresh mid-round and use 이어하기, and confirm export downloads a file. (localStorage and downloads are reliable on this https origin.)

- [ ] **Step 3: Phone test**

Open the same URL on a phone browser. Confirm: no broken layout / no horizontal scroll, inputs do not trigger zoom on focus, buttons are tappable, a round can be completed, and refresh + 이어하기 resumes. Note any layout issue for a follow-up fix.

- [ ] **Step 4: Record the live URL**

Confirm the final URL works and share it: `https://gong0709.github.io/Siu-verb-quiz/`.

---

## Self-Review

**Spec coverage:**
- Algorithm (mastery, pool, cycles, 100점): Task 1 (logic + tests) + Task 2 (engine). ✓
- 100점 = all mastered → next cycle: Task 2 `finishRound`/`showDone`/`nextCycle`. ✓
- Reset to round 1, wipe progress/stars: Task 3. ✓
- localStorage auto-save + resume: Task 2 (`save`) + Task 4 (`resumeGame`, init). ✓
- Export/import file: Task 5. ✓
- Usage/how-it-works panel: Task 6. ✓
- Mobile responsiveness: Task 6 (CSS) + Task 7 (phone verify). ✓
- Hosting (GitHub Pages, `Siu-verb-quiz`, index.html redirect, relative paths): Task 0 + Task 7. ✓
- Preserve sounds/speech/confetti/mascot/parsing: untouched regions; Task 2 reuses `presentHtml`/`slotHtml`/`check`/`parseList`/`shuffle`. ✓

**Placeholder scan:** No TBD/TODO; every code step has full code; every test/verify step has commands + expected results. ✓

**Type/name consistency:** `save`/`load`/`currentSaveObject`/`startRound`/`resumeGame`/`showQuiz`/`nextCycle`/`resetGame`/`exportSave`/`importSave`/`starText`/`setRoundTag` defined in Task 2/3/4/5 and referenced consistently. DOM ids (`nextCycleBtn`, `resetBtn`, `doneResetBtn`, `resumeBtn`, `exportBtn`, `doneExportBtn`, `importBtn`, `importFile`) created in HTML and wired by the same names. Logic API names match Task 1 exports. ✓
