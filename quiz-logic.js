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
