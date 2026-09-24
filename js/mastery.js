/**
 * Quintile brilliance — five living levels per skill.
 *
 * Levels (q 0–5): Bare → Seed → Sprout → Stem → Crown → Bloom
 * Advance: triple play (3 correct in a row) at current level → +1 (cap 5).
 * Decay: missing the review window soft-wilts; failing a due review drops 1 (floor 0).
 *
 * Review schedule after reaching q:
 *   Q1 → 1d · Q2 → 7d · Q3 → 30d · Q4 → 90d · Q5 → 180d
 *
 * Stored on active profile: meta.quintiles[skillId] =
 *   { q, streak, nextReviewAt, lastPracticeAt, lifetimeMax, correct, wrong, wiltedAt? }
 * Mirrored into progress.mastery for legacy tree colouring.
 */
(function (global) {
  "use strict";

  var TRIPLE = 3;
  var LEVEL_NAMES = ["Bare", "Seed", "Sprout", "Stem", "Crown", "Bloom"];
  var LEVEL_POETIC = ["bare soil", "Seed", "Sprout", "Stem", "Crown", "Bloom"];
  // Index by quintile just reached (1..5)
  var REVIEW_MS = {
    1: 1 * 24 * 60 * 60 * 1000,
    2: 7 * 24 * 60 * 60 * 1000,
    3: 30 * 24 * 60 * 60 * 1000,
    4: 90 * 24 * 60 * 60 * 1000,
    5: 180 * 24 * 60 * 60 * 1000,
  };
  // Legacy SRS intervals kept for callers
  var INTERVALS_MS = [
    REVIEW_MS[2],
    REVIEW_MS[3],
    REVIEW_MS[5],
  ];
  var WILT_FRESH_MS = 3 * 24 * 60 * 60 * 1000;

  function now() {
    return Date.now();
  }

  function emptyQuintile() {
    return {
      q: 0,
      streak: 0,
      nextReviewAt: null,
      lastPracticeAt: null,
      lifetimeMax: 0,
      correct: 0,
      wrong: 0,
      wiltedAt: null,
      softWilt: false,
    };
  }

  function clampQ(q) {
    q = Math.round(Number(q) || 0);
    if (q < 0) return 0;
    if (q > 5) return 5;
    return q;
  }

  function levelName(q) {
    return LEVEL_NAMES[clampQ(q)] || "Bare";
  }

  function nextReview(q) {
    q = clampQ(q);
    if (q < 1) return null;
    var ms = REVIEW_MS[q] || REVIEW_MS[1];
    return new Date(now() + ms).toISOString();
  }

  /* ---------- Profile / progress IO ---------- */

  function readProgress() {
    if (global.QuintileAccount && QuintileAccount.readProgress) {
      return QuintileAccount.readProgress() || {};
    }
    try {
      var raw = localStorage.getItem("quire-progress");
      if (!raw) return {};
      var o = JSON.parse(raw);
      return o && o.state ? o.state : o || {};
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
      try {
        localStorage.setItem("quire-progress", JSON.stringify(progress));
      } catch (e2) {}
    }
    if (global.QuintileAccount && QuintileAccount.syncProgressIntoActive) {
      QuintileAccount.syncProgressIntoActive();
    }
  }

  function readQuintilesMap() {
    var map = {};
    try {
      if (global.QuintileAccount && QuintileAccount.getActiveProfileData) {
        var prof = QuintileAccount.getActiveProfileData();
        if (prof && prof.meta && prof.meta.quintiles && typeof prof.meta.quintiles === "object") {
          map = Object.assign({}, prof.meta.quintiles);
        }
      }
    } catch (e) {}
    // Also merge any progress.quintiles mirror
    try {
      var p = readProgress();
      if (p.quintiles && typeof p.quintiles === "object") {
        Object.keys(p.quintiles).forEach(function (k) {
          if (!map[k]) map[k] = p.quintiles[k];
        });
      }
    } catch (e2) {}
    return map;
  }

  function writeQuintile(skillId, rec) {
    // meta.quintiles via account helper
    if (global.QuintileAccount && QuintileAccount.patchActiveMeta) {
      QuintileAccount.patchActiveMeta(function (meta) {
        if (!meta.quintiles || typeof meta.quintiles !== "object") meta.quintiles = {};
        meta.quintiles[skillId] = rec;
      });
    } else {
      try {
        var regRaw = localStorage.getItem("quintile-accounts");
        var reg = regRaw ? JSON.parse(regRaw) : null;
        if (reg && reg.activeId) {
          var key = "quintile-profile-" + reg.activeId;
          var raw = localStorage.getItem(key);
          var profile = raw ? JSON.parse(raw) : { progress: {}, attempts: [], meta: {} };
          if (!profile.meta) profile.meta = {};
          if (!profile.meta.quintiles) profile.meta.quintiles = {};
          profile.meta.quintiles[skillId] = rec;
          localStorage.setItem(key, JSON.stringify(profile));
        }
      } catch (e) {}
    }

    // Mirror into progress.quintiles + legacy mastery
    var p = readProgress();
    if (!p.quintiles || typeof p.quintiles !== "object") p.quintiles = {};
    p.quintiles[skillId] = rec;
    if (!p.mastery || typeof p.mastery !== "object") p.mastery = {};
    p.mastery[skillId] = toLegacyMastery(rec);
    if (!p.skills) p.skills = {};
    var legacy = p.skills[skillId] || {
      lastCorrect: 0,
      lastTotal: 0,
      bestCorrect: 0,
      runs: 0,
      mastered: false,
      updatedAt: Date.now(),
    };
    legacy.mastered = rec.q >= 1;
    legacy.updatedAt = Date.now();
    if (rec.q >= 3) legacy.bestCorrect = Math.max(legacy.bestCorrect || 0, TRIPLE);
    p.skills[skillId] = legacy;
    writeProgress(p);

    try {
      global.dispatchEvent(
        new CustomEvent("quintile-mastery", {
          detail: { skillId: skillId, quintile: rec, mastery: toLegacyMastery(rec) },
        })
      );
    } catch (e3) {}
  }

  function toLegacyMastery(rec) {
    var due = isDue(rec);
    var soft = isSoftWilt(rec);
    var recentWilt = rec.wiltedAt && now() - new Date(rec.wiltedAt).getTime() < WILT_FRESH_MS;
    var status = "learning";
    if (recentWilt && rec.q === 0) status = "lapsed";
    else if (due || soft) status = "due";
    else if (rec.q >= 5) status = "secure";
    else if (rec.q >= 1) status = "earned";
    else if ((rec.streak || 0) > 0 || (rec.correct || 0) > 0) status = "learning";
    else status = "learning";
    return {
      streak: rec.streak || 0,
      status: status,
      earnedAt: rec.q >= 1 ? rec.lastPracticeAt : null,
      nextReviewAt: rec.nextReviewAt,
      srsStage: rec.q >= 5 ? 3 : Math.max(0, rec.q - 1),
      lapsedAt: rec.wiltedAt,
      reviewStreak: 0,
      q: rec.q,
    };
  }

  function migrateFromLegacy(skillId) {
    try {
      var p = readProgress();
      var m = p.mastery && p.mastery[skillId];
      if (!m) return null;
      var rec = emptyQuintile();
      var st = m.status || "learning";
      if (st === "secure") rec.q = 5;
      else if (st === "earned" || st === "due") {
        var stage = m.srsStage || 0;
        rec.q = Math.min(5, Math.max(1, stage + 1));
      } else if (st === "lapsed") {
        rec.q = 0;
        rec.wiltedAt = m.lapsedAt || new Date().toISOString();
      } else {
        rec.q = 0;
      }
      rec.streak = m.streak || 0;
      rec.nextReviewAt = m.nextReviewAt || null;
      rec.lifetimeMax = rec.q;
      rec.lastPracticeAt = m.earnedAt || null;
      return refreshFlags(rec);
    } catch (e) {
      return null;
    }
  }

  function isDue(rec) {
    if (!rec || !rec.nextReviewAt || rec.q < 1) return false;
    return now() >= new Date(rec.nextReviewAt).getTime();
  }

  function isOverdue(rec) {
    if (!isDue(rec)) return false;
    // Overdue = past due by more than half the interval (soft wilt window)
    var q = clampQ(rec.q);
    var interval = REVIEW_MS[q] || REVIEW_MS[1];
    var dueAt = new Date(rec.nextReviewAt).getTime();
    return now() >= dueAt + Math.min(interval * 0.1, 12 * 60 * 60 * 1000);
  }

  function isSoftWilt(rec) {
    if (!rec) return false;
    if (rec.softWilt) return true;
    return isOverdue(rec);
  }

  function isRecentlyWilted(rec) {
    if (!rec || !rec.wiltedAt) return false;
    return now() - new Date(rec.wiltedAt).getTime() < WILT_FRESH_MS;
  }

  function refreshFlags(rec) {
    if (!rec) return emptyQuintile();
    rec.q = clampQ(rec.q);
    rec.lifetimeMax = Math.max(clampQ(rec.lifetimeMax), rec.q);
    if (isOverdue(rec)) rec.softWilt = true;
    return rec;
  }

  function get(skillId) {
    if (!skillId) return emptyQuintile();
    var map = readQuintilesMap();
    var rec = map[skillId];
    if (!rec) {
      rec = migrateFromLegacy(skillId);
      if (rec) {
        writeQuintile(skillId, rec);
        return Object.assign(emptyQuintile(), rec);
      }
      return emptyQuintile();
    }
    return refreshFlags(Object.assign(emptyQuintile(), rec));
  }

  // Alias for older callers
  function getSkill(skillId) {
    var rec = get(skillId);
    return toLegacyMastery(rec);
  }

  function celebrate(skillId, kind, detail) {
    var title = skillId;
    try {
      if (global.__quintileSkillTitles && global.__quintileSkillTitles[skillId]) {
        title = global.__quintileSkillTitles[skillId];
      } else if (global.QuintileModes && QuintileModes && false) {
        /* bank titles filled after load */
      }
    } catch (e) {}
    showCelebration(title, kind || "levelup", detail);
  }

  function showCelebration(title, kind, detail) {
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
      "font-family:Fraunces,Georgia,serif;font-size:1.25rem;box-shadow:0 20px 50px rgba(0,0,0,.25);text-align:center;max-width:22rem;";
    var icon = "✨";
    var headline = "Level up!";
    if (kind === "wilt") {
      icon = "🥀";
      headline = "Wilt";
    } else if (kind === "recover" || kind === "reseed") {
      icon = "🌱";
      headline = "Growing again";
    } else if (kind === "bloom") {
      icon = "🌸";
      headline = "Bloom!";
    } else if (kind === "earn") {
      icon = "✨";
      headline = "Triple play!";
    }
    var sub = detail || "";
    var iconEl = document.createElement("div");
    iconEl.style.cssText = "font-size:1.75rem;margin-bottom:.35rem";
    iconEl.textContent = icon;
    var headEl = document.createElement("div");
    headEl.textContent = headline;
    var titleEl = document.createElement("div");
    titleEl.style.cssText = "font-size:.875rem;font-family:Figtree,sans-serif;opacity:.85;margin-top:.35rem";
    titleEl.textContent = title;
    toast.appendChild(iconEl);
    toast.appendChild(headEl);
    toast.appendChild(titleEl);
    if (sub) {
      var subEl = document.createElement("div");
      subEl.style.cssText = "font-size:.75rem;font-family:Figtree,sans-serif;opacity:.65;margin-top:.25rem";
      subEl.textContent = sub;
      toast.appendChild(subEl);
    }
    overlay.appendChild(toast);

    if (kind !== "wilt") {
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
    } else {
      // Soft wilt flake
      for (var w = 0; w < 12; w++) {
        var leaf = document.createElement("i");
        leaf.style.cssText =
          "position:absolute;left:" +
          (40 + Math.random() * 20) +
          "%;top:40%;width:10px;height:14px;border-radius:50% 0;background:#b8432f;opacity:0;" +
          "animation:qWiltFall " +
          (1.2 + Math.random()) +
          "s ease-in " +
          Math.random() * 0.3 +
          "s forwards";
        overlay.appendChild(leaf);
      }
    }

    if (!document.getElementById("q-confetti-style")) {
      var st = document.createElement("style");
      st.id = "q-confetti-style";
      st.textContent =
        "@keyframes qConfetti{0%{opacity:1;transform:translate(0,0) rotate(0)}100%{opacity:0;transform:translate(var(--dx,0),var(--dy,120px)) rotate(720deg)}}" +
        "@keyframes qWiltFall{0%{opacity:.9;transform:translate(0,0) rotate(0)}100%{opacity:0;transform:translate(var(--dx,0),140px) rotate(180deg)}}" +
        "@media (prefers-reduced-motion:reduce){#q-mastery-celebrate i{display:none!important}}";
      document.head.appendChild(st);
    }
    overlay.querySelectorAll("i").forEach(function (el) {
      el.style.setProperty("--dx", Math.random() * 200 - 100 + "px");
      el.style.setProperty("--dy", 80 + Math.random() * 160 + "px");
    });
    if (document.body) document.body.appendChild(overlay);

    try {
      if (!global.matchMedia("(prefers-reduced-motion: reduce)").matches && global.AudioContext) {
        var muted = localStorage.getItem("quintile-mute-sfx") === "1";
        if (!muted) {
          var ctx = new (global.AudioContext || global.webkitAudioContext)();
          var o = ctx.createOscillator();
          var g = ctx.createGain();
          o.type = "sine";
          o.frequency.value = kind === "wilt" ? 392 : kind === "bloom" ? 783.99 : 659.25;
          g.gain.value = 0.04;
          o.connect(g);
          g.connect(ctx.destination);
          o.start();
          setTimeout(function () {
            o.frequency.value = kind === "wilt" ? 311.13 : 783.99;
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
    }, kind === "wilt" ? 2200 : 2800);
  }

  /**
   * Record one practice attempt for a skill.
   * @returns {{ quintile, justLeveled, justDropped, justWilted, wasDue }}
   */
  function recordAttempt(skillId, correct, meta) {
    if (!skillId) return null;
    var rec = get(skillId);
    var wasDue = isDue(rec);
    var justLeveled = false;
    var justDropped = false;
    var justWilted = false;
    var fromQ = rec.q;

    rec.lastPracticeAt = new Date().toISOString();

    if (correct) {
      rec.correct = (rec.correct || 0) + 1;
      rec.streak = (rec.streak || 0) + 1;
      if (rec.streak >= TRIPLE && rec.q < 5) {
        rec.q = clampQ(rec.q + 1);
        rec.streak = 0;
        rec.nextReviewAt = nextReview(rec.q);
        rec.softWilt = false;
        rec.wiltedAt = null;
        rec.lifetimeMax = Math.max(rec.lifetimeMax || 0, rec.q);
        justLeveled = true;
      } else if (wasDue && rec.q >= 1) {
        // Successful due review before triple complete — keep due until triple,
        // but clear soft wilt soft flag as they're practicing on time
        rec.softWilt = false;
      }
    } else {
      rec.wrong = (rec.wrong || 0) + 1;
      rec.streak = 0;
      if (wasDue && rec.q >= 1) {
        rec.q = clampQ(rec.q - 1);
        rec.wiltedAt = new Date().toISOString();
        rec.softWilt = false;
        justDropped = true;
        justWilted = true;
        if (rec.q >= 1) {
          rec.nextReviewAt = nextReview(rec.q);
        } else {
          rec.nextReviewAt = null;
        }
      }
    }

    writeQuintile(skillId, rec);

    if (justLeveled) {
      var name = levelName(rec.q);
      celebrate(skillId, rec.q >= 5 ? "bloom" : "levelup", "→ " + name + " (Q" + rec.q + ")");
    }
    if (justWilted) {
      celebrate(skillId, "wilt", levelName(fromQ) + " → " + levelName(rec.q));
    }

    if (global.QuintilePoints) {
      try {
        if (correct) QuintilePoints.award("attempt_correct", { ref: skillId, meta: meta });
        else QuintilePoints.award("attempt_wrong", { ref: skillId, meta: meta });
        if (justLeveled) QuintilePoints.award("earn", { ref: skillId, q: rec.q });
        if (justDropped) QuintilePoints.award("recover", { ref: skillId, q: rec.q }); // reuse key; wilt is rare
      } catch (e) {}
    }

    return {
      quintile: rec,
      mastery: toLegacyMastery(rec),
      justLeveled: justLeveled,
      justDropped: justDropped,
      justWilted: justWilted,
      justEarned: justLeveled && fromQ === 0,
      justRecovered: justLeveled && !!rec.wiltedAt === false && fromQ === 0,
      justLapsed: justWilted,
      srsPassed: justLeveled && wasDue,
      wasDue: wasDue,
      fromQ: fromQ,
      toQ: rec.q,
    };
  }

  // Legacy name
  function recordItem(skillId, correct, meta) {
    return recordAttempt(skillId, correct, meta);
  }

  function getTreeState(skillId) {
    return getSkill(skillId).status || "learning";
  }

  function getTreeQuintile(skillId) {
    var rec = get(skillId);
    return {
      q: rec.q,
      name: levelName(rec.q),
      due: isDue(rec),
      overdue: isOverdue(rec),
      softWilt: isSoftWilt(rec),
      wilted: isRecentlyWilted(rec),
      streak: rec.streak || 0,
      nextReviewAt: rec.nextReviewAt,
    };
  }

  function allQuintiles() {
    var map = readQuintilesMap();
    var out = {};
    Object.keys(map).forEach(function (k) {
      out[k] = refreshFlags(Object.assign(emptyQuintile(), map[k]));
    });
    return out;
  }

  function allMastery() {
    var qs = allQuintiles();
    var out = {};
    Object.keys(qs).forEach(function (k) {
      out[k] = toLegacyMastery(qs[k]);
    });
    return out;
  }

  /**
   * Era growth 0–1 (also returns percent helpers).
   * skillIds: array of skill id strings belonging to the era.
   */
  function eraGrowth(skillIds) {
    skillIds = skillIds || [];
    var n = skillIds.length;
    if (!n) {
      return { growth: 0, percent: 0, mastery: 0, masteryCount: 0, total: 0, health: 1, sumQ: 0, maxQ: 0 };
    }
    var sumQ = 0;
    var bloom = 0;
    var healthy = 0;
    skillIds.forEach(function (id) {
      var rec = get(id);
      sumQ += rec.q || 0;
      if (rec.q >= 5) bloom++;
      if (!isSoftWilt(rec) && !isRecentlyWilted(rec)) healthy++;
      else if (rec.q === 0 && !rec.nextReviewAt) healthy++; // never practiced = not wilted
    });
    var growth = sumQ / (5 * n);
    return {
      growth: growth,
      percent: Math.round(growth * 1000) / 10,
      mastery: bloom / n,
      masteryCount: bloom,
      masteryPercent: Math.round((bloom / n) * 1000) / 10,
      total: n,
      health: healthy / n,
      healthPercent: Math.round((healthy / n) * 1000) / 10,
      sumQ: sumQ,
      maxQ: 5 * n,
    };
  }

  function globalStats(skillIds) {
    return eraGrowth(skillIds || Object.keys(readQuintilesMap()));
  }

  /**
   * Smart Practice scheduler.
   * catalog: array of { id, title?, era?, requires?, unlocked? } or string ids.
   * opts.treeNodes optional for prereq checks.
   */
  function pickNextSkill(catalog, opts) {
    opts = opts || {};
    var items = (catalog || []).map(function (c) {
      if (typeof c === "string") return { id: c, title: c };
      return c;
    }).filter(function (c) {
      return c && c.id && c.id.charAt(0) !== "_";
    });

    function unlocked(item) {
      if (typeof item.unlocked === "boolean") return item.unlocked;
      if (!item.requires || !item.requires.length) return true;
      // Prereq met if each required skill has q>=1, or required id not a skill
      return item.requires.every(function (req) {
        var reqId = typeof req === "string" ? req : req.id;
        if (!reqId) return true;
        // Course/era reqs: treat as unlocked (era gating is soft)
        if (reqId.indexOf("course:") === 0 || reqId.indexOf("era:") === 0) return true;
        var sid = reqId.indexOf("skill-topic:") === 0 ? reqId.slice("skill-topic:".length) : reqId;
        var r = get(sid);
        return r.q >= 1 || (r.correct || 0) > 0;
      });
    }

    var overdue = [];
    var dueToday = [];
    var frontier = [];
    var lowQ = [];
    var maintain = [];

    var startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    var endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    items.forEach(function (item) {
      var rec = get(item.id);
      var dueAt = rec.nextReviewAt ? new Date(rec.nextReviewAt).getTime() : null;
      if (rec.q >= 1 && dueAt != null && now() >= dueAt) {
        if (isOverdue(rec)) overdue.push({ item: item, rec: rec, dueAt: dueAt });
        else dueToday.push({ item: item, rec: rec, dueAt: dueAt });
      } else if (rec.q === 0 && unlocked(item)) {
        frontier.push({ item: item, rec: rec });
      } else if (rec.q >= 1 && rec.q <= 2) {
        lowQ.push({ item: item, rec: rec });
      } else if (rec.q >= 3 && rec.q <= 4) {
        maintain.push({ item: item, rec: rec });
      }
    });

    overdue.sort(function (a, b) {
      return a.dueAt - b.dueAt;
    });
    dueToday.sort(function (a, b) {
      return a.dueAt - b.dueAt;
    });

    function pick(list, reason) {
      if (!list.length) return null;
      var choice = list[0];
      if (reason === "maintain" || reason === "growth") {
        choice = list[Math.floor(Math.random() * list.length)];
      }
      var rec = choice.rec;
      var title = choice.item.title || choice.item.id;
      var short = title.length > 28 ? title.slice(0, 26) + "…" : title;
      var why = reason;
      if (reason === "overdue") why = "Overdue review · Q" + rec.q + " · " + short;
      else if (reason === "due") why = "Due review · Q" + rec.q + " · " + short;
      else if (reason === "frontier") why = "New frontier · " + short;
      else if (reason === "growth") why = "Grow · Q" + rec.q + " " + levelName(rec.q) + " · " + short;
      else if (reason === "maintain") why = "Maintain · Q" + rec.q + " · " + short;
      return {
        skillId: choice.item.id,
        title: title,
        reason: why,
        reasonKind: reason,
        quintile: rec,
        q: rec.q,
        levelName: levelName(rec.q),
      };
    }

    return (
      pick(overdue, "overdue") ||
      pick(dueToday, "due") ||
      pick(frontier, "frontier") ||
      pick(lowQ, "growth") ||
      pick(maintain, "maintain") ||
      (items.length
        ? {
            skillId: items[Math.floor(Math.random() * items.length)].id,
            title: items[0].title,
            reason: "Warm-up · " + (items[0].title || items[0].id),
            reasonKind: "warmup",
            quintile: get(items[0].id),
            q: get(items[0].id).q,
            levelName: levelName(get(items[0].id).q),
          }
        : null)
    );
  }

  /** Build catalog from loaded QuintileModes bank + optional tree nodes. */
  function catalogFromBank(treeData) {
    var cat = [];
    var seen = Object.create(null);
    try {
      if (global.QuintileModes && typeof QuintileModes.listSkills === "function") {
        QuintileModes.listSkills().forEach(function (s) {
          if (!s || !s.id || seen[s.id]) return;
          seen[s.id] = true;
          cat.push(s);
        });
      } else if (global.QuintileModes) {
        // Peek internal bank via extract of known ids after load
      }
    } catch (e) {}
    // From progress / tree
    try {
      if (treeData && treeData.nodes) {
        treeData.nodes.forEach(function (n) {
          if (!n.skillId || seen[n.skillId]) return;
          seen[n.skillId] = true;
          cat.push({
            id: n.skillId,
            title: n.title,
            era: n.era,
            requires: n.requires || [],
          });
        });
      }
    } catch (e2) {}
    // From bank object if exposed
    try {
      var bank = global.__quintileBank;
      if (bank) {
        Object.keys(bank).forEach(function (id) {
          if (id.charAt(0) === "_" || seen[id]) return;
          var sk = bank[id];
          if (!sk || !sk.items) return;
          seen[id] = true;
          cat.push({ id: id, title: sk.title || id, era: sk.era, requires: [] });
        });
      }
    } catch (e3) {}
    return cat;
  }

  function skillIdsForEra(eraId, treeData) {
    var ids = [];
    var seen = Object.create(null);
    if (treeData && treeData.nodes) {
      treeData.nodes.forEach(function (n) {
        if (n.era !== eraId) return;
        if (n.skillId && !seen[n.skillId]) {
          seen[n.skillId] = true;
          ids.push(n.skillId);
        }
        // foundation / track leaves use topicId — treat as skill-like for growth if in bank
        if ((n.kind === "foundation-leaf" || n.kind === "track-leaf" || n.kind === "syllabus-leaf") && n.topicId && !seen[n.topicId]) {
          seen[n.topicId] = true;
          ids.push(n.topicId);
        }
      });
    }
    // Era bank topics
    try {
      var bank = global.__quintileBank;
      if (bank) {
        Object.keys(bank).forEach(function (id) {
          if (seen[id]) return;
          var sk = bank[id];
          if (sk && sk.era === eraId) {
            seen[id] = true;
            ids.push(id);
          }
        });
      }
    } catch (e) {}
    return ids;
  }

  /* Wire attempt logger */
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
        var kind = payload.kind || "";
        if (kind === "skill-item" || kind === "dojo" || kind.indexOf("dojo") >= 0) {
          recordAttempt(payload.skillId, !!payload.correct, payload.meta || null);
        }
      }
    } catch (e) {
      console.warn("[mastery]", e);
    }
    return result;
  };

  /** Inject big Just Practice CTA on home / tree / banks */
  function injectJustPractice() {
    if (document.getElementById("q-just-practice")) return;
    var path = (location.pathname || "").replace(/\/+$/, "") || "/";
    var base = global.__QUINTILE_BASE__ || "";
    var isHome =
      path === base ||
      path === base + "/" ||
      path === "/" ||
      /\/(index\.html)?$/.test(path) && path.indexOf("/tree") < 0 && path.indexOf("/banks") < 0 && path.indexOf("/practice") < 0 && path.indexOf("/diploma") < 0 && path.indexOf("/dojo") < 0 && path.indexOf("/games") < 0 && path.indexOf("/foundations") < 0 && path.indexOf("/progress") < 0 && path.indexOf("/syllabus") < 0 && path.indexOf("/track") < 0 && path.indexOf("/strand") < 0 && path.indexOf("/drill") < 0;
    var isTree = path.indexOf("/tree") >= 0;
    var isBanks = path.indexOf("/banks") >= 0;
    if (!isHome && !isTree && !isBanks) return;

    var href = (base || "") + "/practice/?mode=practice&auto=1";
    var host =
      document.querySelector(".tree-hero") ||
      document.querySelector("main.bk") ||
      document.querySelector("main header") ||
      document.querySelector("main") ||
      document.body;

    var wrap = document.createElement("div");
    wrap.id = "q-just-practice";
    wrap.style.cssText = isTree
      ? "margin:1rem 0 0;display:flex;flex-wrap:wrap;gap:0.65rem;align-items:center"
      : "margin:1.25rem 0;display:flex;flex-wrap:wrap;gap:0.65rem;align-items:center";

    var a = document.createElement("a");
    a.href = href;
    a.textContent = "Just practice";
    a.style.cssText =
      "display:inline-flex;align-items:center;justify-content:center;padding:0.85rem 1.6rem;" +
      "border-radius:999px;background:var(--color-oxide,#b8432f);color:var(--color-sheet,#fbf8f3);" +
      "font-weight:700;font-size:1rem;text-decoration:none;box-shadow:0 8px 24px rgba(184,67,47,.25);" +
      "font-family:Figtree,system-ui,sans-serif;letter-spacing:-0.01em";
    a.setAttribute("data-q-cta", "just-practice");

    var hint = document.createElement("span");
    hint.style.cssText = "font-size:0.8125rem;color:var(--color-muted,#6f675e);max-width:18rem;line-height:1.4";
    hint.textContent = "No topic needed — the plant picks what you need now.";

    wrap.appendChild(a);
    wrap.appendChild(hint);

    if (isTree) {
      host.appendChild(wrap);
    } else if (isBanks) {
      var lead = host.querySelector(".lead");
      if (lead && lead.parentNode) lead.parentNode.insertBefore(wrap, lead.nextSibling);
      else host.insertBefore(wrap, host.firstChild);
    } else {
      // Home / atlas — insert after first header in main
      var mh = document.querySelector("main header") || document.querySelector("main");
      if (mh) {
        if (mh.tagName === "HEADER") mh.appendChild(wrap);
        else mh.insertBefore(wrap, mh.firstChild);
      } else {
        document.body.appendChild(wrap);
      }
    }
  }

  global.QuintileMastery = {
    TRIPLE: TRIPLE,
    INTERVALS_MS: INTERVALS_MS,
    REVIEW_MS: REVIEW_MS,
    LEVEL_NAMES: LEVEL_NAMES,
    LEVEL_POETIC: LEVEL_POETIC,
    // New API
    get: get,
    recordAttempt: recordAttempt,
    nextReview: nextReview,
    pickNextSkill: pickNextSkill,
    eraGrowth: eraGrowth,
    globalStats: globalStats,
    levelName: levelName,
    catalogFromBank: catalogFromBank,
    skillIdsForEra: skillIdsForEra,
    getTreeQuintile: getTreeQuintile,
    allQuintiles: allQuintiles,
    isDue: function (skillId) {
      return isDue(typeof skillId === "string" ? get(skillId) : skillId);
    },
    isSoftWilt: function (skillId) {
      return isSoftWilt(typeof skillId === "string" ? get(skillId) : skillId);
    },
    // Legacy
    getSkill: getSkill,
    recordItem: recordItem,
    getTreeState: getTreeState,
    allMastery: allMastery,
    celebrate: celebrate,
    emptyMastery: function () {
      return toLegacyMastery(emptyQuintile());
    },
    emptyQuintile: emptyQuintile,
    refreshDue: function (m) {
      return m;
    },
    injectJustPractice: injectJustPractice,
  };

  function boot() {
    injectJustPractice();
    setTimeout(injectJustPractice, 600);
    setTimeout(injectJustPractice, 1800);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})(window);
