/**
 * Append-only attempt log for the active Quintile profile.
 * Cap 5000; also mirrors run-level events from quire-progress history.
 */
(function (global) {
  "use strict";

  var CAP = 5000;
  var dedupe = Object.create(null);

  function uuid() {
    if (global.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "a-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
  }

  function activeId() {
    try {
      if (global.QuintileAccount && QuintileAccount.getActive()) {
        return QuintileAccount.getActive().id;
      }
      var reg = JSON.parse(localStorage.getItem("quintile-accounts") || "{}");
      return reg.activeId || null;
    } catch (e) {
      return null;
    }
  }

  function promptHash(text) {
    text = String(text || "").slice(0, 240);
    var h = 2166136261;
    for (var i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(16);
  }

  function persist(attempt) {
    try {
      if (global.QuintileAccount && QuintileAccount.getActiveProfileData) {
        var id = activeId();
        if (!id) return;
        // read-modify-write via mergeAttempts + direct write
        var Acc = QuintileAccount;
        Acc.syncProgressIntoActive && Acc.syncProgressIntoActive();
        var key = "quintile-profile-" + id;
        var raw = localStorage.getItem(key);
        var profile = raw ? JSON.parse(raw) : { progress: {}, attempts: [], meta: {} };
        if (!Array.isArray(profile.attempts)) profile.attempts = [];
        profile.attempts.push(attempt);
        if (profile.attempts.length > CAP) profile.attempts = profile.attempts.slice(-CAP);
        localStorage.setItem(key, JSON.stringify(profile));
        try {
          global.dispatchEvent(new CustomEvent("quintile-attempt", { detail: attempt }));
        } catch (e) {}
        return;
      }
    } catch (e) {
      console.warn("[quintile attempts]", e);
    }
  }

  /**
   * window.__quintileAttempt(payload)
   * payload fields: kind, skillId?, itemId?, questionId?, topicId?, courseId?, eraId?,
   *   promptHash?|prompt?, correct, earned?, total?, answerDraft?, meta?
   */
  function logAttempt(payload) {
    if (!payload || typeof payload !== "object") return null;
    var pid = activeId();
    if (!pid) {
      if (global.QuintileAccount) QuintileAccount.ensureTraveler();
      pid = activeId();
    }
    var at = payload.at || new Date().toISOString();
    var dedupeKey =
      payload.dedupeKey ||
      [at, payload.kind || "", payload.itemId || "", payload.questionId || "", payload.skillId || "", String(!!payload.correct)].join("|");
    if (dedupe[dedupeKey]) return null;
    dedupe[dedupeKey] = 1;

    var attempt = {
      id: payload.id || uuid(),
      at: at,
      profileId: pid,
      kind: payload.kind || "unknown",
      skillId: payload.skillId || null,
      itemId: payload.itemId || null,
      questionId: payload.questionId || null,
      topicId: payload.topicId || null,
      courseId: payload.courseId || null,
      eraId: payload.eraId || null,
      promptHash: payload.promptHash || (payload.prompt ? promptHash(payload.prompt) : null),
      correct: !!payload.correct,
      earned: payload.earned != null ? payload.earned : null,
      total: payload.total != null ? payload.total : null,
      answerDraft: payload.answerDraft != null ? String(payload.answerDraft).slice(0, 200) : null,
      meta: payload.meta || null,
    };
    persist(attempt);
    return attempt;
  }

  function onProgressWrite(progress) {
    if (!progress || !Array.isArray(progress.history) || !progress.history.length) return;
    var h = progress.history[0];
    if (!h || !h.at || !h.id) return;
    var key = "hist|" + h.at + "|" + h.id;
    if (dedupe[key]) return;
    dedupe[key] = 1;
    logAttempt({
      id: "run-" + h.id + "-" + String(h.at).replace(/\W/g, ""),
      at: typeof h.at === "number" ? new Date(h.at).toISOString() : h.at,
      kind: h.kind === "skill" ? "skill-run" : h.kind === "question" ? "paper-run" : h.kind === "topic" ? "topic-run" : "run",
      skillId: h.kind === "skill" ? h.id : null,
      questionId: h.kind === "question" ? h.id : null,
      topicId: h.kind === "topic" ? h.id : null,
      correct: h.total > 0 ? h.earned >= h.total : !!h.earned,
      earned: h.earned,
      total: h.total,
      meta: { label: h.label || null, source: "history" },
      dedupeKey: key,
    });
  }

  global.__quintileAttempt = logAttempt;
  global.__quintileOnProgressWrite = onProgressWrite;
  global.QuintileAttempts = {
    log: logAttempt,
    promptHash: promptHash,
    CAP: CAP,
    listActive: function () {
      if (!global.QuintileAccount) return [];
      var p = QuintileAccount.getActiveProfileData();
      return (p && p.attempts) || [];
    },
  };
})(window);
