/**
 * Quintile living skills grove — one organic tree per era.
 */
(function () {
  "use strict";

  var BASE = window.__QUINTILE_BASE__ || "";
  function url(path) {
    if (!path) return BASE + "/";
    if (path.charAt(0) === "/") return BASE + path;
    return BASE + "/" + path;
  }

  var ERA_META = {
    counting: { shape: "seedling", label: "Seedling", blurb: "Heart-root at center; sprout up, roots down" },
    workshop: { shape: "willow", label: "Willow", blurb: "Trunk center with long drooping branches" },
    secondary: { shape: "oak", label: "Oak canopy", blurb: "Thick trunk, broad crown of leaves" },
    bridge: { shape: "arch", label: "Vine bridge", blurb: "Two banks joined by meeting vines" },
    diploma: { shape: "human", label: "Heart-body", blurb: "Heart center; limbs as course strands" },
    university: { shape: "constellation", label: "Constellation", blurb: "Glowing hub with radiating synapses" },
    beyond: { shape: "spiral", label: "Spiral galaxy", blurb: "Infinite spiral arms" },
  };

  var STORAGE_ERA = "quintile-tree-era";

  var state = {
    data: null,
    nodesById: {},
    nodeState: {},
    selected: null,
    eraId: null,
    positions: {},
    canvas: { w: 1600, h: 1200 },
    view: { x: 0, y: 0, scale: 1 },
    reducedMotion: false,
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
      function markFromSkill(sid, nodeId) {
        if (!sid || !window.QuintileMastery) return false;
        var tq = QuintileMastery.getTreeQuintile
          ? QuintileMastery.getTreeQuintile(sid)
          : null;
        if (tq) {
          var level = "q" + (tq.q || 0);
          if (tq.wilted) level = "wilt";
          else if (tq.due || tq.overdue) level = "due";
          var score = (tq.q || 0) / 5;
          if (tq.wilted) score = Math.max(0.05, score * 0.4);
          markProgress(nodeId, level, score);
          return true;
        }
        var ms = QuintileMastery.getTreeState(sid);
        var map = { learning: ["learning", 0.3], earned: ["earned", 0.85], due: ["due", 0.7], lapsed: ["lapsed", 0.1], secure: ["secure", 1] };
        var mm = map[ms] || (ms === "red-lapsed" ? ["lapsed", 0.1] : null);
        if (mm) {
          markProgress(nodeId, mm[0], mm[1]);
          return true;
        }
        return false;
      }
      if ((n.kind === "skill-topic" || n.kind === "dojo") && n.skillId) {
        if (!markFromSkill(n.skillId, n.id)) {
          if (skills[n.skillId]) {
            var s = skills[n.skillId];
            if (s.mastered) markProgress(n.id, "q5", 1);
            else if ((s.runs || 0) > 0 || attemptHits[n.skillId]) markProgress(n.id, "q1", 0.2);
          } else if (attemptHits[n.skillId]) markProgress(n.id, "q0", 0.1);
        }
      } else if (n.kind === "skill-topic" && n.skillId && skills[n.skillId]) {
        var s2 = skills[n.skillId];
        if (s2.mastered) markProgress(n.id, "q5", 1);
        else if ((s2.runs || 0) > 0 || attemptHits[n.skillId]) markProgress(n.id, "q1", 0.2);
      }
      if (n.kind === "skill-item" && n.itemId) {
        var hit = attemptHits[n.itemId] || attemptHits[(n.skillId || "") + ":" + n.itemId];
        if (n.skillId && !markFromSkill(n.skillId, n.id)) {
          if (hit) markProgress(n.id, hit.correct > 0 ? "q1" : "available", 0.2);
        }
      }
      if ((n.kind === "foundation-leaf" || n.kind === "track-leaf" || n.kind === "syllabus-leaf") && (n.topicId || n.skillId) && window.QuintileMastery && QuintileMastery.getTreeQuintile) {
        var tid = n.skillId || n.topicId;
        var tqq = QuintileMastery.getTreeQuintile(tid);
        if (tqq && (tqq.q > 0 || tqq.streak > 0 || tqq.wilted || tqq.due)) {
          var lv2 = tqq.wilted ? "wilt" : (tqq.due || tqq.overdue) ? "due" : ("q" + tqq.q);
          markProgress(n.id, lv2, (tqq.q || 0) / 5);
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
    });

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

    var result = Object.create(null);
    function isSecure(id) {
      var p = nodeProg[id];
      if (!p) return false;
      var lv = p.level || "";
      if (lv === "earned" || lv === "secure" || lv === "due" || lv === "mastered" || lv === "mastering") return true;
      if (/^q[1-5]$/.test(lv)) return true;
      return false;
    }
    function isTouched(id) {
      return !!nodeProg[id];
    }

    data.nodes.forEach(function (n) {
      var reqs = (n.requires || []).filter(function (r) {
        var src = state.nodesById[r];
        if (!src) return false;
        if (src.kind === "era") return false;
        if (src.kind === "course" && n.kind !== "course") return false;
        if (n.kind === "skill-item" && src.kind === "skill-topic") return false;
        if ((n.kind === "foundation-leaf" || n.kind === "track-leaf" || n.kind === "syllabus-leaf") && (src.kind === "foundation" || src.kind === "course"))
          return false;
        return true;
      });
      var seqReqs = reqs.filter(function (r) {
        var src = state.nodesById[r];
        return src && src.kind === n.kind;
      });
      var locked = false;
      if (seqReqs.length) {
        var immediate = seqReqs[seqReqs.length - 1];
        locked = immediate && !isTouched(immediate) && !isSecure(immediate);
        if (!immediate) locked = false;
      }
      if (n.kind === "course" && (n.requires || []).length) {
        locked = false;
      }

      if (nodeProg[n.id]) {
        var lv = nodeProg[n.id].level;
        if (lv === "mastered") lv = "q5";
        if (lv === "mastering" || lv === "attempted") lv = "q1";
        if (lv === "earned") lv = "q3";
        if (lv === "secure") lv = "q5";
        if (lv === "learning") lv = "q1";
        if (lv === "lapsed" || lv === "red-lapsed") lv = "wilt";
        result[n.id] = lv;
      } else if (locked && n.kind !== "era" && n.kind !== "course") {
        result[n.id] = "locked";
      } else {
        result[n.id] = "available";
      }
      if (n.kind === "era") result[n.id] = nodeProg[n.id] ? nodeProg[n.id].level : "available";
    });

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
        dojo: "Dojo",
      }[k] || k
    );
  }

  function motifUrl(name) {
    return url("/assets/motifs/" + (name || "hub") + ".svg");
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function hash01(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return ((h >>> 0) % 10000) / 10000;
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function bezierPoint(p0, p1, p2, p3, t) {
    var u = 1 - t;
    var tt = t * t;
    var uu = u * u;
    return {
      x: uu * u * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + tt * t * p3.x,
      y: uu * u * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + tt * t * p3.y,
    };
  }

  function groupEraNodes(eraId) {
    var all = state.data.nodes.filter(function (n) {
      return n.era === eraId && n.kind !== "era";
    });
    var courses = all.filter(function (n) {
      return n.kind === "course";
    });
    var hubs = all.filter(function (n) {
      return n.kind === "foundation" || n.kind === "skill-topic" || n.kind === "dojo";
    });
    var leaves = all.filter(function (n) {
      return n.kind !== "course" && n.kind !== "foundation" && n.kind !== "skill-topic" && n.kind !== "dojo";
    });
    // Group leaves by courseId
    var byCourse = Object.create(null);
    courses.forEach(function (c) {
      byCourse[c.courseId || c.id] = { course: c, kids: [] };
    });
    leaves.forEach(function (leaf) {
      var cid = leaf.courseId || "_orphan";
      if (!byCourse[cid]) byCourse[cid] = { course: null, kids: [] };
      byCourse[cid].kids.push(leaf);
    });
    hubs.forEach(function (h) {
      var cid = h.courseId || "_orphan";
      if (!byCourse[cid]) byCourse[cid] = { course: null, kids: [] };
      byCourse[cid].kids.unshift(h);
    });
    Object.keys(byCourse).forEach(function (cid) {
      byCourse[cid].kids.sort(function (a, b) {
        return (a.row || 0) - (b.row || 0) || String(a.id).localeCompare(String(b.id));
      });
    });
    courses.sort(function (a, b) {
      return (a.courseRow || 0) - (b.courseRow || 0) || String(a.id).localeCompare(String(b.id));
    });
    return { all: all, courses: courses, byCourse: byCourse, leaves: leaves, hubs: hubs };
  }

  function placeAlongCurve(nodes, curvePts, jitter) {
    var out = {};
    var n = nodes.length;
    if (!n) return out;
    nodes.forEach(function (node, i) {
      var t = n === 1 ? 0.55 : 0.12 + (0.76 * i) / (n - 1);
      var p = curvePts(t);
      var j = (hash01(node.id) - 0.5) * (jitter || 28);
      var j2 = (hash01(node.id + "|y") - 0.5) * (jitter || 28) * 0.6;
      out[node.id] = { x: p.x + j, y: p.y + j2, role: "leaf" };
    });
    return out;
  }

  /* ---------- Layout engines ---------- */

  function layoutSeedling(g) {
    var W = 1400, H = 1200;
    var cx = W / 2, cy = H * 0.48;
    var pos = {};
    var paths = [];
    var fills = [];

    // Heart silhouette (decorative)
    fills.push({
      d: "M" + cx + "," + (cy + 18) +
        " C" + (cx - 70) + "," + (cy - 40) + " " + (cx - 95) + "," + (cy - 110) + " " + cx + "," + (cy - 70) +
        " C" + (cx + 95) + "," + (cy - 110) + " " + (cx + 70) + "," + (cy - 40) + " " + cx + "," + (cy + 18) + " Z",
      cls: "skel-fill",
      fill: "#b8432f",
    });

    // Heart root node (virtual center — use first course or era heart badge)
    pos.__heart__ = { x: cx, y: cy - 20, role: "heart" };

    // Roots down
    paths.push({ d: "M" + cx + "," + (cy + 10) + " C" + (cx - 40) + "," + (cy + 80) + " " + (cx - 120) + "," + (cy + 160) + " " + (cx - 180) + "," + (cy + 280), cls: "skel-root" });
    paths.push({ d: "M" + cx + "," + (cy + 10) + " C" + (cx + 10) + "," + (cy + 100) + " " + (cx + 20) + "," + (cy + 200) + " " + (cx + 30) + "," + (cy + 320), cls: "skel-root" });
    paths.push({ d: "M" + cx + "," + (cy + 10) + " C" + (cx + 50) + "," + (cy + 90) + " " + (cx + 140) + "," + (cy + 170) + " " + (cx + 200) + "," + (cy + 290), cls: "skel-root" });

    // Sprout stem
    paths.push({ d: "M" + cx + "," + (cy - 40) + " C" + (cx - 10) + "," + (cy - 140) + " " + (cx + 10) + "," + (cy - 240) + " " + cx + "," + (cy - 340), cls: "skel-trunk" });

    var courses = g.courses;
    courses.forEach(function (c, i) {
      var side = i % 2 === 0 ? -1 : 1;
      var hx = cx + side * (160 + i * 40);
      var hy = cy - 160 - i * 70;
      pos[c.id] = { x: hx, y: hy, role: "hub" };
      paths.push({
        d: "M" + cx + "," + (cy - 80 - i * 40) + " C" + (cx + side * 40) + "," + (hy + 40) + " " + (hx - side * 30) + "," + (hy + 20) + " " + hx + "," + hy,
        cls: "skel-branch",
      });
      var kids = (g.byCourse[c.courseId] || { kids: [] }).kids;
      var branchKids = placeAlongCurve(kids, function (t) {
        var p0 = { x: hx, y: hy };
        var p3 = { x: hx + side * (120 + t * 80), y: hy - 40 - t * 160 };
        var p1 = { x: hx + side * 40, y: hy - 30 };
        var p2 = { x: p3.x - side * 20, y: hy - 80 };
        return bezierPoint(p0, p1, p2, p3, t);
      }, 18);
      Object.keys(branchKids).forEach(function (id) {
        pos[id] = branchKids[id];
      });
      // decorative drooplets
      paths.push({
        d: "M" + hx + "," + hy + " C" + (hx + side * 60) + "," + (hy - 40) + " " + (hx + side * 100) + "," + (hy - 120) + " " + (hx + side * 140) + "," + (hy - 200),
        cls: "skel-branch",
      });
    });

    // Orphans along roots
    var orphans = (g.byCourse._orphan || { kids: [] }).kids;
    orphans.forEach(function (n, i) {
      var t = (i + 1) / (orphans.length + 1);
      pos[n.id] = { x: cx + (hash01(n.id) - 0.5) * 200, y: cy + 80 + t * 240, role: "leaf" };
    });

    return { w: W, h: H, positions: pos, paths: paths, fills: fills };
  }

  function layoutWillow(g) {
    var W = 1500, H = 1300;
    var cx = W / 2, top = 160, base = H - 120;
    var pos = {};
    var paths = [];
    paths.push({ d: "M" + cx + "," + top + " Q" + (cx + 8) + "," + ((top + base) / 2) + " " + cx + "," + base, cls: "skel-trunk" });

    var courses = g.courses.length ? g.courses : [{ id: "__virtual", courseId: "_orphan", title: "Workshop" }];
    courses.forEach(function (c, i) {
      var t = (i + 1) / (courses.length + 1);
      var hy = lerp(top + 80, base - 200, t);
      var side = i % 2 === 0 ? -1 : 1;
      var hx = cx + side * 40;
      pos[c.id] = { x: hx, y: hy, role: "hub" };

      var kids = (g.byCourse[c.courseId] || g.byCourse._orphan || { kids: [] }).kids;
      var branchCount = Math.max(3, Math.ceil(kids.length / 4) || 3);
      for (var b = 0; b < branchCount; b++) {
        var spread = side * (180 + b * 90 + hash01(c.id + b) * 40);
        var drop = hy + 180 + b * 70;
        var tipX = cx + spread;
        var tipY = Math.min(base - 40, drop);
        paths.push({
          d: "M" + cx + "," + hy + " C" + (cx + side * 30) + "," + (hy + 40) + " " + (tipX - side * 40) + "," + (hy + 100) + " " + tipX + "," + tipY,
          cls: "skel-branch",
        });
      }
      kids.forEach(function (leaf, li) {
        var bi = li % branchCount;
        var u = Math.floor(li / branchCount) / Math.max(1, Math.ceil(kids.length / branchCount));
        var spread = side * (160 + bi * 85);
        var tipX = cx + spread + (hash01(leaf.id) - 0.5) * 50;
        var tipY = Math.min(base - 30, hy + 160 + bi * 65 + u * 100);
        var p0 = { x: cx, y: hy };
        var p3 = { x: tipX, y: tipY };
        var p1 = { x: cx + side * 40, y: hy + 50 };
        var p2 = { x: tipX - side * 30, y: hy + 120 };
        var pt = bezierPoint(p0, p1, p2, p3, 0.35 + u * 0.55);
        pos[leaf.id] = { x: pt.x, y: pt.y, role: "leaf" };
      });
    });

    // Place any course that was virtual skip
    if (courses[0] && courses[0].id === "__virtual") delete pos.__virtual;

    return { w: W, h: H, positions: pos, paths: paths, fills: [] };
  }

  function layoutOak(g) {
    var W = 2200, H = 1800;
    var cx = W / 2, base = H - 100, crownY = H * 0.38;
    var pos = {};
    var paths = [];
    var fills = [];

    paths.push({ d: "M" + cx + "," + (crownY + 80) + " L" + cx + "," + base, cls: "skel-trunk" });
    fills.push({
      d: "M" + cx + "," + (crownY - 320) +
        " C" + (cx - 520) + "," + (crownY - 280) + " " + (cx - 620) + "," + (crownY + 80) + " " + (cx - 280) + "," + (crownY + 220) +
        " C" + (cx - 100) + "," + (crownY + 280) + " " + (cx + 100) + "," + (crownY + 280) + " " + (cx + 280) + "," + (crownY + 220) +
        " C" + (cx + 620) + "," + (crownY + 80) + " " + (cx + 520) + "," + (crownY - 280) + " " + cx + "," + (crownY - 320) + " Z",
      cls: "skel-fill",
      fill: "#3d7a4a",
    });

    var courses = g.courses;
    courses.forEach(function (c, i) {
      var ang = -Math.PI / 2 + ((i + 0.5) / Math.max(1, courses.length)) * Math.PI * 1.4 - Math.PI * 0.7;
      var r = 180;
      pos[c.id] = { x: cx + Math.cos(ang) * r, y: crownY + Math.sin(ang) * r * 0.55, role: "hub" };
      paths.push({
        d: "M" + cx + "," + (crownY + 60) + " Q" + (cx + Math.cos(ang) * r * 0.5) + "," + (crownY + 20) + " " + pos[c.id].x + "," + pos[c.id].y,
        cls: "skel-branch",
      });
    });

    var leaves = g.leaves.concat(g.hubs);
    var n = leaves.length;
    leaves.forEach(function (leaf, i) {
      var ring = 1 + Math.floor((i / Math.max(1, n)) * 4);
      var onRing = Math.ceil(n / 4);
      var j = i % onRing;
      var a0 = -Math.PI * 0.95;
      var a1 = Math.PI * 0.15;
      var ang = a0 + ((j + hash01(leaf.id) * 0.4) / Math.max(1, onRing)) * (a1 - a0);
      // Prefer course angular sector
      if (leaf.courseId) {
        var ci = courses.findIndex(function (c) { return c.courseId === leaf.courseId; });
        if (ci >= 0) {
          var ca = -Math.PI / 2 + ((ci + 0.5) / Math.max(1, courses.length)) * Math.PI * 1.4 - Math.PI * 0.7;
          ang = ca + (hash01(leaf.id) - 0.5) * 0.55;
        }
      }
      var rr = 260 + ring * 110 + hash01(leaf.id + "r") * 40;
      pos[leaf.id] = {
        x: cx + Math.cos(ang) * rr,
        y: crownY + Math.sin(ang) * rr * 0.62 - 40,
        role: "leaf",
      };
    });

    return { w: W, h: H, positions: pos, paths: paths, fills: fills };
  }

  function layoutArch(g) {
    var W = 1800, H = 1100;
    var leftX = 280, rightX = W - 280, bankY = H * 0.62;
    var pos = {};
    var paths = [];
    // Banks
    paths.push({ d: "M80," + (bankY + 40) + " C200," + bankY + " 320," + bankY + " 420," + (bankY + 20), cls: "skel-root" });
    paths.push({ d: "M" + (W - 80) + "," + (bankY + 40) + " C" + (W - 200) + "," + bankY + " " + (W - 320) + "," + bankY + " " + (W - 420) + "," + (bankY + 20), cls: "skel-root" });
    // Meeting vines
    paths.push({ d: "M" + leftX + "," + bankY + " C" + (W * 0.35) + "," + (bankY - 280) + " " + (W * 0.65) + "," + (bankY - 280) + " " + rightX + "," + bankY, cls: "skel-vine" });
    paths.push({ d: "M" + leftX + "," + (bankY + 30) + " C" + (W * 0.38) + "," + (bankY - 180) + " " + (W * 0.62) + "," + (bankY - 180) + " " + rightX + "," + (bankY + 30), cls: "skel-vine" });
    paths.push({ d: "M" + leftX + "," + (bankY - 20) + " C" + (W * 0.4) + "," + (bankY - 360) + " " + (W * 0.6) + "," + (bankY - 360) + " " + rightX + "," + (bankY - 20), cls: "skel-vine" });

    var courses = g.courses;
    courses.forEach(function (c, i) {
      var left = i % 2 === 0;
      var hx = left ? leftX : rightX;
      var hy = bankY - 40 - Math.floor(i / 2) * 90;
      pos[c.id] = { x: hx, y: hy, role: "hub" };
      var kids = (g.byCourse[c.courseId] || { kids: [] }).kids;
      kids.forEach(function (leaf, li) {
        var t = (li + 1) / (kids.length + 1);
        var p0 = { x: hx, y: hy };
        var midX = W / 2 + (left ? -40 : 40);
        var p3 = { x: lerp(hx, midX, 0.55 + t * 0.35), y: bankY - 120 - t * 220 - (hash01(leaf.id) * 40) };
        var p1 = { x: lerp(hx, midX, 0.25), y: hy - 80 };
        var p2 = { x: lerp(hx, midX, 0.55), y: p3.y + 40 };
        var pt = bezierPoint(p0, p1, p2, p3, 0.55 + (hash01(leaf.id) * 0.3));
        pos[leaf.id] = { x: pt.x, y: pt.y, role: "leaf" };
      });
    });
    // orphans on arch crown
    ((g.byCourse._orphan || { kids: [] }).kids).forEach(function (n, i) {
      var t = (i + 1) / (((g.byCourse._orphan || {}).kids || []).length + 1);
      pos[n.id] = { x: lerp(leftX, rightX, t), y: bankY - 300 - hash01(n.id) * 60, role: "leaf" };
    });

    return { w: W, h: H, positions: pos, paths: paths, fills: [] };
  }

  function layoutHuman(g) {
    // Heart-centered body: head=analysis, arms=apps, legs=foundations
    var W = 1600, H = 1500;
    var cx = W / 2, cy = H * 0.42;
    var pos = {};
    var paths = [];
    var fills = [];

    fills.push({
      d: "M" + cx + "," + (cy + 22) +
        " C" + (cx - 55) + "," + (cy - 30) + " " + (cx - 72) + "," + (cy - 85) + " " + cx + "," + (cy - 52) +
        " C" + (cx + 72) + "," + (cy - 85) + " " + (cx + 55) + "," + (cy - 30) + " " + cx + "," + (cy + 22) + " Z",
      cls: "skel-fill",
      fill: "#b8432f",
    });
    pos.__heart__ = { x: cx, y: cy - 10, role: "heart" };

    // Skeleton limbs
    paths.push({ d: "M" + cx + "," + (cy - 50) + " C" + (cx - 5) + "," + (cy - 140) + " " + (cx + 5) + "," + (cy - 220) + " " + cx + "," + (cy - 280), cls: "skel-trunk" }); // neck/head
    paths.push({ d: "M" + cx + "," + (cy + 20) + " C" + (cx - 20) + "," + (cy + 120) + " " + (cx - 30) + "," + (cy + 220) + " " + (cx - 40) + "," + (cy + 340), cls: "skel-trunk" }); // torso
    paths.push({ d: "M" + cx + "," + (cy + 40) + " C" + (cx - 120) + "," + (cy + 20) + " " + (cx - 220) + "," + (cy - 40) + " " + (cx - 320) + "," + (cy - 80), cls: "skel-branch" }); // L arm
    paths.push({ d: "M" + cx + "," + (cy + 40) + " C" + (cx + 120) + "," + (cy + 20) + " " + (cx + 220) + "," + (cy - 40) + " " + (cx + 320) + "," + (cy - 80), cls: "skel-branch" }); // R arm
    paths.push({ d: "M" + (cx - 20) + "," + (cy + 280) + " C" + (cx - 80) + "," + (cy + 360) + " " + (cx - 120) + "," + (cy + 460) + " " + (cx - 150) + "," + (cy + 560), cls: "skel-branch" }); // L leg
    paths.push({ d: "M" + (cx + 10) + "," + (cy + 280) + " C" + (cx + 80) + "," + (cy + 360) + " " + (cx + 120) + "," + (cy + 460) + " " + (cx + 150) + "," + (cy + 560), cls: "skel-branch" }); // R leg

    function scoreCourse(c) {
      var t = (c.title || c.id || "").toLowerCase();
      if (/aa|analysis|hl|sl|diploma/.test(t)) return "head";
      if (/app|stat|model/.test(t)) return "arm";
      if (/found|pre|calc|core/.test(t)) return "leg";
      return "torso";
    }

    var slots = { head: [], arm: [], leg: [], torso: [] };
    g.courses.forEach(function (c) {
      slots[scoreCourse(c)].push(c);
    });

    // Place course hubs on body parts
    slots.head.forEach(function (c, i) {
      pos[c.id] = { x: cx + (i - (slots.head.length - 1) / 2) * 90, y: cy - 260 - i * 10, role: "hub" };
    });
    slots.arm.forEach(function (c, i) {
      var side = i % 2 === 0 ? -1 : 1;
      pos[c.id] = { x: cx + side * (280 + Math.floor(i / 2) * 40), y: cy - 40 - Math.floor(i / 2) * 50, role: "hub" };
    });
    slots.leg.forEach(function (c, i) {
      var side = i % 2 === 0 ? -1 : 1;
      pos[c.id] = { x: cx + side * (130 + Math.floor(i / 2) * 40), y: cy + 480 + Math.floor(i / 2) * 40, role: "hub" };
    });
    slots.torso.forEach(function (c, i) {
      pos[c.id] = { x: cx + (hash01(c.id) - 0.5) * 60, y: cy + 140 + i * 70, role: "hub" };
    });

    // If no courses matched head, put first analysis-ish or first course as head
    if (!slots.head.length && g.courses[0]) {
      var c0 = g.courses[0];
      pos[c0.id] = { x: cx, y: cy - 260, role: "hub" };
    }

    g.courses.forEach(function (c) {
      var hub = pos[c.id] || { x: cx, y: cy };
      var part = scoreCourse(c);
      var kids = (g.byCourse[c.courseId] || { kids: [] }).kids;
      kids.forEach(function (leaf, li) {
        var t = (li + 0.5) / Math.max(1, kids.length);
        var p;
        if (part === "head") {
          p = { x: hub.x + (hash01(leaf.id) - 0.5) * 200, y: hub.y - 40 - t * 160 };
        } else if (part === "arm") {
          var side = hub.x < cx ? -1 : 1;
          p = { x: hub.x + side * (40 + t * 160), y: hub.y + (hash01(leaf.id) - 0.5) * 120 + t * 40 };
        } else if (part === "leg") {
          var side2 = hub.x < cx ? -1 : 1;
          p = { x: hub.x + side2 * (20 + t * 80), y: hub.y + 30 + t * 140 };
        } else {
          p = { x: hub.x + (hash01(leaf.id) - 0.5) * 180, y: hub.y + t * 100 };
        }
        pos[leaf.id] = { x: p.x, y: p.y, role: "leaf" };
      });
    });

    ((g.byCourse._orphan || { kids: [] }).kids).forEach(function (n, i) {
      pos[n.id] = { x: cx + (hash01(n.id) - 0.5) * 240, y: cy + 200 + i * 36, role: "leaf" };
    });

    return { w: W, h: H, positions: pos, paths: paths, fills: fills };
  }

  function layoutConstellation(g) {
    var W = 1700, H = 1400;
    var cx = W / 2, cy = H / 2;
    var pos = {};
    var paths = [];
    var fills = [];
    fills.push({ d: "M" + (cx - 40) + "," + cy + " A40,40 0 1,0 " + (cx + 40) + "," + cy + " A40,40 0 1,0 " + (cx - 40) + "," + cy, cls: "skel-fill", fill: "#7eb8e8" });

    var courses = g.courses;
    courses.forEach(function (c, i) {
      var ang = -Math.PI / 2 + (i / Math.max(1, courses.length)) * Math.PI * 2;
      var r = 220;
      pos[c.id] = { x: cx + Math.cos(ang) * r, y: cy + Math.sin(ang) * r, role: "hub" };
      paths.push({ d: "M" + cx + "," + cy + " L" + pos[c.id].x + "," + pos[c.id].y, cls: "skel-glow" });
      var kids = (g.byCourse[c.courseId] || { kids: [] }).kids;
      kids.forEach(function (leaf, li) {
        var a = ang + (li - (kids.length - 1) / 2) * 0.22;
        var rr = 340 + (li % 3) * 70 + hash01(leaf.id) * 40;
        pos[leaf.id] = { x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr, role: "leaf" };
        paths.push({ d: "M" + pos[c.id].x + "," + pos[c.id].y + " Q" + (cx + Math.cos(a) * (r + 60)) + "," + (cy + Math.sin(a) * (r + 60)) + " " + pos[leaf.id].x + "," + pos[leaf.id].y, cls: "skel-glow" });
      });
    });
    ((g.byCourse._orphan || { kids: [] }).kids).forEach(function (n, i) {
      var a = hash01(n.id) * Math.PI * 2;
      pos[n.id] = { x: cx + Math.cos(a) * (400 + i * 20), y: cy + Math.sin(a) * (400 + i * 20), role: "leaf" };
    });

    return { w: W, h: H, positions: pos, paths: paths, fills: fills };
  }

  function layoutSpiral(g) {
    var W = 1700, H = 1500;
    var cx = W / 2, cy = H / 2;
    var pos = {};
    var paths = [];
    // Spiral arms paths
    for (var arm = 0; arm < 3; arm++) {
      var d = "";
      for (var s = 0; s <= 40; s++) {
        var t = s / 40;
        var ang = arm * ((Math.PI * 2) / 3) + t * Math.PI * 2.6;
        var r = 40 + t * 520;
        var x = cx + Math.cos(ang) * r;
        var y = cy + Math.sin(ang) * r * 0.85;
        d += (s === 0 ? "M" : "L") + x + "," + y;
      }
      paths.push({ d: d, cls: "skel-spiral" });
    }

    var courses = g.courses;
    courses.forEach(function (c, i) {
      var ang = i * ((Math.PI * 2) / Math.max(1, courses.length));
      var r = 120;
      pos[c.id] = { x: cx + Math.cos(ang) * r, y: cy + Math.sin(ang) * r * 0.85, role: "hub" };
    });

    var allLeaves = g.leaves.concat(g.hubs);
    allLeaves.forEach(function (leaf, i) {
      var arm = i % 3;
      var t = 0.15 + (Math.floor(i / 3) / Math.max(1, Math.ceil(allLeaves.length / 3))) * 0.8;
      t += (hash01(leaf.id) - 0.5) * 0.04;
      var ang = arm * ((Math.PI * 2) / 3) + t * Math.PI * 2.6;
      var r = 40 + t * 520;
      pos[leaf.id] = { x: cx + Math.cos(ang) * r, y: cy + Math.sin(ang) * r * 0.85, role: "leaf" };
    });

    return { w: W, h: H, positions: pos, paths: paths, fills: [] };
  }

  var LAYOUTS = {
    seedling: layoutSeedling,
    willow: layoutWillow,
    oak: layoutOak,
    arch: layoutArch,
    human: layoutHuman,
    constellation: layoutConstellation,
    spiral: layoutSpiral,
  };

  function layoutForEra(eraId) {
    var meta = ERA_META[eraId] || ERA_META.counting;
    var g = groupEraNodes(eraId);
    var fn = LAYOUTS[meta.shape] || layoutSeedling;
    var layout = fn(g);
    // Ensure every node has a position
    g.all.forEach(function (n) {
      if (!layout.positions[n.id]) {
        layout.positions[n.id] = {
          x: layout.w * (0.3 + hash01(n.id) * 0.4),
          y: layout.h * (0.3 + hash01(n.id + "y") * 0.4),
          role: n.kind === "course" ? "hub" : "leaf",
        };
      }
    });
    layout.group = g;
    layout.meta = meta;
    return layout;
  }

  /* ---------- View / pan-zoom ---------- */

  function applyViewTransform() {
    var world = document.getElementById("tree-world");
    if (!world) return;
    var v = state.view;
    world.style.transform = "translate(" + v.x + "px," + v.y + "px) scale(" + v.scale + ")";
  }

  function fitView() {
    var root = document.getElementById("tree-root");
    if (!root) return;
    var rw = root.clientWidth || 800;
    var rh = root.clientHeight || 600;
    var pad = 48;
    var sx = (rw - pad * 2) / state.canvas.w;
    var sy = (rh - pad * 2) / state.canvas.h;
    var scale = Math.min(sx, sy, 1.15);
    scale = Math.max(0.25, scale);
    state.view.scale = scale;
    state.view.x = (rw - state.canvas.w * scale) / 2;
    state.view.y = (rh - state.canvas.h * scale) / 2;
    applyViewTransform();
  }

  function bindPanZoom(viewport) {
    var dragging = false;
    var lastX = 0, lastY = 0;
    var pointers = Object.create(null);
    var pinchDist = 0;

    viewport.addEventListener("pointerdown", function (e) {
      if (e.target.closest && e.target.closest(".tree-badge, .tree-toolbar, .tree-panel")) return;
      pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
      viewport.setPointerCapture(e.pointerId);
      var ids = Object.keys(pointers);
      if (ids.length === 1) {
        dragging = true;
        lastX = e.clientX;
        lastY = e.clientY;
        viewport.classList.add("is-panning");
      } else if (ids.length === 2) {
        dragging = false;
        var a = pointers[ids[0]], b = pointers[ids[1]];
        pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
      }
    });
    viewport.addEventListener("pointermove", function (e) {
      if (!pointers[e.pointerId]) return;
      pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
      var ids = Object.keys(pointers);
      if (ids.length === 2 && pinchDist) {
        var a = pointers[ids[0]], b = pointers[ids[1]];
        var d = Math.hypot(a.x - b.x, a.y - b.y);
        var factor = d / pinchDist;
        pinchDist = d;
        var midX = (a.x + b.x) / 2;
        var midY = (a.y + b.y) / 2;
        zoomAt(midX, midY, factor);
      } else if (dragging) {
        var dx = e.clientX - lastX;
        var dy = e.clientY - lastY;
        lastX = e.clientX;
        lastY = e.clientY;
        state.view.x += dx;
        state.view.y += dy;
        applyViewTransform();
      }
    });
    function endPointer(e) {
      delete pointers[e.pointerId];
      if (!Object.keys(pointers).length) {
        dragging = false;
        pinchDist = 0;
        viewport.classList.remove("is-panning");
      }
    }
    viewport.addEventListener("pointerup", endPointer);
    viewport.addEventListener("pointercancel", endPointer);

    viewport.addEventListener(
      "wheel",
      function (e) {
        e.preventDefault();
        var factor = e.deltaY < 0 ? 1.08 : 1 / 1.08;
        zoomAt(e.clientX, e.clientY, factor);
      },
      { passive: false }
    );
  }

  function zoomAt(clientX, clientY, factor) {
    var root = document.getElementById("tree-root");
    if (!root) return;
    var rect = root.getBoundingClientRect();
    var mx = clientX - rect.left;
    var my = clientY - rect.top;
    var v = state.view;
    var newScale = Math.min(2.8, Math.max(0.2, v.scale * factor));
    var wx = (mx - v.x) / v.scale;
    var wy = (my - v.y) / v.scale;
    v.scale = newScale;
    v.x = mx - wx * newScale;
    v.y = my - wy * newScale;
    applyViewTransform();
  }

  /* ---------- Render ---------- */

  function renderEraBar() {
    var bar = document.getElementById("tree-era-bar");
    if (!bar || !state.data) return;
    bar.innerHTML = "";
    state.data.eras.forEach(function (era) {
      var meta = ERA_META[era.id] || { label: "Tree" };
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "tree-era-chip";
      btn.setAttribute("role", "tab");
      btn.setAttribute("aria-selected", era.id === state.eraId ? "true" : "false");
      btn.dataset.era = era.id;
      btn.innerHTML =
        '<span class="num">' +
        escapeHtml(era.numeral) +
        '</span><span class="ttl">' +
        escapeHtml(era.title) +
        '</span><span class="shape">' +
        escapeHtml(meta.label) +
        "</span>";
      btn.addEventListener("click", function () {
        setEra(era.id, true);
      });
      bar.appendChild(btn);
    });
  }

  function setEra(eraId, pushUrl) {
    if (!state.data) return;
    var valid = state.data.eras.some(function (e) {
      return e.id === eraId;
    });
    if (!valid) eraId = state.data.eras[0].id;
    state.eraId = eraId;
    try {
      localStorage.setItem(STORAGE_ERA, eraId);
    } catch (e) {}
    if (pushUrl) {
      try {
        var u = new URL(location.href);
        u.searchParams.set("era", eraId);
        history.replaceState(null, "", u.pathname + u.search + u.hash);
      } catch (e2) {}
    }
    renderEraBar();
    renderGrove();
  }

  function buildEdgePaths(layout) {
    var edges = [];
    var eraNodes = layout.group.all;
    var idSet = Object.create(null);
    eraNodes.forEach(function (n) {
      idSet[n.id] = true;
    });
    (state.data.edges || []).forEach(function (e) {
      if (!idSet[e.from] || !idSet[e.to]) return;
      if (e.kind === "era") return;
      var a = layout.positions[e.from];
      var b = layout.positions[e.to];
      if (!a || !b) return;
      var mx = (a.x + b.x) / 2;
      var my = (a.y + b.y) / 2 - 30;
      var stFrom = state.nodeState[e.from] || "";
      var lit =
        stFrom === "earned" ||
        stFrom === "secure" ||
        stFrom === "due" ||
        stFrom === "learning" ||
        /^q[1-5]$/.test(stFrom);
      edges.push({
        d: "M" + a.x + "," + a.y + " Q" + mx + "," + my + " " + b.x + "," + b.y,
        lit: lit,
      });
    });
    // Cap for perf on dense eras
    if (edges.length > 180) edges = edges.slice(0, 180);
    return edges;
  }

  function badgeClass(n, role, leafCount) {
    var st = state.nodeState[n.id] || "available";
    var cls = "tree-badge state-" + st;
    if (role === "heart") cls += " heart hub";
    else if (n.kind === "course" || role === "hub") cls += " hub";
    else if (leafCount > 60) cls += " leaf-sm";
    else cls += " leaf";
    // Overdue pulse / wilt flags from quintile engine
    if (window.QuintileMastery && QuintileMastery.getTreeQuintile) {
      var sid = n.skillId || n.topicId;
      if (sid) {
        var tq = QuintileMastery.getTreeQuintile(sid);
        if (tq.overdue || tq.due) cls += " is-overdue";
        if (tq.wilted) cls += " is-wilted";
      }
    }
    return cls;
  }

  function renderGrove() {
    var root = document.getElementById("tree-root");
    if (!root || !state.data || !state.eraId) return;
    state.nodeState = computeStates(state.data);
    var layout = layoutForEra(state.eraId);
    state.positions = layout.positions;
    state.canvas = { w: layout.w, h: layout.h };

    var era = state.data.eras.find(function (e) {
      return e.id === state.eraId;
    });
    var meta = layout.meta;
    var leafCount = layout.group.all.length;

    var growthInfo = { growth: 0, percent: 0, masteryCount: 0, total: 0, healthPercent: 100, masteryPercent: 0 };
    if (window.QuintileMastery && QuintileMastery.skillIdsForEra && QuintileMastery.eraGrowth) {
      var eraSkillIds = QuintileMastery.skillIdsForEra(state.eraId, state.data);
      growthInfo = QuintileMastery.eraGrowth(eraSkillIds);
    }
    var gFrac = Math.max(0, Math.min(1, growthInfo.growth || 0));

    var edges = buildEdgePaths(layout);

    root.innerHTML = "";

    var label = document.createElement("div");
    label.className = "tree-era-label";
    label.innerHTML =
      '<p class="motif-name">' +
      escapeHtml(era ? era.numeral + " · " + era.title : "") +
      '</p><p class="motif-sub">' +
      escapeHtml(meta.label) +
      " — " +
      escapeHtml(meta.blurb) +
      " · " +
      leafCount +
      " nodes · growth " +
      (growthInfo.percent || 0) +
      "%</p>";
    root.appendChild(label);

    var banner = document.createElement("div");
    banner.className = "tree-growth-banner";
    banner.textContent = "Growth " + (growthInfo.percent || 0) + "% · Bloom " + (growthInfo.masteryCount || 0) + "/" + (growthInfo.total || 0);
    root.appendChild(banner);

    try {
      var vm = document.getElementById("vital-mastery");
      var vg = document.getElementById("vital-growth");
      var vh = document.getElementById("vital-health");
      if (vm) vm.textContent = (growthInfo.masteryCount || 0) + " / " + (growthInfo.total || 0) + " Bloom";
      if (vg) vg.textContent = (growthInfo.percent || 0) + "%";
      if (vh) vh.textContent = (growthInfo.healthPercent != null ? growthInfo.healthPercent : 100) + "%";
    } catch (eVital) {}

    var toolbar = document.createElement("div");
    toolbar.className = "tree-toolbar";
    toolbar.innerHTML =
      '<button type="button" data-act="zoom-in" title="Zoom in" aria-label="Zoom in">+</button>' +
      '<button type="button" data-act="zoom-out" title="Zoom out" aria-label="Zoom out">−</button>' +
      '<button type="button" data-act="fit" title="Fit view" aria-label="Fit view">⤢</button>';
    toolbar.addEventListener("click", function (e) {
      var btn = e.target.closest("button");
      if (!btn) return;
      var act = btn.getAttribute("data-act");
      var rect = root.getBoundingClientRect();
      var cx = rect.left + rect.width / 2;
      var cy = rect.top + rect.height / 2;
      if (act === "zoom-in") zoomAt(cx, cy, 1.15);
      else if (act === "zoom-out") zoomAt(cx, cy, 1 / 1.15);
      else if (act === "fit") fitView();
    });
    root.appendChild(toolbar);

    var viewport = document.createElement("div");
    viewport.className = "tree-viewport";
    viewport.id = "tree-viewport";

    var world = document.createElement("div");
    world.className = "tree-world";
    world.id = "tree-world";
    world.style.width = layout.w + "px";
    world.style.height = layout.h + "px";

    var ns = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(ns, "svg");
    svg.setAttribute("class", "tree-skel");
    svg.setAttribute("width", String(layout.w));
    svg.setAttribute("height", String(layout.h));
    svg.setAttribute("viewBox", "0 0 " + layout.w + " " + layout.h);

    var defs = document.createElementNS(ns, "defs");
    defs.innerHTML =
      '<linearGradient id="barkGrad" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="#8b6b5a"/><stop offset="100%" stop-color="#5a4336"/></linearGradient>';
    svg.appendChild(defs);

    svg.style.setProperty("--growth", String(gFrac));
    // Blossoms scale with growth
    var blossomGroup = document.createElementNS(ns, "g");
    blossomGroup.setAttribute("class", "tree-blossoms");
    var blossomCount = Math.round(gFrac * 12);
    for (var bi = 0; bi < blossomCount; bi++) {
      var cx = layout.w * (0.35 + (bi % 6) * 0.08 + (hash01("b" + bi + state.eraId) - 0.5) * 0.06);
      var cy = layout.h * (0.18 + Math.floor(bi / 6) * 0.12 + hash01("by" + bi) * 0.08);
      var c = document.createElementNS(ns, "circle");
      c.setAttribute("cx", String(cx));
      c.setAttribute("cy", String(cy));
      c.setAttribute("r", String(4 + gFrac * 6));
      blossomGroup.appendChild(c);
    }
    svg.appendChild(blossomGroup);

    (layout.fills || []).forEach(function (f) {
      var p = document.createElementNS(ns, "path");
      p.setAttribute("d", f.d);
      p.setAttribute("class", f.cls || "skel-fill");
      if (f.fill) p.setAttribute("fill", f.fill);
      svg.appendChild(p);
    });
    (layout.paths || []).forEach(function (f) {
      var p = document.createElementNS(ns, "path");
      p.setAttribute("d", f.d);
      p.setAttribute("class", f.cls || "skel-branch");
      svg.appendChild(p);
    });
    edges.forEach(function (ed) {
      var p = document.createElementNS(ns, "path");
      p.setAttribute("d", ed.d);
      p.setAttribute("class", "skel-edge" + (ed.lit ? " lit" : ""));
      svg.appendChild(p);
    });
    world.appendChild(svg);

    var layer = document.createElement("div");
    layer.className = "tree-nodes-layer";
    layer.style.width = layout.w + "px";
    layer.style.height = layout.h + "px";

    // Heart badge for shapes that declare it
    if (layout.positions.__heart__) {
      var hp = layout.positions.__heart__;
      var heart = document.createElement("button");
      heart.type = "button";
      heart.className = "tree-badge heart hub state-available";
      heart.style.left = hp.x + "px";
      heart.style.top = hp.y + "px";
      heart.innerHTML =
        '<span class="motif"><img alt="" src="' +
        motifUrl("hub") +
        '" width="36" height="36" loading="lazy"/></span><span class="title">' +
        escapeHtml(era ? era.title : "Root") +
        "</span>";
      heart.addEventListener("click", function () {
        var eraNode = state.data.nodes.find(function (n) {
          return n.kind === "era" && n.era === state.eraId;
        });
        if (eraNode) openPanel(eraNode);
      });
      layer.appendChild(heart);
    }

    layout.group.all.forEach(function (n) {
      var p = layout.positions[n.id];
      if (!p) return;
      var role = p.role || (n.kind === "course" ? "hub" : "leaf");
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = badgeClass(n, role, leafCount);
      btn.dataset.id = n.id;
      btn.style.left = p.x + "px";
      btn.style.top = p.y + "px";
      var st = state.nodeState[n.id] || "available";
      var qPip = "";
      if (/^q[0-5]$/.test(st)) {
        qPip = '<span class="q-pip" aria-hidden="true">Q' + st.charAt(1) + "</span>";
      } else if (st === "due") {
        qPip = '<span class="q-pip" aria-hidden="true">due</span>';
      } else if (st === "wilt") {
        qPip = '<span class="q-pip" aria-hidden="true">wilt</span>';
      }
      btn.innerHTML =
        '<span class="bloom-ring" aria-hidden="true"></span>' +
        '<span class="motif"><img alt="" src="' +
        motifUrl(n.motif) +
        '" width="36" height="36" loading="lazy"/></span>' +
        '<span class="title">' +
        escapeHtml(n.title) +
        "</span>" +
        qPip +
        (st === "locked" ? '<span class="lock-badge" aria-hidden="true">🔒</span>' : "");
      btn.title = n.title + " · " + kindLabel(n.kind);
      btn.addEventListener("click", function (ev) {
        ev.stopPropagation();
        openPanel(n);
      });
      layer.appendChild(btn);
    });

    world.appendChild(layer);
    viewport.appendChild(world);
    root.appendChild(viewport);
    bindPanZoom(viewport);
    fitView();

    var hint = document.getElementById("tree-motif-hint");
    if (hint) {
      hint.textContent =
        meta.label + " of " + (era ? era.title : state.eraId) + " — drag to pan · scroll to zoom · pick another era above.";
    }
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
    var badgeText = st + " · " + kindLabel(n.kind);
    if (window.QuintileMastery && QuintileMastery.getTreeQuintile && (n.skillId || n.topicId)) {
      var tqp = QuintileMastery.getTreeQuintile(n.skillId || n.topicId);
      badgeText = QuintileMastery.levelName(tqp.q) + " Q" + tqp.q + "/5";
      if (tqp.due) badgeText += " · due";
      if (tqp.wilted) badgeText += " · wilt";
      if (tqp.streak) badgeText += " · streak " + tqp.streak + "/3";
      badgeText += " · " + kindLabel(n.kind);
    }
    badge.textContent = badgeText;
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
    if (state.eraId === "diploma") {
      var exams = document.createElement("a");
      exams.className = "cta";
      exams.href = url("/diploma/exams/");
      exams.textContent = "Open Diploma Exams";
      panel.appendChild(exams);
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

    var just = document.createElement("a");
    just.className = "cta";
    just.href = url("/practice/?mode=practice&auto=1");
    just.textContent = "Just practice";
    just.style.marginBottom = "0.5rem";
    panel.appendChild(just);

    var cta = document.createElement("a");
    cta.className = "cta";
    cta.href = n.skillId
      ? url("/practice/?skill=" + encodeURIComponent(n.skillId) + "&mode=practice")
      : url(n.href || "/");
    cta.textContent = st === "locked" ? "Preview practice" : "Practice this";
    cta.style.background = "transparent";
    cta.style.color = "var(--color-ink)";
    cta.style.border = "1px solid var(--color-ink)";
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

  function resolveInitialEra() {
    var fromQuery = null;
    try {
      fromQuery = new URL(location.href).searchParams.get("era");
    } catch (e) {}
    if (fromQuery && state.data.eras.some(function (e) { return e.id === fromQuery; })) return fromQuery;
    try {
      var saved = localStorage.getItem(STORAGE_ERA);
      if (saved && state.data.eras.some(function (e) { return e.id === saved; })) return saved;
    } catch (e2) {}
    return state.data.eras[0] ? state.data.eras[0].id : "counting";
  }

  function boot() {
    state.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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
            data.stats.nodeCount + " nodes · " + data.stats.edgeCount + " unlock edges · seven living trees";
        }
        setEra(resolveInitialEra(), true);
      })
      .catch(function (e) {
        var root = document.getElementById("tree-root");
        if (root) root.innerHTML = "<p style='padding:2rem'>Could not load tree: " + escapeHtml(e.message) + "</p>";
      });

    window.addEventListener("quintile-account-change", function () {
      if (state.eraId) renderGrove();
    });
    window.addEventListener("quintile-attempt", function () {
      if (state.eraId) renderGrove();
    });
    window.addEventListener("quintile-mastery", function () {
      if (state.eraId) renderGrove();
    });
    window.addEventListener("resize", function () {
      fitView();
    });
    setInterval(function () {
      if (state.data && state.eraId) {
        var before = JSON.stringify(state.nodeState);
        state.nodeState = computeStates(state.data);
        if (JSON.stringify(state.nodeState) !== before) renderGrove();
      }
    }, 2500);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
