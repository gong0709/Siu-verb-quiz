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
