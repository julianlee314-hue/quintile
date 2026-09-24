/**
 * Quintile points ledger (SCAFFOLD — formulas are provisional).
 * See POINTS.md. Julius will design real numbers later.
 *
 * Stored on active profile as profile.meta.points =
 *   { balance, history:[{at,delta,reason,ref}] }
 * Also mirrored lightly on progress.meta.points for chip reads.
 */
(function (global) {
  "use strict";

  // TODO(julius): replace with real economy
  var AWARDS = {
    attempt_correct: 1,
    attempt_wrong: 0,
    earn: 25,
    recover: 20,
    srs_pass: 40,
    game_stub: 5,
    dojo_item: 2,
  };

  function emptyLedger() {
    return { balance: 0, history: [] };
  }

  function readLedger() {
    try {
      if (global.QuintileAccount && QuintileAccount.getActiveProfileData) {
        QuintileAccount.syncProgressIntoActive && QuintileAccount.syncProgressIntoActive();
        var prof = QuintileAccount.getActiveProfileData();
        if (prof && prof.meta && prof.meta.points) return prof.meta.points;
      }
    } catch (e) {}
    return emptyLedger();
  }

  function writeLedger(ledger) {
    try {
      if (!global.QuintileAccount) return;
      var active = QuintileAccount.getActive();
      if (!active) return;
      var key = "quintile-profile-" + active.id;
      var raw = localStorage.getItem(key);
      var profile = raw ? JSON.parse(raw) : { progress: {}, attempts: [], meta: {} };
      if (!profile.meta) profile.meta = {};
      profile.meta.points = ledger;
      localStorage.setItem(key, JSON.stringify(profile));
      try {
        global.dispatchEvent(new CustomEvent("quintile-points", { detail: ledger }));
      } catch (e) {}
      updateChip(ledger);
    } catch (e) {
      console.warn("[points]", e);
    }
  }

  function award(reason, opts) {
    opts = opts || {};
    var delta = AWARDS[reason];
    if (typeof opts.delta === "number") delta = opts.delta;
    if (delta == null) delta = 0;
    if (!delta && reason !== "attempt_wrong") return readLedger();
    var ledger = readLedger();
    ledger.balance = (ledger.balance || 0) + delta;
    ledger.history = ledger.history || [];
    ledger.history.unshift({
      at: new Date().toISOString(),
      delta: delta,
      reason: reason,
      ref: opts.ref || null,
    });
    if (ledger.history.length > 500) ledger.history = ledger.history.slice(0, 500);
    writeLedger(ledger);
    return ledger;
  }

  function updateChip(ledger) {
    ledger = ledger || readLedger();
    var chip = document.getElementById("q-account-chip");
    if (!chip) return;
    var bal = chip.querySelector(".q-acc-points");
    if (!bal) {
      bal = document.createElement("span");
      bal.className = "q-acc-points";
      bal.style.cssText =
        "font-size:0.7rem;font-weight:600;color:var(--color-oxide,#b8432f);margin-left:0.15rem;font-variant-numeric:tabular-nums";
      chip.appendChild(bal);
    }
    bal.textContent = "· " + (ledger.balance || 0) + " pts";
  }

  function boot() {
    setTimeout(function () {
      updateChip();
    }, 600);
    setTimeout(updateChip, 1800);
    global.addEventListener("quintile-account-change", function () {
      updateChip();
    });
    global.addEventListener("quintile-points", function (ev) {
      updateChip(ev.detail);
    });
  }

  global.QuintilePoints = {
    AWARDS: AWARDS, // TODO provisional
    award: award,
    balance: function () {
      return readLedger().balance || 0;
    },
    ledger: readLedger,
    updateChip: updateChip,
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})(window);
