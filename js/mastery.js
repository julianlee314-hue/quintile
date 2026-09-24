/**
 * Quintile mastery + spaced repetition.
 *
 * Earn rule: THREE correct in a row ("triple play") — not 4/5 or a single hit.
 * SRS after earn: 7d → 30d → 180d (6 months). Any mistake on review → RED (lapsed);
 * must triple-play again to recover, then restart SRS at the 7-day stage.
 *
 * Per-skill shape on profile.progress.mastery[skillId]:
 *   { streak, status, earnedAt, nextReviewAt, srsStage: 0|1|2|3, lapsedAt? }
 *
 * status: 'learning' | 'earned' | 'due' | 'lapsed' | 'secure'
 * srsStage: 0 = not yet in SRS / after recovery pending first interval,
 *           1 = waiting/passed 7d, 2 = 30d, 3 = 180d cleared (long-secure)
 */
(function (global) {
  "use strict";

  var INTERVALS_MS = [
    7 * 24 * 60 * 60 * 1000, // stage 0→1 after earn
    30 * 24 * 60 * 60 * 1000, // stage 1→2
    180 * 24 * 60 * 60 * 1000, // stage 2→3 (6 months)
  ];
  var TRIPLE = 3;

  function emptyMastery() {
    return {
      streak: 0,
      status: "learning",
      earnedAt: null,
      nextReviewAt: null,
      srsStage: 0,
      lapsedAt: null,
      reviewStreak: 0,
    };
  }

  function ensureProgressMastery(progress) {
    if (!progress.mastery || typeof progress.mastery !== "object") progress.mastery = {};
    return progress;
  }

  function readProgress() {
    if (global.QuintileAccount && QuintileAccount.readProgress) {
      return ensureProgressMastery(QuintileAccount.readProgress());
    }
    try {
      var raw = localStorage.getItem("quire-progress");
      if (!raw) return ensureProgressMastery({ questions: {}, skills: {}, topics: {}, history: [], days: [], notes: {} });
      var o = JSON.parse(raw);
      var p = o && o.state ? o.state : o;
      return ensureProgressMastery(p || {});
    } catch (e) {
      return ensureProgressMastery({});
    }
  }

  function writeProgress(progress) {
    if (global.QuintileAccount && QuintileAccount.readProgress) {
      // Use account helper envelope-aware write
      try {
        var raw = localStorage.getItem("quire-progress");
        if (raw) {
          var o = JSON.parse(raw);
          if (o && o.state && typeof o.version !== "undefined") {
            o.state = progress;
            localStorage.setItem("quire-progress", JSON.stringify(o));
          } else {
            localStorage.setItem("quire-progress", JSON.stringify(progress));
          }
        } else {
          localStorage.setItem("quire-progress", JSON.stringify(progress));
        }
      } catch (e) {
        localStorage.setItem("quire-progress", JSON.stringify(progress));
      }
      if (QuintileAccount.syncProgressIntoActive) QuintileAccount.syncProgressIntoActive();
      return;
    }
    localStorage.setItem("quire-progress", JSON.stringify(progress));
  }

  function getSkill(skillId) {
    var p = readProgress();
    return p.mastery[skillId] ? Object.assign(emptyMastery(), p.mastery[skillId]) : emptyMastery();
  }

  function saveSkill(skillId, m) {
    var p = readProgress();
    ensureProgressMastery(p);
    p.mastery[skillId] = m;
    // Keep legacy skills[] roughly in sync so old Progress UI still has a signal
    if (!p.skills) p.skills = {};
    var legacy = p.skills[skillId] || {
      lastCorrect: 0,
      lastTotal: 0,
      bestCorrect: 0,
      runs: 0,
      mastered: false,
      updatedAt: Date.now(),
    };
    legacy.mastered = m.status === "earned" || m.status === "due" || m.status === "secure";
    legacy.updatedAt = Date.now();
    if (m.status === "secure" || m.status === "earned") {
      legacy.bestCorrect = Math.max(legacy.bestCorrect || 0, TRIPLE);
    }
    p.skills[skillId] = legacy;
    writeProgress(p);
    try {
      global.dispatchEvent(new CustomEvent("quintile-mastery", { detail: { skillId: skillId, mastery: m } }));
    } catch (e) {}
    return m;
  }

  function now() {
    return Date.now();
  }

  function refreshDue(m) {
    if (!m) return m;
    if (m.status === "earned" || m.status === "due") {
      if (m.nextReviewAt && now() >= new Date(m.nextReviewAt).getTime()) {
        m.status = "due";
      }
    }
    return m;
  }

  function celebrate(skillId, kind) {
    var title = skillId;
    try {
      // Prefer human title from skills data cache if present
      if (global.__quintileSkillTitles && global.__quintileSkillTitles[skillId]) {
        title = global.__quintileSkillTitles[skillId];
      }
    } catch (e) {}
    showCelebration(title, kind || "earn");
  }

  function showCelebration(title, kind) {
    var existing = document.getElementById("q-mastery-celebrate");
    if (existing) existing.remove();
    var overlay = document.createElement("div");
    overlay.id = "q-mastery-celebrate";
    overlay.setAttribute("role", "status");
    overlay.style.cssText =
      "position:fixed;inset:0;z-index:400;pointer-events:none;display:flex;align-items:center;justify-content:center;";
    var toast = document.createElement("div");
    toast.style.cssText =
      "pointer-events:auto;background:#1c1915;color:#fbf8f3;padding:1rem 1.5rem;border-radius:1rem;" +
      "font-family:Fraunces,Georgia,serif;font-size:1.25rem;box-shadow:0 20px 50px rgba(0,0,0,.25);text-align:center;max-width:20rem;";
    toast.innerHTML =
      "<div style='font-size:1.75rem;margin-bottom:.35rem'>" +
      (kind === "recover" ? "🔥" : "✨") +
      "</div>" +
      "<div>" +
      (kind === "recover" ? "Back on the board" : "Triple play!") +
      "</div>" +
      "<div style='font-size:.875rem;font-family:Figtree,sans-serif;opacity:.8;margin-top:.35rem'></div>";
    toast.querySelectorAll("div")[2].textContent = title;
    overlay.appendChild(toast);

    // Confetti bursts
    var colors = ["#b8432f", "#3d7a4a", "#e8a020", "#2a6f8f", "#5b3f8c", "#fbf8f3"];
    for (var i = 0; i < 48; i++) {
      var p = document.createElement("i");
      var x = 50 + (Math.random() * 60 - 30);
      var delay = Math.random() * 0.35;
      var dur = 0.9 + Math.random() * 0.8;
      p.style.cssText =
        "position:absolute;left:" +
        x +
        "%;top:45%;width:8px;height:10px;border-radius:2px;background:" +
        colors[i % colors.length] +
        ";animation:qConfetti " +
        dur +
        "s ease-out " +
        delay +
        "s forwards;opacity:0";
      overlay.appendChild(p);
    }
    if (!document.getElementById("q-confetti-style")) {
      var st = document.createElement("style");
      st.id = "q-confetti-style";
      st.textContent =
        "@keyframes qConfetti{0%{opacity:1;transform:translate(0,0) rotate(0)}100%{opacity:0;transform:translate(var(--dx,0),var(--dy,120px)) rotate(720deg)}}" +
        "@media (prefers-reduced-motion:reduce){#q-mastery-celebrate i{display:none!important}}";
      document.head.appendChild(st);
    }
    overlay.querySelectorAll("i").forEach(function (el) {
      el.style.setProperty("--dx", Math.random() * 200 - 100 + "px");
      el.style.setProperty("--dy", 80 + Math.random() * 160 + "px");
    });
    document.body.appendChild(overlay);

    // Optional soft chime — respects mute / reduced motion by skipping
    try {
      if (!global.matchMedia("(prefers-reduced-motion: reduce)").matches && global.AudioContext) {
        var muted = localStorage.getItem("quintile-mute-sfx") === "1";
        if (!muted) {
          var ctx = new (global.AudioContext || global.webkitAudioContext)();
          var o = ctx.createOscillator();
          var g = ctx.createGain();
          o.type = "sine";
          o.frequency.value = kind === "recover" ? 523.25 : 659.25;
          g.gain.value = 0.04;
          o.connect(g);
          g.connect(ctx.destination);
          o.start();
          setTimeout(function () {
            o.frequency.value = kind === "recover" ? 659.25 : 783.99;
          }, 120);
          setTimeout(function () {
            g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3);
            o.stop(ctx.currentTime + 0.32);
            ctx.close();
          }, 280);
        }
      }
    } catch (e) {}

    setTimeout(function () {
      overlay.remove();
    }, 2800);
  }

  /**
   * Record one item outcome for a skill.
   * @returns {{ mastery, justEarned, justRecovered, justLapsed, srsPassed }}
   */
  function recordItem(skillId, correct, meta) {
    if (!skillId) return null;
    var m = refreshDue(getSkill(skillId));
    var justEarned = false;
    var justRecovered = false;
    var justLapsed = false;
    var srsPassed = false;
    var wasLapsed = m.status === "lapsed";
    var wasDue = m.status === "due";

    if (correct) {
      m.streak = (m.streak || 0) + 1;

      if (m.status === "learning" || m.status === "lapsed" || !m.status) {
        if (m.streak >= TRIPLE) {
          m.status = "earned";
          m.earnedAt = new Date().toISOString();
          m.lapsedAt = null;
          m.srsStage = 0;
          m.nextReviewAt = new Date(now() + INTERVALS_MS[0]).toISOString();
          m.reviewStreak = 0;
          if (wasLapsed) justRecovered = true;
          else justEarned = true;
        } else {
          m.status = wasLapsed ? "lapsed" : "learning";
          // While recovering from lapsed, keep status lapsed until triple completes
          if (wasLapsed && m.streak < TRIPLE) m.status = "lapsed";
          else if (!wasLapsed) m.status = "learning";
        }
      } else if (m.status === "due" || m.status === "earned" || m.status === "secure") {
        // Review session: require triple play of correct answers while due
        if (wasDue || m.status === "due") {
          m.reviewStreak = (m.reviewStreak || 0) + 1;
          m.status = "due";
          if (m.reviewStreak >= TRIPLE) {
            // Advance SRS stage
            var stage = m.srsStage || 0;
            if (stage < 2) {
              m.srsStage = stage + 1;
              m.nextReviewAt = new Date(now() + INTERVALS_MS[m.srsStage]).toISOString();
              m.status = "earned";
              m.reviewStreak = 0;
              srsPassed = true;
            } else {
              // Cleared 6-month review → long-secure
              m.srsStage = 3;
              m.nextReviewAt = null;
              m.status = "secure";
              m.reviewStreak = 0;
              srsPassed = true;
            }
          }
        } else {
          // Practice while not due — keep streak but don't advance SRS
          m.streak = Math.min(m.streak, TRIPLE);
        }
      }
    } else {
      // Wrong answer
      m.streak = 0;
      m.reviewStreak = 0;
      if (m.status === "due" || m.status === "earned" || m.status === "secure") {
        // Any mistake on review (or while earned/secure practice counts as review fail if due)
        // Spec: any mistake on a review → RED. If not due, wrong during casual practice only resets streak.
        if (wasDue || m.status === "due") {
          m.status = "lapsed";
          m.lapsedAt = new Date().toISOString();
          m.nextReviewAt = null;
          m.srsStage = 0;
          justLapsed = true;
        }
      } else if (m.status === "learning" || m.status === "lapsed") {
        // streak already 0; remain learning/lapsed
      }
    }

    saveSkill(skillId, m);

    if (justEarned) celebrate(skillId, "earn");
    if (justRecovered) celebrate(skillId, "recover");

    // Points hooks (provisional)
    if (global.QuintilePoints) {
      try {
        if (correct) QuintilePoints.award("attempt_correct", { ref: skillId, meta: meta });
        else QuintilePoints.award("attempt_wrong", { ref: skillId, meta: meta });
        if (justEarned) QuintilePoints.award("earn", { ref: skillId });
        if (justRecovered) QuintilePoints.award("recover", { ref: skillId });
        if (srsPassed) QuintilePoints.award("srs_pass", { ref: skillId, stage: m.srsStage });
      } catch (e) {}
    }

    return { mastery: m, justEarned: justEarned, justRecovered: justRecovered, justLapsed: justLapsed, srsPassed: srsPassed };
  }

  function getTreeState(skillId) {
    var m = refreshDue(getSkill(skillId));
    // Persist due flip if needed
    if (m.status === "due" && getSkill(skillId).status !== "due") saveSkill(skillId, m);
    return m.status || "learning";
  }

  function allMastery() {
    var p = readProgress();
    var out = {};
    Object.keys(p.mastery || {}).forEach(function (k) {
      out[k] = refreshDue(Object.assign(emptyMastery(), p.mastery[k]));
    });
    return out;
  }

  // Wire into attempt logger
  var prevAttempt = global.__quintileAttempt;
  global.__quintileAttempt = function (payload) {
    var result = null;
    if (typeof prevAttempt === "function") {
      result = prevAttempt(payload);
    } else if (global.QuintileAttempts && QuintileAttempts.log) {
      result = QuintileAttempts.log(payload);
    }
    try {
      if (payload && payload.skillId && typeof payload.correct === "boolean") {
        // Only count skill-item (and dojo) checks toward triple-play, not run-level aggregates
        var kind = payload.kind || "";
        if (kind === "skill-item" || kind === "dojo" || kind.indexOf("dojo") >= 0) {
          recordItem(payload.skillId, !!payload.correct, payload.meta || null);
        }
      }
    } catch (e) {
      console.warn("[mastery]", e);
    }
    return result;
  };

  global.QuintileMastery = {
    TRIPLE: TRIPLE,
    INTERVALS_MS: INTERVALS_MS,
    getSkill: getSkill,
    recordItem: recordItem,
    getTreeState: getTreeState,
    allMastery: allMastery,
    celebrate: celebrate,
    emptyMastery: emptyMastery,
    refreshDue: refreshDue,
  };
})(window);
