/**
 * Quintile question extract modes.
 *
 * Mode 1 — Practice (adaptive):
 *   Correct → raise difficulty one step (easy→medium→hard, clamp top)
 *   Mistake → drop one step (clamp easy)
 *   Persist progress.practiceLevel[skillId] = 'easy'|'medium'|'hard'
 *   Triple-play / SRS mastery still applies via mastery.js (Practice drives earn streak).
 *
 * Mode 2 — Exam (fixed):
 *   User picks Easy/Medium/Hard at start; level does NOT step during the run.
 *   Scored like a paper; attempts kind:'exam' with meta.mode='exam'.
 *   Does not update practiceLevel. Earn/streak primarily from Practice.
 *   Optional: all-correct Exam while skill is due → treat as SRS review pass.
 *
 * Banks: prefer data/skills_emh.json (120 EMH-tagged); fallback skills.json + skills_stage_bands.json.
 */
(function (global) {
  "use strict";

  var LEVELS = ["easy", "medium", "hard"];
  var MODES = { PRACTICE: "practice", EXAM: "exam" };
  var BANK = null; // { skillId: { title, items:[{id,stage,prompt,...}] } }
  var BASE = global.__QUINTILE_BASE__ || "";

  function url(p) {
    return (p.charAt(0) === "/" ? BASE + p : BASE + "/" + p);
  }

  function readProgress() {
    if (global.QuintileAccount && QuintileAccount.readProgress) {
      return QuintileAccount.readProgress();
    }
    try {
      var raw = localStorage.getItem("quire-progress");
      if (!raw) return {};
      var o = JSON.parse(raw);
      return o && o.state ? o.state : o;
    } catch (e) {
      return {};
    }
  }

  function writeProgress(progress) {
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
    if (global.QuintileAccount && QuintileAccount.syncProgressIntoActive) {
      QuintileAccount.syncProgressIntoActive();
    }
  }

  function ensureMaps(p) {
    if (!p.practiceLevel || typeof p.practiceLevel !== "object") p.practiceLevel = {};
    if (!p.questionMode) p.questionMode = MODES.PRACTICE;
    if (!p.examLevel || typeof p.examLevel !== "object") p.examLevel = {};
    return p;
  }

  function getMode() {
    var p = ensureMaps(readProgress());
    return p.questionMode === MODES.EXAM ? MODES.EXAM : MODES.PRACTICE;
  }

  function setMode(mode) {
    var p = ensureMaps(readProgress());
    p.questionMode = mode === MODES.EXAM ? MODES.EXAM : MODES.PRACTICE;
    writeProgress(p);
    try {
      global.dispatchEvent(new CustomEvent("quintile-mode", { detail: { mode: p.questionMode } }));
    } catch (e) {}
    return p.questionMode;
  }

  function getPracticeLevel(skillId) {
    var p = ensureMaps(readProgress());
    var lv = p.practiceLevel[skillId] || "easy";
    return LEVELS.indexOf(lv) >= 0 ? lv : "easy";
  }

  function setPracticeLevel(skillId, level) {
    var p = ensureMaps(readProgress());
    p.practiceLevel[skillId] = LEVELS.indexOf(level) >= 0 ? level : "easy";
    writeProgress(p);
    return p.practiceLevel[skillId];
  }

  function getExamLevel(skillId) {
    var p = ensureMaps(readProgress());
    var lv = p.examLevel[skillId] || getPracticeLevel(skillId);
    return LEVELS.indexOf(lv) >= 0 ? lv : "medium";
  }

  function setExamLevel(skillId, level) {
    var p = ensureMaps(readProgress());
    p.examLevel[skillId] = LEVELS.indexOf(level) >= 0 ? level : "medium";
    writeProgress(p);
    return p.examLevel[skillId];
  }

  function stepLevel(current, correct) {
    var i = LEVELS.indexOf(current);
    if (i < 0) i = 0;
    if (correct) i = Math.min(LEVELS.length - 1, i + 1);
    else i = Math.max(0, i - 1);
    return LEVELS[i];
  }

  /** Call after a Practice-mode item check. Does NOT run for Exam. */
  function onPracticeOutcome(skillId, correct) {
    if (!skillId) return null;
    if (getMode() !== MODES.PRACTICE && !(arguments[2] && arguments[2].forcePractice)) return null;
    var cur = getPracticeLevel(skillId);
    var next = stepLevel(cur, !!correct);
    setPracticeLevel(skillId, next);
    return { from: cur, to: next };
  }

  function ingestTopics(list) {
    (Array.isArray(list) ? list : (list && list.topics) || []).forEach(function (t) {
      BANK[t.id] = {
        id: t.id,
        title: t.title,
        blurb: t.blurb,
        hlLink: t.hlLink,
        courseId: t.courseId,
        era: t.era,
        defaultMode: t.defaultMode,
        difficultyBand: t.difficultyBand,
        itemCount: t.itemCount || (t.items || []).length,
        items: (t.items || []).map(function (it) {
          return Object.assign({}, it, {
            stage: it.stage || LEVELS[(it.difficulty || 1) - 1] || "easy",
          });
        }),
      };
    });
  }

  function loadBank(cb) {
    if (BANK) {
      cb && cb(BANK);
      return Promise.resolve(BANK);
    }
    return fetch(url("/data/skills_emh.json"))
      .then(function (r) {
        if (!r.ok) throw new Error("emh " + r.status);
        return r.json();
      })
      .then(function (list) {
        BANK = {};
        ingestTopics(list);
        global.__quintileBank = BANK;
        return fetch(url("/data/isomorphic_banks.json"))
          .then(function (r) {
            if (!r.ok) return null;
            return r.json();
          })
          .catch(function () {
            return null;
          })
          .then(function (iso) {
            if (iso) ingestTopics(iso);
            return fetch(url("/data/banks/index.json"))
              .then(function (r) {
                if (!r.ok) return null;
                return r.json();
              })
              .catch(function () {
                return null;
              })
              .then(function (idx) {
                if (!idx || !idx.eras) {
                  cb && cb(BANK);
                  return BANK;
                }
                var names = Object.keys(idx.eras);
                return Promise.all(
                  names.map(function (era) {
                    return fetch(url("/data/banks/era-" + era + ".json"))
                      .then(function (r) {
                        return r.ok ? r.json() : null;
                      })
                      .catch(function () {
                        return null;
                      });
                  })
                ).then(function (packs) {
                  packs.forEach(function (pack) {
                    if (pack) ingestTopics(pack);
                  });
                  BANK.__eraIndex = idx;
                  global.__quintileBank = BANK;
                  cb && cb(BANK);
                  return BANK;
                });
              });
          });
      })
      .catch(function () {
        // Fallback: flat 40 + bands
        return Promise.all([
          fetch(url("/data/skills.json")).then(function (r) {
            return r.json();
          }),
          fetch(url("/data/skills_stage_bands.json"))
            .then(function (r) {
              return r.json();
            })
            .catch(function () {
              return { items: {} };
            }),
        ]).then(function (pair) {
          var flat = pair[0];
          var bands = pair[1].items || {};
          BANK = {};
          (flat.topics || []).forEach(function (t) {
            var items = (flat.items || []).filter(function (it) {
              return it.id.indexOf(t.id + "-") === 0;
            });
            BANK[t.id] = {
              id: t.id,
              title: t.title,
              blurb: t.blurb,
              hlLink: t.hlLink,
              items: items.map(function (it) {
                var b = bands[it.id] || {};
                return Object.assign({}, it, {
                  stage: b.stage || "medium",
                  difficulty: b.difficulty || 2,
                });
              }),
            };
          });
          global.__quintileBank = BANK;
          cb && cb(BANK);
          return BANK;
        });
      });
  }

  function itemsAtLevel(skillId, level) {
    var skill = BANK && BANK[skillId];
    if (!skill) return [];
    var at = skill.items.filter(function (it) {
      return it.stage === level;
    });
    if (at.length) return at;
    // soft fallback: nearest level
    var order = level === "hard" ? ["hard", "medium", "easy"] : level === "easy" ? ["easy", "medium", "hard"] : ["medium", "easy", "hard"];
    for (var i = 0; i < order.length; i++) {
      at = skill.items.filter(function (it) {
        return it.stage === order[i];
      });
      if (at.length) return at;
    }
    return skill.items.slice();
  }

  /**
   * Extract next run of items.
   * Practice: shuffle items at current practiceLevel (default 5).
   * Exam: fixed examLevel for whole run (default 5).
   */
  function extractRun(skillId, opts) {
    opts = opts || {};
    var mode = opts.mode || getMode();
    var count = opts.count || 5;
    var level =
      mode === MODES.EXAM
        ? opts.level || getExamLevel(skillId)
        : opts.level || getPracticeLevel(skillId);
    var pool = itemsAtLevel(skillId, level).slice();
    // shuffle
    for (var i = pool.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = pool[i];
      pool[i] = pool[j];
      pool[j] = tmp;
    }
    var picked = pool.slice(0, Math.min(count, pool.length));
    // if short, fill from other levels without changing adaptive level
    if (picked.length < count && BANK && BANK[skillId]) {
      var rest = BANK[skillId].items.filter(function (it) {
        return picked.indexOf(it) < 0;
      });
      for (var k = 0; k < rest.length && picked.length < count; k++) picked.push(rest[k]);
    }
    return {
      mode: mode,
      level: level,
      skillId: skillId,
      title: (BANK && BANK[skillId] && BANK[skillId].title) || skillId,
      items: picked,
    };
  }


  function listSkills() {
    if (!BANK) return [];
    return Object.keys(BANK)
      .filter(function (id) {
        return id.charAt(0) !== "_" && BANK[id] && Array.isArray(BANK[id].items);
      })
      .map(function (id) {
        var sk = BANK[id];
        return {
          id: id,
          title: sk.title || id,
          era: sk.era,
          courseId: sk.courseId,
          itemCount: (sk.items && sk.items.length) || sk.itemCount || 0,
          requires: [],
        };
      });
  }

  /** Wire attempt logger: Practice steps level; Exam logs kind exam and optional SRS. */
  function wrapAttempts() {
    var prev = global.__quintileAttempt;
    global.__quintileAttempt = function (payload) {
      var mode = getMode();
      // Session override from practice runner
      if (global.__quintileRunMode) mode = global.__quintileRunMode;
      if (payload && typeof payload === "object") {
        if (mode === MODES.EXAM && (payload.kind === "skill-item" || payload.kind === "dojo")) {
          payload = Object.assign({}, payload, {
            kind: "exam",
            meta: Object.assign({}, payload.meta || {}, { mode: "exam", level: global.__quintileRunLevel || getExamLevel(payload.skillId) }),
          });
        } else if (mode === MODES.PRACTICE && payload.skillId && typeof payload.correct === "boolean") {
          if (payload.kind === "skill-item" || payload.kind === "dojo") {
            onPracticeOutcome(payload.skillId, payload.correct, { forcePractice: true });
            payload = Object.assign({}, payload, {
              meta: Object.assign({}, payload.meta || {}, {
                mode: "practice",
                practiceLevel: getPracticeLevel(payload.skillId),
              }),
            });
          }
        }
      }
      var result = typeof prev === "function" ? prev(payload) : null;
      return result;
    };
  }

  /** Optional: all-correct exam while due → treat as one solid review (triple-play credit). */
  function maybeExamSrsPass(skillId, allCorrect) {
    if (!allCorrect || !skillId || !global.QuintileMastery) return;
    var due = QuintileMastery.isDue && QuintileMastery.isDue(skillId);
    if (!due) {
      var m = QuintileMastery.getSkill(skillId);
      if (!(m && m.status === "due")) return;
    }
    try {
      // Three correct recordAttempts → level up once if streak was empty
      QuintileMastery.recordAttempt(skillId, true, { mode: "exam-review" });
      QuintileMastery.recordAttempt(skillId, true, { mode: "exam-review" });
      QuintileMastery.recordAttempt(skillId, true, { mode: "exam-review" });
    } catch (e) {}
  }

  /** Inject Practice | Exam toggle chrome into header area */
  function injectToggle() {
    if (document.getElementById("q-mode-toggle")) return;
    var host =
      document.querySelector("header .mx-auto.flex") ||
      document.querySelector(".tree-header-inner") ||
      document.querySelector("header");
    if (!host) return;
    var wrap = document.createElement("div");
    wrap.id = "q-mode-toggle";
    wrap.style.cssText = "display:inline-flex;align-items:center;gap:0;margin-left:auto;margin-right:0.35rem;border:1px solid var(--color-line,#e3d9cc);border-radius:999px;overflow:hidden;flex-shrink:0";
    wrap.setAttribute("role", "group");
    wrap.setAttribute("aria-label", "Question mode");
    function btn(label, mode, disabled) {
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = label;
      b.dataset.mode = mode;
      b.disabled = !!disabled;
      b.title = disabled ? "Coming — Julius naming (now: Exam ships as Mode 2)" : mode === "practice" ? "Adaptive difficulty" : "Fixed difficulty · scored";
      b.style.cssText =
        "border:none;padding:0.3rem 0.7rem;font-size:0.7rem;font-weight:600;cursor:pointer;background:transparent;color:var(--color-muted,#6f675e)";
      if (disabled) {
        b.style.opacity = "0.45";
        b.style.cursor = "not-allowed";
        b.textContent = "Exam";
      }
      b.addEventListener("click", function () {
        if (disabled) return;
        setMode(mode);
        paint();
      });
      return b;
    }
    var bp = btn("Practice", MODES.PRACTICE);
    var be = btn("Exam", MODES.EXAM);
    wrap.appendChild(bp);
    wrap.appendChild(be);
    // place before account chip if present
    var chip = document.getElementById("q-account-chip");
    if (chip && chip.parentNode === host) host.insertBefore(wrap, chip);
    else host.appendChild(wrap);

    function paint() {
      var m = getMode();
      [bp, be].forEach(function (b) {
        var on = b.dataset.mode === m;
        b.style.background = on ? "var(--color-ink,#1c1915)" : "transparent";
        b.style.color = on ? "var(--color-sheet,#fbf8f3)" : "var(--color-muted,#6f675e)";
      });
    }
    paint();
    global.addEventListener("quintile-mode", paint);
    global.addEventListener("quintile-account-change", paint);
  }

  function practiceHref(skillId, mode) {
    var q = "skill=" + encodeURIComponent(skillId) + "&mode=" + (mode || getMode());
    return url("/practice/?" + q);
  }

  wrapAttempts();

  global.QuintileModes = {
    MODES: MODES,
    LEVELS: LEVELS,
    getMode: getMode,
    setMode: setMode,
    getPracticeLevel: getPracticeLevel,
    setPracticeLevel: setPracticeLevel,
    getExamLevel: getExamLevel,
    setExamLevel: setExamLevel,
    onPracticeOutcome: onPracticeOutcome,
    stepLevel: stepLevel,
    loadBank: loadBank,
    extractRun: extractRun,
    listSkills: listSkills,
    itemsAtLevel: itemsAtLevel,
    maybeExamSrsPass: maybeExamSrsPass,
    practiceHref: practiceHref,
    injectToggle: injectToggle,
  };

  function boot() {
    injectToggle();
    setTimeout(injectToggle, 500);
    setTimeout(injectToggle, 1600);
    loadBank();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})(window);
