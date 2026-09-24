/**
 * Quintile local accounts (no email, no server).
 * Registry: localStorage['quintile-accounts']
 * Profiles: localStorage['quintile-profile-'+id]
 * Active progress mirror: localStorage['quire-progress'] (Zustand shape)
 */
(function (global) {
  "use strict";

  var REG_KEY = "quintile-accounts";
  var PROGRESS_KEY = "quire-progress";
  var PROFILE_PREFIX = "quintile-profile-";
  var TRAVELER = "Traveler";

  function uuid() {
    if (global.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
    });
  }

  function emptyProgress() {
    return { questions: {}, skills: {}, topics: {}, history: [], days: [], notes: {} };
  }

  function emptyProfile(meta) {
    return {
      progress: emptyProgress(),
      attempts: [],
      meta: meta || {},
    };
  }

  function readReg() {
    try {
      var raw = localStorage.getItem(REG_KEY);
      if (!raw) return { activeId: null, accounts: [] };
      var o = JSON.parse(raw);
      if (!o || !Array.isArray(o.accounts)) return { activeId: null, accounts: [] };
      return o;
    } catch (e) {
      return { activeId: null, accounts: [] };
    }
  }

  function writeReg(reg) {
    localStorage.setItem(REG_KEY, JSON.stringify(reg));
  }

  function profileKey(id) {
    return PROFILE_PREFIX + id;
  }

  function readProfile(id) {
    try {
      var raw = localStorage.getItem(profileKey(id));
      if (!raw) return emptyProfile();
      var o = JSON.parse(raw);
      if (!o.progress) o.progress = emptyProgress();
      if (!Array.isArray(o.attempts)) o.attempts = [];
      if (!o.meta) o.meta = {};
      return o;
    } catch (e) {
      return emptyProfile();
    }
  }

  function writeProfile(id, profile) {
    localStorage.setItem(profileKey(id), JSON.stringify(profile));
  }

  function readProgress() {
    try {
      var raw = localStorage.getItem(PROGRESS_KEY);
      if (!raw) return emptyProgress();
      var o = JSON.parse(raw);
      // Zustand persist may wrap as { state: {...}, version }
      if (o && o.state && (o.state.questions || o.state.skills)) return o.state;
      if (o && (o.questions || o.skills || o.history)) return o;
      return emptyProgress();
    } catch (e) {
      return emptyProgress();
    }
  }

  function writeProgress(progress) {
    // Preserve Zustand persist envelope if present
    try {
      var raw = localStorage.getItem(PROGRESS_KEY);
      if (raw) {
        var o = JSON.parse(raw);
        if (o && o.state && typeof o.version !== "undefined") {
          o.state = progress;
          localStorage.setItem(PROGRESS_KEY, JSON.stringify(o));
          return;
        }
      }
    } catch (e) {}
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  }

  function bufToHex(buf) {
    return Array.from(new Uint8Array(buf))
      .map(function (b) {
        return b.toString(16).padStart(2, "0");
      })
      .join("");
  }

  function randomSalt() {
    var a = new Uint8Array(16);
    crypto.getRandomValues(a);
    return bufToHex(a);
  }

  async function hashPin(pin, salt) {
    var enc = new TextEncoder();
    var data = enc.encode(String(salt) + ":" + String(pin));
    var dig = await crypto.subtle.digest("SHA-256", data);
    return bufToHex(dig);
  }

  function syncProgressIntoActive() {
    var reg = readReg();
    if (!reg.activeId) return;
    var profile = readProfile(reg.activeId);
    profile.progress = readProgress();
    writeProfile(reg.activeId, profile);
  }

  function activateProfile(id) {
    var reg = readReg();
    var acc = reg.accounts.find(function (a) {
      return a.id === id;
    });
    if (!acc) return false;
    // Save current first
    if (reg.activeId && reg.activeId !== id) syncProgressIntoActive();
    var profile = readProfile(id);
    writeProgress(profile.progress || emptyProgress());
    reg.activeId = id;
    writeReg(reg);
    dispatchChange();
    return true;
  }

  function ensureTraveler() {
    var reg = readReg();
    if (reg.activeId) {
      var ok = reg.accounts.some(function (a) {
        return a.id === reg.activeId;
      });
      if (ok) {
        // Mirror progress out once so existing quire-progress is claimed
        var cur = readProgress();
        var has =
          Object.keys(cur.questions || {}).length ||
          Object.keys(cur.skills || {}).length ||
          (cur.history && cur.history.length);
        var prof = readProfile(reg.activeId);
        var ph =
          Object.keys(prof.progress.questions || {}).length ||
          Object.keys(prof.progress.skills || {}).length ||
          (prof.progress.history && prof.progress.history.length);
        if (has && !ph) {
          prof.progress = cur;
          writeProfile(reg.activeId, prof);
        } else if (!has && ph) {
          writeProgress(prof.progress);
        }
        return getActive();
      }
    }
    var existing = reg.accounts.find(function (a) {
      return a.username === TRAVELER && !a.pinHash;
    });
    if (existing) {
      activateProfile(existing.id);
      return getActive();
    }
    var id = uuid();
    var account = {
      id: id,
      username: TRAVELER,
      pinSalt: "",
      pinHash: "",
      createdAt: new Date().toISOString(),
    };
    var progress = readProgress();
    writeProfile(id, { progress: progress, attempts: [], meta: { guest: true } });
    reg.accounts.push(account);
    reg.activeId = id;
    writeReg(reg);
    dispatchChange();
    return getActive();
  }

  function getActive() {
    var reg = readReg();
    if (!reg.activeId) return null;
    var acc = reg.accounts.find(function (a) {
      return a.id === reg.activeId;
    });
    if (!acc) return null;
    return {
      id: acc.id,
      username: acc.username,
      hasPin: !!acc.pinHash,
      createdAt: acc.createdAt,
      locked: !!acc._locked,
    };
  }

  function listAccounts() {
    return readReg().accounts.map(function (a) {
      return {
        id: a.id,
        username: a.username,
        hasPin: !!a.pinHash,
        createdAt: a.createdAt,
        active: a.id === readReg().activeId,
      };
    });
  }

  async function createAccount(username, pin) {
    username = String(username || "").trim().slice(0, 32);
    if (!username) throw new Error("Username required");
    var reg = readReg();
    if (
      reg.accounts.some(function (a) {
        return a.username.toLowerCase() === username.toLowerCase();
      })
    ) {
      throw new Error("That name is already taken on this device");
    }
    syncProgressIntoActive();
    var id = uuid();
    var pinSalt = "";
    var pinHash = "";
    pin = pin == null ? "" : String(pin).trim();
    if (pin) {
      if (!/^\d{4,6}$/.test(pin)) throw new Error("PIN must be 4–6 digits");
      pinSalt = randomSalt();
      pinHash = await hashPin(pin, pinSalt);
    }
    var account = {
      id: id,
      username: username,
      pinSalt: pinSalt,
      pinHash: pinHash,
      createdAt: new Date().toISOString(),
    };
    writeProfile(id, emptyProfile({ createdFrom: "ui" }));
    reg.accounts.push(account);
    reg.activeId = id;
    writeReg(reg);
    writeProgress(emptyProgress());
    dispatchChange();
    return getActive();
  }

  async function switchAccount(id, pin) {
    var reg = readReg();
    var acc = reg.accounts.find(function (a) {
      return a.id === id;
    });
    if (!acc) throw new Error("Account not found");
    if (acc.pinHash) {
      pin = pin == null ? "" : String(pin).trim();
      if (!pin) throw new Error("PIN required");
      var h = await hashPin(pin, acc.pinSalt);
      if (h !== acc.pinHash) throw new Error("Wrong PIN");
    }
    activateProfile(id);
    return getActive();
  }

  async function setPin(pin) {
    var reg = readReg();
    var acc = reg.accounts.find(function (a) {
      return a.id === reg.activeId;
    });
    if (!acc) throw new Error("No active account");
    pin = pin == null ? "" : String(pin).trim();
    if (!pin) {
      acc.pinSalt = "";
      acc.pinHash = "";
    } else {
      if (!/^\d{4,6}$/.test(pin)) throw new Error("PIN must be 4–6 digits");
      acc.pinSalt = randomSalt();
      acc.pinHash = await hashPin(pin, acc.pinSalt);
    }
    writeReg(reg);
    dispatchChange();
  }

  function exportActive() {
    var reg = readReg();
    if (!reg.activeId) throw new Error("No active account");
    syncProgressIntoActive();
    var acc = reg.accounts.find(function (a) {
      return a.id === reg.activeId;
    });
    var profile = readProfile(reg.activeId);
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      account: {
        id: acc.id,
        username: acc.username,
        pinSalt: acc.pinSalt,
        pinHash: acc.pinHash,
        createdAt: acc.createdAt,
      },
      profile: profile,
    };
  }

  function downloadExport() {
    var data = exportActive();
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    var a = document.createElement("a");
    var name = (data.account.username || "profile").replace(/[^\w.-]+/g, "_");
    a.href = URL.createObjectURL(blob);
    a.download = "quintile-" + name + ".json";
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 500);
  }

  async function importProfile(obj, opts) {
    opts = opts || {};
    if (!obj || !obj.account || !obj.profile) throw new Error("Invalid profile JSON");
    var reg = readReg();
    syncProgressIntoActive();
    var id = opts.keepId && obj.account.id ? obj.account.id : uuid();
    var username = String(obj.account.username || "Imported").slice(0, 32);
    var base = username;
    var n = 2;
    while (
      reg.accounts.some(function (a) {
        return a.username.toLowerCase() === username.toLowerCase() && a.id !== id;
      })
    ) {
      username = base + "-" + n++;
    }
    var existingIdx = reg.accounts.findIndex(function (a) {
      return a.id === id;
    });
    var account = {
      id: id,
      username: username,
      pinSalt: obj.account.pinSalt || "",
      pinHash: obj.account.pinHash || "",
      createdAt: obj.account.createdAt || new Date().toISOString(),
    };
    if (existingIdx >= 0) reg.accounts[existingIdx] = account;
    else reg.accounts.push(account);
    writeProfile(id, {
      progress: obj.profile.progress || emptyProgress(),
      attempts: Array.isArray(obj.profile.attempts) ? obj.profile.attempts : [],
      meta: obj.profile.meta || { importedAt: new Date().toISOString() },
    });
    reg.activeId = id;
    writeReg(reg);
    writeProgress(obj.profile.progress || emptyProgress());
    dispatchChange();
    return getActive();
  }

  function getActiveProfileData() {
    var reg = readReg();
    if (!reg.activeId) return null;
    syncProgressIntoActive();
    return readProfile(reg.activeId);
  }

  function mergeAttempts(newAttempts) {
    var reg = readReg();
    if (!reg.activeId || !newAttempts || !newAttempts.length) return;
    var profile = readProfile(reg.activeId);
    var seen = {};
    profile.attempts.forEach(function (a) {
      if (a && a.id) seen[a.id] = true;
    });
    newAttempts.forEach(function (a) {
      if (a && a.id && !seen[a.id]) {
        profile.attempts.push(a);
        seen[a.id] = true;
      }
    });
    if (profile.attempts.length > 5000) {
      profile.attempts = profile.attempts.slice(-5000);
    }
    writeProfile(reg.activeId, profile);
  }

  function dispatchChange() {
    try {
      global.dispatchEvent(
        new CustomEvent("quintile-account-change", { detail: getActive() })
      );
    } catch (e) {}
    renderChip();
  }

  /* ---------- UI chip + modal ---------- */
  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === "className") n.className = attrs[k];
        else if (k === "text") n.textContent = attrs[k];
        else if (k === "html") n.innerHTML = attrs[k];
        else if (k.indexOf("on") === 0) n.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
        else n.setAttribute(k, attrs[k]);
      });
    }
    (kids || []).forEach(function (c) {
      if (c == null) return;
      n.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return n;
  }

  function initial(name) {
    return (name || "?").trim().charAt(0).toUpperCase() || "?";
  }

  function closeModal() {
    var m = document.getElementById("q-account-modal");
    if (m) m.remove();
  }

  function openModal() {
    closeModal();
    var active = getActive();
    var accounts = listAccounts();
    var backdrop = el("div", { id: "q-account-modal", className: "q-acc-backdrop", role: "dialog", "aria-modal": "true" });
    var panel = el("div", { className: "q-acc-panel" });
    panel.appendChild(
      el("div", { className: "q-acc-head" }, [
        el("h2", { text: "Accounts" }),
        el("button", { type: "button", className: "q-acc-x", text: "×", onClick: closeModal }),
      ])
    );
    panel.appendChild(
      el("p", {
        className: "q-acc-note",
        text: "Local only — no email, no server. Optional PIN is a soft lock on this device.",
      })
    );

    var list = el("ul", { className: "q-acc-list" });
    accounts.forEach(function (a) {
      var li = el("li", { className: a.active ? "active" : "" });
      li.appendChild(el("span", { className: "q-acc-av", text: initial(a.username) }));
      li.appendChild(
        el("span", { className: "q-acc-name" }, [
          a.username + (a.hasPin ? " 🔒" : "") + (a.active ? " · active" : ""),
        ])
      );
      if (!a.active) {
        li.appendChild(
          el("button", {
            type: "button",
            className: "q-acc-btn",
            text: "Switch",
            onClick: function () {
              doSwitch(a);
            },
          })
        );
      }
      list.appendChild(li);
    });
    panel.appendChild(list);

    var form = el("div", { className: "q-acc-form" });
    form.appendChild(el("h3", { text: "Create profile" }));
    var nameIn = el("input", {
      type: "text",
      placeholder: "Display name",
      maxlength: "32",
      className: "q-acc-input",
      autocomplete: "username",
    });
    var pinIn = el("input", {
      type: "password",
      inputmode: "numeric",
      pattern: "[0-9]*",
      placeholder: "Optional PIN (4–6 digits)",
      maxlength: "6",
      className: "q-acc-input",
      autocomplete: "new-password",
    });
    var err = el("p", { className: "q-acc-err", text: "" });
    form.appendChild(nameIn);
    form.appendChild(pinIn);
    form.appendChild(err);
    form.appendChild(
      el("button", {
        type: "button",
        className: "q-acc-btn primary",
        text: "Create & switch",
        onClick: async function () {
          err.textContent = "";
          try {
            await createAccount(nameIn.value, pinIn.value);
            closeModal();
            openModal();
          } catch (e) {
            err.textContent = e.message || String(e);
          }
        },
      })
    );
    panel.appendChild(form);

    var actions = el("div", { className: "q-acc-actions" });
    actions.appendChild(
      el("button", {
        type: "button",
        className: "q-acc-btn",
        text: active && active.hasPin ? "Change PIN" : "Set PIN",
        onClick: async function () {
          var p = prompt("New PIN (4–6 digits), or leave blank to remove:");
          if (p === null) return;
          try {
            await setPin(p);
            closeModal();
            openModal();
          } catch (e) {
            alert(e.message || String(e));
          }
        },
      })
    );
    actions.appendChild(
      el("button", {
        type: "button",
        className: "q-acc-btn",
        text: "Export JSON",
        onClick: function () {
          try {
            downloadExport();
          } catch (e) {
            alert(e.message || String(e));
          }
        },
      })
    );
    var fileIn = el("input", { type: "file", accept: "application/json,.json", className: "q-acc-file" });
    fileIn.addEventListener("change", function () {
      var f = fileIn.files && fileIn.files[0];
      if (!f) return;
      var reader = new FileReader();
      reader.onload = async function () {
        try {
          var obj = JSON.parse(String(reader.result));
          await importProfile(obj);
          closeModal();
          openModal();
        } catch (e) {
          alert(e.message || String(e));
        }
      };
      reader.readAsText(f);
    });
    actions.appendChild(
      el("button", {
        type: "button",
        className: "q-acc-btn",
        text: "Import JSON",
        onClick: function () {
          fileIn.click();
        },
      })
    );
    actions.appendChild(fileIn);
    panel.appendChild(actions);

    backdrop.appendChild(panel);
    backdrop.addEventListener("click", function (ev) {
      if (ev.target === backdrop) closeModal();
    });
    document.body.appendChild(backdrop);
  }

  async function doSwitch(a) {
    try {
      var pin = "";
      if (a.hasPin) {
        pin = prompt("PIN for " + a.username + ":");
        if (pin === null) return;
      }
      await switchAccount(a.id, pin);
      closeModal();
    } catch (e) {
      alert(e.message || String(e));
    }
  }

  function renderChip() {
    var active = getActive();
    if (!active) return;
    var chip = document.getElementById("q-account-chip");
    if (!chip) {
      chip = el("button", {
        id: "q-account-chip",
        type: "button",
        className: "q-acc-chip",
        title: "Account",
        onClick: openModal,
      });
      // Prefer header right side
      var headerInner =
        document.querySelector("header .mx-auto.flex") ||
        document.querySelector("body > div > header > div") ||
        document.querySelector("header");
      if (headerInner) {
        headerInner.appendChild(chip);
      } else {
        chip.classList.add("q-acc-chip-float");
        document.body.appendChild(chip);
      }
    }
    chip.innerHTML = "";
    chip.appendChild(el("span", { className: "q-acc-av", text: initial(active.username) }));
    chip.appendChild(el("span", { className: "q-acc-chip-name", text: active.username }));
  }

  // Sync loop: copy quire-progress back into active profile
  var lastProgSnap = "";
  function tickSync() {
    try {
      var raw = localStorage.getItem(PROGRESS_KEY) || "";
      if (raw !== lastProgSnap) {
        lastProgSnap = raw;
        syncProgressIntoActive();
        if (global.__quintileOnProgressWrite) {
          try {
            global.__quintileOnProgressWrite(readProgress());
          } catch (e) {}
        }
      }
    } catch (e) {}
  }

  function injectExtraLinks() {
    try {
      var path = location.pathname || "";
      if (path.indexOf("/progress") < 0) return;
      if (document.getElementById("q-extra-links")) return;
      var main = document.querySelector("main");
      if (!main) return;
      var bar = document.createElement("div");
      bar.id = "q-extra-links";
      bar.style.cssText = "display:flex;flex-wrap:wrap;gap:0.5rem;margin-bottom:1rem";
      var base = window.__QUINTILE_BASE__ || "";
      [["Tree","/tree/"],["Games","/games/"],["Just practice","/practice/?mode=practice&auto=1"],["Practice","/practice/?skill=indices"],["Algebra dojo","/dojo/algebra/"],["Integrals dojo","/dojo/integrals/"]].forEach(function (pair) {
        var a = document.createElement("a");
        a.href = base + pair[1];
        a.textContent = pair[0];
        a.style.cssText = "border-radius:999px;padding:0.35rem 0.85rem;font-size:0.8125rem;font-weight:500;border:1px solid var(--color-line,#e3d9cc);text-decoration:none;color:inherit;background:var(--color-sheet,#fbf8f3)";
        bar.appendChild(a);
      });
      main.insertBefore(bar, main.firstChild);
    } catch (e) {}
  }

  function boot() {
    ensureTraveler();
    renderChip();
    injectExtraLinks();
    setTimeout(injectExtraLinks, 800);
    setInterval(tickSync, 1000);
    global.addEventListener("storage", function (ev) {
      if (ev.key === PROGRESS_KEY || (ev.key && ev.key.indexOf(PROFILE_PREFIX) === 0) || ev.key === REG_KEY) {
        tickSync();
        renderChip();
      }
    });
    global.addEventListener("beforeunload", function () {
      syncProgressIntoActive();
    });
    // Re-render chip after React hydrates header
    setTimeout(renderChip, 400);
    setTimeout(renderChip, 1500);
  }

  function patchActiveMeta(mutator) {
    var reg = readReg();
    if (!reg.activeId) return null;
    var profile = readProfile(reg.activeId);
    if (!profile.meta || typeof profile.meta !== "object") profile.meta = {};
    if (typeof mutator === "function") mutator(profile.meta);
    writeProfile(reg.activeId, profile);
    return profile.meta;
  }

  var api = {
    ensureTraveler: ensureTraveler,
    getActive: getActive,
    listAccounts: listAccounts,
    createAccount: createAccount,
    switchAccount: switchAccount,
    setPin: setPin,
    exportActive: exportActive,
    downloadExport: downloadExport,
    importProfile: importProfile,
    getActiveProfileData: getActiveProfileData,
    patchActiveMeta: patchActiveMeta,
    mergeAttempts: mergeAttempts,
    syncProgressIntoActive: syncProgressIntoActive,
    readProgress: readProgress,
    openModal: openModal,
    REG_KEY: REG_KEY,
    PROGRESS_KEY: PROGRESS_KEY,
  };
  global.QuintileAccount = api;

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})(window);
