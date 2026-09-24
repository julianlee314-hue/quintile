/**
 * Quintile detailed skills tech tree — side-scrolling eras.
 */
(function () {
  "use strict";

  var BASE = window.__QUINTILE_BASE__ || "";
  function url(path) {
    if (!path) return BASE + "/";
    if (path.charAt(0) === "/") return BASE + path;
    return BASE + "/" + path;
  }

  var state = {
    data: null,
    nodesById: {},
    nodeState: {},
    selected: null,
  };

  function readProgress() {
    if (window.QuintileAccount && QuintileAccount.readProgress) {
      return QuintileAccount.readProgress();
    }
    try {
      var raw = localStorage.getItem("quire-progress");
      if (!raw) return { questions: {}, skills: {}, topics: {}, history: [] };
      var o = JSON.parse(raw);
      if (o && o.state) return o.state;
      return o;
    } catch (e) {
      return { questions: {}, skills: {}, topics: {}, history: [] };
    }
  }

  function readAttempts() {
    if (window.QuintileAttempts && QuintileAttempts.listActive) {
      return QuintileAttempts.listActive();
    }
    try {
      if (!window.QuintileAccount) return [];
      var p = QuintileAccount.getActiveProfileData();
      return (p && p.attempts) || [];
    } catch (e) {
      return [];
    }
  }

  function ratio(earned, total) {
    if (!total) return 0;
    return earned / total;
  }

  function computeStates(data) {
    var progress = readProgress();
    var attempts = readAttempts();
    var skills = progress.skills || {};
    var topics = progress.topics || {};
    var questions = progress.questions || {};

    var attemptHits = Object.create(null);
    attempts.forEach(function (a) {
      var keys = [a.skillId, a.itemId, a.topicId, a.questionId].filter(Boolean);
      keys.forEach(function (k) {
        if (!attemptHits[k]) attemptHits[k] = { n: 0, correct: 0 };
        attemptHits[k].n++;
        if (a.correct) attemptHits[k].correct++;
      });
      if (a.skillId && a.itemId) {
        var ik = a.skillId + ":" + a.itemId;
        if (!attemptHits[ik]) attemptHits[ik] = { n: 0, correct: 0 };
        attemptHits[ik].n++;
        if (a.correct) attemptHits[ik].correct++;
      }
    });

    var nodeProg = Object.create(null);

    function markProgress(id, level, score) {
      var cur = nodeProg[id];
      if (!cur || score > cur.score) nodeProg[id] = { level: level, score: score };
    }

    data.nodes.forEach(function (n) {
      // Mastery/SRS for skill topics & dojo skills
      if ((n.kind === "skill-topic" || n.kind === "dojo") && n.skillId && window.QuintileMastery) {
        var ms = QuintileMastery.getTreeState(n.skillId);
        var map = { learning: ["learning", 0.3], earned: ["earned", 0.85], due: ["due", 0.7], lapsed: ["lapsed", 0.1], secure: ["secure", 1] };
        var mm = map[ms] || (ms === "red-lapsed" ? ["lapsed", 0.1] : null);
        if (mm) markProgress(n.id, mm[0], mm[1]);
        else if (attemptHits[n.skillId]) markProgress(n.id, "learning", 0.2);
      } else if (n.kind === "skill-topic" && n.skillId && skills[n.skillId]) {
        // Legacy fallback before mastery.js
        var s = skills[n.skillId];
        if (s.mastered) markProgress(n.id, "earned", 1);
        else if ((s.runs || 0) > 0 || attemptHits[n.skillId]) markProgress(n.id, "learning", 0.3);
      }
      if (n.kind === "skill-item" && n.itemId) {
        var hit = attemptHits[n.itemId] || attemptHits[(n.skillId || "") + ":" + n.itemId];
        if (n.skillId && window.QuintileMastery) {
          var msi = QuintileMastery.getSkill(n.skillId);
          if (msi && msi.status === "secure") markProgress(n.id, "secure", 1);
          else if (msi && msi.status === "earned") markProgress(n.id, "earned", 0.85);
          else if (msi && msi.status === "due") markProgress(n.id, "due", 0.7);
          else if (msi && msi.status === "lapsed") markProgress(n.id, "lapsed", 0.1);
          else if (msi && (msi.streak || 0) > 0) markProgress(n.id, "learning", 0.3);
        } else if (hit) {
          markProgress(n.id, hit.correct > 0 ? "learning" : "available", 0.2);
        }
      }
      if ((n.kind === "track-leaf" || n.kind === "foundation-leaf" || n.kind === "syllabus-leaf") && n.topicId) {
        var t = topics[n.topicId];
        if (t) {
          var tr = t.bestRatio != null ? t.bestRatio : ratio(t.lastEarned || 0, Math.max(1, t.lastTotal || 1));
          if (tr >= 0.85) markProgress(n.id, "mastered", tr);
          else if (tr >= 0.45) markProgress(n.id, "mastering", tr);
          else if ((t.runs || 0) > 0) markProgress(n.id, "attempted", tr);
        }
        if (attemptHits[n.topicId] && !nodeProg[n.id]) markProgress(n.id, "attempted", 0.25);
      }
      if (n.kind === "course" && n.courseId) {
        // aggregate child progress later
      }
    });

    // Course aggregate
    data.nodes.forEach(function (n) {
      if (n.kind !== "course") return;
      var kids = data.nodes.filter(function (c) {
        return c.courseId === n.courseId && c.kind !== "course" && c.kind !== "era";
      });
      if (!kids.length) return;
      var scored = 0;
      var sum = 0;
      kids.forEach(function (c) {
        var p = nodeProg[c.id];
        if (!p) return;
        scored++;
        sum += p.score || 0.2;
      });
      if (!scored) return;
      var avg = sum / kids.length;
      if (avg >= 0.7 && scored / kids.length >= 0.5) markProgress(n.id, "earned", avg);
      else if (avg >= 0.35) markProgress(n.id, "learning", avg);
      else markProgress(n.id, "learning", avg * 0.5);
    });

    // Unlock lock state from requires (course requires + sequential). Soft lock: only lock if ALL prereqs unmet and prereq exists.
    var result = Object.create(null);
    function isSecure(id) {
      var p = nodeProg[id];
      return p && (p.level === "earned" || p.level === "secure" || p.level === "due" || p.level === "mastered" || p.level === "mastering");
    }
    function isTouched(id) {
      return !!nodeProg[id];
    }

    data.nodes.forEach(function (n) {
      var reqs = (n.requires || []).filter(function (r) {
        // ignore contains/era edges for locking — only sequence/requires/prepares from edges of those kinds
        var src = state.nodesById[r];
        if (!src) return false;
        // Don't lock children behind their parent course/era hub
        if (src.kind === "era") return false;
        if (src.kind === "course" && n.kind !== "course") return false;
        if (n.kind === "skill-item" && src.kind === "skill-topic") return false;
        if ((n.kind === "foundation-leaf" || n.kind === "track-leaf" || n.kind === "syllabus-leaf") && (src.kind === "foundation" || src.kind === "course"))
          return false;
        return true;
      });
      // Only sequential predecessors among same kind for locking
      var seqReqs = reqs.filter(function (r) {
        var src = state.nodesById[r];
        return src && src.kind === n.kind;
      });
      var locked = false;
      if (seqReqs.length) {
        locked = seqReqs.some(function (r) {
          return !isTouched(r) && !isSecure(r);
        });
        // Soften: first item in a chain never locked; if previous attempted OK
        // If ANY previous is touched, unlock
        if (seqReqs.some(isTouched) || seqReqs.every(function (r) {
          // unlock when previous course hub progressed for course nodes
          return false;
        })) {
          /* keep locked calc */
        }
        // Recompute softer: lock only if the immediate previous sequential node has zero progress
        var immediate = seqReqs[seqReqs.length - 1];
        locked = immediate && !isTouched(immediate) && !isSecure(immediate);
        // First nodes: if this node is first in its group (no seq req of same kind), unlocked
        if (!immediate) locked = false;
      }
      // Course-level requires: lock course if none of requires are touched
      if (n.kind === "course" && (n.requires || []).length) {
        var courseReqs = (n.requires || []).filter(function (r) {
          return state.nodesById[r] && state.nodesById[r].kind === "course";
        });
        if (courseReqs.length && !courseReqs.some(isTouched) && !courseReqs.some(isSecure)) {
          // still available — map says nothing is locked; keep soft available
          locked = false;
        }
      }

      if (nodeProg[n.id]) {
        var lv = nodeProg[n.id].level;
        if (lv === "mastered") lv = "earned";
        if (lv === "mastering" || lv === "attempted") lv = "learning";
        result[n.id] = lv;
      } else if (locked && n.kind !== "era" && n.kind !== "course") {
        result[n.id] = "locked";
      } else {
        result[n.id] = "available";
      }
      // Eras always available/mastered lightly
      if (n.kind === "era") result[n.id] = nodeProg[n.id] ? nodeProg[n.id].level : "available";
    });

    // Ignore unused questions var lint
    void questions;
    return result;
  }

  function kindLabel(k) {
    return (
      {
        era: "Era",
        course: "Course",
        foundation: "Foundations unit",
        "foundation-leaf": "Foundation",
        "track-leaf": "Track topic",
        "syllabus-leaf": "Syllabus",
        "skill-topic": "Skill set",
        "skill-item": "Drill item",
      }[k] || k
    );
  }

  function motifUrl(name) {
    return url("/assets/motifs/" + (name || "hub") + ".svg");
  }

  function render() {
    var root = document.getElementById("tree-root");
    if (!root || !state.data) return;
    state.nodeState = computeStates(state.data);

    var eras = state.data.eras;
    var byEra = {};
    eras.forEach(function (e) {
      byEra[e.id] = [];
    });
    // Sort nodes within era: courses by row, then leaves, prefer hubs first
    var kindOrder = { era: 0, course: 1, foundation: 2, "skill-topic": 3, "foundation-leaf": 4, "track-leaf": 4, "syllabus-leaf": 4, "skill-item": 5 };
    state.data.nodes.forEach(function (n) {
      if (n.kind === "era") return; // shown in header
      var era = n.era || "counting";
      if (!byEra[era]) byEra[era] = [];
      byEra[era].push(n);
    });
    Object.keys(byEra).forEach(function (eid) {
      byEra[eid].sort(function (a, b) {
        var ko = (kindOrder[a.kind] || 9) - (kindOrder[b.kind] || 9);
        if (ko) return ko;
        var cr = (a.courseRow || 0) - (b.courseRow || 0);
        if (cr) return cr;
        return (a.row || 0) - (b.row || 0);
      });
      // Cap skill-items visibility: show topics + sample; keep all but collapse visually by limiting? User wants ALL detailed leaves — keep all.
    });

    var scroller = document.createElement("div");
    scroller.className = "tree-scroller";
    scroller.id = "tree-scroller";

    eras.forEach(function (era) {
      var col = document.createElement("section");
      col.className = "tree-era";
      col.dataset.era = era.id;
      var head = document.createElement("div");
      head.className = "tree-era-head";
      head.innerHTML = '<p class="tree-era-num">' + era.numeral + '</p><p class="tree-era-title">' + era.title + "</p>";
      col.appendChild(head);
      var body = document.createElement("div");
      body.className = "tree-era-body";
      body.id = "era-body-" + era.id;

      (byEra[era.id] || []).forEach(function (n) {
        // Skip skill-items in main stream to keep readable — put behind skill topics in panel only? Spec says ALL detailed leaves. Include but skill-items are many.
        // Include everything except we already skipped era hubs.
        body.appendChild(nodeEl(n));
      });
      col.appendChild(body);
      scroller.appendChild(col);
    });

    root.innerHTML = "";
    var blobs = document.createElement("div");
    blobs.className = "tree-blobs";
    blobs.setAttribute("aria-hidden", "true");
    blobs.innerHTML = '<div class="tree-blob a"></div><div class="tree-blob b"></div><div class="tree-blob c"></div>';
    root.appendChild(blobs);
    root.appendChild(scroller);

    // Soft parallax
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      scroller.addEventListener(
        "scroll",
        function () {
          var x = scroller.scrollLeft;
          blobs.style.transform = "translateX(" + -x * 0.04 + "px)";
        },
        { passive: true }
      );
    }

    drawCrossEraHints(scroller);
  }

  function nodeEl(n) {
    var st = state.nodeState[n.id] || "available";
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tree-node kind-" + n.kind + " state-" + st;
    btn.dataset.id = n.id;
    btn.innerHTML =
      '<span class="motif"><img alt="" src="' +
      motifUrl(n.motif) +
      '" width="44" height="44" loading="lazy"/></span>' +
      '<span class="meta"><span class="kind">' +
      kindLabel(n.kind) +
      '</span><span class="title">' +
      escapeHtml(n.title) +
      "</span></span>" +
      (st === "locked" ? '<span class="lock-badge" aria-hidden="true">🔒</span>' : "");
    btn.addEventListener("click", function () {
      openPanel(n);
    });
    return btn;
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function drawCrossEraHints() {
    // Edges are numerous; glow is applied via state on nodes. Optional thin connectors skipped for perf on mobile.
  }

  function openPanel(n) {
    state.selected = n;
    var panel = document.getElementById("tree-panel");
    if (!panel) return;
    var st = state.nodeState[n.id] || "available";
    var unlocks = (n.unlocks || [])
      .map(function (id) {
        return state.nodesById[id];
      })
      .filter(Boolean)
      .slice(0, 12);
    var requires = (n.requires || [])
      .map(function (id) {
        return state.nodesById[id];
      })
      .filter(Boolean)
      .slice(0, 8);

    var attempts = readAttempts()
      .filter(function (a) {
        return (
          (n.skillId && a.skillId === n.skillId) ||
          (n.itemId && a.itemId === n.itemId) ||
          (n.topicId && (a.topicId === n.topicId || a.questionId === n.topicId)) ||
          (n.courseId && a.courseId === n.courseId)
        );
      })
      .slice(-8)
      .reverse();

    panel.innerHTML = "";
    var head = document.createElement("div");
    head.className = "tree-panel-head";
    head.innerHTML = "<h2>" + escapeHtml(n.title) + "</h2>";
    var close = document.createElement("button");
    close.type = "button";
    close.className = "close";
    close.setAttribute("aria-label", "Close");
    close.textContent = "×";
    close.addEventListener("click", closePanel);
    head.appendChild(close);
    panel.appendChild(head);

    var badge = document.createElement("span");
    badge.className = "tree-panel-state";
    badge.textContent = st + " · " + kindLabel(n.kind);
    panel.appendChild(badge);

    if (n.blurb) {
      var bl = document.createElement("p");
      bl.className = "blurb";
      bl.textContent = n.blurb;
      panel.appendChild(bl);
    }
    if (n.hlLink) {
      var hl = document.createElement("p");
      hl.className = "blurb";
      hl.textContent = n.hlLink;
      panel.appendChild(hl);
    }

    if (requires.length) {
      var rl = document.createElement("div");
      rl.className = "section-label";
      rl.textContent = "Requires";
      panel.appendChild(rl);
      var ru = document.createElement("ul");
      requires.forEach(function (x) {
        var li = document.createElement("li");
        li.textContent = x.title;
        ru.appendChild(li);
      });
      panel.appendChild(ru);
    }

    if (unlocks.length) {
      var ul = document.createElement("div");
      ul.className = "section-label";
      ul.textContent = "Unlocks";
      panel.appendChild(ul);
      var uu = document.createElement("ul");
      unlocks.forEach(function (x) {
        var li = document.createElement("li");
        li.textContent = x.title;
        uu.appendChild(li);
      });
      panel.appendChild(uu);
    }

    var al = document.createElement("div");
    al.className = "section-label";
    al.textContent = "Recent attempts";
    panel.appendChild(al);
    var au = document.createElement("ul");
    if (!attempts.length) {
      var empty = document.createElement("li");
      empty.textContent = "None yet — open a drill to start the log.";
      au.appendChild(empty);
    } else {
      attempts.forEach(function (a) {
        var li = document.createElement("li");
        var when = a.at ? new Date(a.at).toLocaleString() : "";
        li.textContent = (a.correct ? "✓" : "✗") + " " + (a.kind || "") + " · " + when;
        au.appendChild(li);
      });
    }
    panel.appendChild(au);

    var cta = document.createElement("a");
    cta.className = "cta";
    cta.href = url(n.href || "/");
    cta.textContent = st === "locked" ? "Preview practice" : "Practice";
    panel.appendChild(cta);
    if (n.skillId && (n.kind === "skill-topic" || n.kind === "skill-item" || n.kind === "dojo")) {
      var exam = document.createElement("a");
      exam.className = "cta";
      exam.style.marginTop = "0.5rem";
      exam.style.background = "transparent";
      exam.style.color = "var(--color-ink)";
      exam.style.border = "1px solid var(--color-ink)";
      var sid = n.skillId;
      exam.href = url("/practice/?skill=" + encodeURIComponent(sid) + "&mode=exam");
      exam.textContent = "Exam mode";
      panel.appendChild(exam);
    }

    panel.classList.add("open");
  }

  function closePanel() {
    var panel = document.getElementById("tree-panel");
    if (panel) panel.classList.remove("open");
    state.selected = null;
  }

  function boot() {
    if (window.QuintileAccount) QuintileAccount.ensureTraveler();
    fetch(url("/data/skills_tree.json"))
      .then(function (r) {
        if (!r.ok) throw new Error("tree data " + r.status);
        return r.json();
      })
      .then(function (data) {
        state.data = data;
        state.nodesById = {};
        data.nodes.forEach(function (n) {
          state.nodesById[n.id] = n;
        });
        var stats = document.getElementById("tree-stats");
        if (stats && data.stats) {
          stats.textContent =
            data.stats.nodeCount + " nodes · " + data.stats.edgeCount + " unlock edges";
        }
        render();
      })
      .catch(function (e) {
        var root = document.getElementById("tree-root");
        if (root) root.innerHTML = "<p style='padding:2rem'>Could not load tree: " + escapeHtml(e.message) + "</p>";
      });

    window.addEventListener("quintile-account-change", function () {
      render();
    });
    window.addEventListener("quintile-attempt", function () {
      render();
    });
    setInterval(function () {
      if (state.data) {
        var before = JSON.stringify(state.nodeState);
        state.nodeState = computeStates(state.data);
        if (JSON.stringify(state.nodeState) !== before) render();
      }
    }, 2500);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
