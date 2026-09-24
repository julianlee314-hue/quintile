/* Diploma exam scaffold: catalog metadata, local PDF notes, and original MCQ demo sit. */
(function () {
  "use strict";
  var BASE = window.__QUINTILE_BASE__ || "";
  function url(path) { return BASE + (path.charAt(0) === "/" ? path : "/" + path); }
  var letters = ["A", "B", "C", "D", "E"];
  var state = { papers: [], demo: null, selected: null, demoItems: [], answers: [], position: 0, finished: false };
  var attachmentKey = "quintile-diploma-exam-attachments";

  function esc(value) {
    return String(value == null ? "" : value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function mathHtml(value) {
    if (window.QuintileLatex) return QuintileLatex.renderHtml(value);
    return esc(value);
  }
  function readAttachments() {
    try { return JSON.parse(localStorage.getItem(attachmentKey) || "{}"); } catch (e) { return {}; }
  }
  function saveAttachment(id, file) {
    var all = readAttachments();
    all[id] = { name: file.name, size: file.size };
    try { localStorage.setItem(attachmentKey, JSON.stringify(all)); } catch (e) {}
  }
  function prettyBytes(n) {
    if (n < 1024) return n + " B";
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB";
    return (n / (1024 * 1024)).toFixed(1) + " MB";
  }
  function paperMeta(p) {
    return [p.level, p.paper, p.session + " " + p.year].join(" · ");
  }

  function filters() {
    return {
      level: document.getElementById("level-filter").value,
      paper: document.getElementById("paper-filter").value,
      session: document.getElementById("session-filter").value,
      year: document.getElementById("year-filter").value
    };
  }
  function renderCards() {
    var f = filters();
    var list = state.papers.filter(function (p) {
      return (f.level === "all" || p.level === f.level) && (f.paper === "all" || p.paper === f.paper) &&
        (f.session === "all" || p.session === f.session) && (f.year === "all" || String(p.year) === f.year);
    });
    document.getElementById("result-count").textContent = list.length + " of " + state.papers.length + " papers";
    var root = document.getElementById("paper-cards");
    if (!list.length) { root.innerHTML = '<div class="exam-empty">No placeholder matches these filters.</div>'; return; }
    root.innerHTML = list.map(function (p) {
      return '<button class="exam-card' + (state.selected && state.selected.id === p.id ? " selected" : "") + '" type="button" data-paper-id="' + esc(p.id) + '" aria-pressed="' + (state.selected && state.selected.id === p.id ? "true" : "false") + '">' +
        '<span class="exam-badge">Placeholder</span><h3>' + esc(p.level + " · " + p.paper) + '</h3><div class="exam-card-meta">' + esc(p.session + " " + p.year) + '<br>' + esc(p.durationMins + " minutes · calculator " + p.calculator) + '</div></button>';
    }).join("");
    root.querySelectorAll("[data-paper-id]").forEach(function (button) {
      button.addEventListener("click", function () {
        state.selected = state.papers.find(function (p) { return p.id === button.dataset.paperId; });
        renderCards(); renderDetail();
      });
    });
  }
  function renderDetail() {
    var root = document.getElementById("exam-detail");
    var p = state.selected;
    if (!p) return;
    var saved = readAttachments()[p.id];
    root.innerHTML = '<div class="exam-kicker">' + esc(p.level + " · " + p.paper) + '</div>' +
      '<h2>' + esc(p.title) + '</h2><p class="exam-card-meta">' + esc(paperMeta(p)) + '</p>' +
      '<dl class="exam-facts"><div class="exam-fact"><dt>Duration</dt><dd>' + esc(p.durationMins + " minutes") + '</dd></div><div class="exam-fact"><dt>Calculator</dt><dd>' + esc(p.calculator) + '</dd></div><div class="exam-fact"><dt>Marks</dt><dd>Not catalogued</dd></div><div class="exam-fact"><dt>Status</dt><dd>Placeholder</dd></div></dl>' +
      '<div class="exam-instructions"><strong>Sit instructions.</strong> Follow the cover sheet of your own copy. This card contains metadata only; no question text or PDF is bundled.</div>' +
      '<div class="exam-attach"><strong>Attach PDF</strong><p>Stays in this browser only. Quintile stores the file name and size in local storage; it does not upload or read the PDF.</p>' +
      '<label for="pdf-attachment">Choose a local PDF<input id="pdf-attachment" type="file" accept="application/pdf,.pdf"></label>' +
      '<small id="attachment-status">' + (saved ? "Attached locally: " + esc(saved.name) + " (" + prettyBytes(saved.size) + ")" : "No local PDF attached.") + '</small></div>';
    var input = document.getElementById("pdf-attachment");
    input.addEventListener("change", function () {
      var file = input.files && input.files[0];
      if (!file) return;
      if (file.type && file.type !== "application/pdf" && !/\.pdf$/i.test(file.name)) {
        document.getElementById("attachment-status").textContent = "Please choose a PDF file."; return;
      }
      saveAttachment(p.id, file);
      document.getElementById("attachment-status").textContent = "Attached locally: " + file.name + " (" + prettyBytes(file.size) + ")";
    });
  }

  function shuffled(items) {
    var copy = items.slice();
    for (var i = copy.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = copy[i]; copy[i] = copy[j]; copy[j] = t; }
    return copy;
  }
  function renderSit() {
    var root = document.getElementById("sit-view");
    root.hidden = false;
    if (state.finished) { renderResult(); return; }
    if (window.QuintileLatex && !window.katex) {
      QuintileLatex.ensure().then(function () { paintSit(root); }).catch(function () { paintSit(root); });
      return;
    }
    paintSit(root);
  }
  function paintSit(root) {
    if (state.finished) { renderResult(); return; }
    var item = state.demoItems[state.position];
    var chosen = state.answers[state.position];
    root.innerHTML = '<div class="sit-head"><div><div class="exam-kicker">MCQ demo sit · original items</div><h2 id="sit-title">AA-style practice paper</h2></div><div class="sit-progress">Question ' + (state.position + 1) + ' of ' + state.demoItems.length + '</div></div>' +
      '<p class="sit-prompt qlatex">' + mathHtml(item.prompt) + '</p><div class="sit-choices" role="radiogroup" aria-label="Answer choices">' + item.choices.map(function (choice, i) {
        return '<button type="button" class="sit-choice' + (chosen === letters[i] ? " selected" : "") + '" data-choice="' + letters[i] + '" role="radio" aria-checked="' + (chosen === letters[i] ? "true" : "false") + '"><span class="letter">' + letters[i] + '</span><span class="qlatex">' + mathHtml(choice) + '</span></button>';
      }).join("") + '</div><div class="sit-footer"><button type="button" class="exam-button ghost" id="sit-back"' + (state.position === 0 ? " disabled" : "") + '>Back</button><span class="sit-progress">Answers are marked at the end.</span><button type="button" class="exam-button" id="sit-next">' + (state.position === state.demoItems.length - 1 ? "Finish paper" : "Mark & next") + '</button></div>';
    root.querySelectorAll("[data-choice]").forEach(function (button) { button.addEventListener("click", function () { state.answers[state.position] = button.dataset.choice; renderSit(); }); });
    document.getElementById("sit-back").addEventListener("click", function () { if (state.position > 0) { state.position--; renderSit(); } });
    document.getElementById("sit-next").addEventListener("click", function () { if (state.position < state.demoItems.length - 1) { state.position++; renderSit(); } else { state.finished = true; renderSit(); } });
    root.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function renderResult() {
    if (window.QuintileLatex && !window.katex) {
      QuintileLatex.ensure().then(paintResult).catch(paintResult);
      return;
    }
    paintResult();
  }
  function paintResult() {
    var score = state.demoItems.reduce(function (total, item, i) { return total + (state.answers[i] === item.correct ? 1 : 0); }, 0);
    var pct = Math.round(score / state.demoItems.length * 100);
    var rows = state.demoItems.map(function (item, i) {
      var got = state.answers[i] || "—"; var ok = got === item.correct;
      return '<li><strong>' + (i + 1) + '. ' + (ok ? "Correct" : "Review") + '</strong> · your answer ' + esc(got) + ', key ' + esc(item.correct) + '<br><span class="qlatex">' + mathHtml(item.solution) + '</span></li>';
    }).join("");
    document.getElementById("sit-view").innerHTML = '<div class="sit-head"><div><div class="exam-kicker">Paper marked</div><h2 id="sit-title">Demo result</h2></div><div class="sit-progress">' + state.demoItems.length + ' questions</div></div><div class="sit-result"><h3>' + score + ' / ' + state.demoItems.length + ' · ' + pct + '%</h3><p>Each item was marked against its original A–E key. This is a test paper, not an IB assessment.</p></div><ol class="review-list">' + rows + '</ol><div class="sit-footer"><button type="button" class="exam-button" id="retake-demo">Retake in a fresh order</button><button type="button" class="exam-button ghost" id="close-sit">Close sit</button></div>';
    document.getElementById("retake-demo").addEventListener("click", function () { startDemo(true); });
    document.getElementById("close-sit").addEventListener("click", function () { document.getElementById("sit-view").hidden = true; });
  }
  function startDemo(freshOrder) {
    state.demoItems = freshOrder ? shuffled(state.demo.items) : (state.demoItems.length ? state.demoItems : state.demo.items.slice());
    state.answers = []; state.position = 0; state.finished = false; renderSit();
  }
  function bind() {
    ["level-filter", "paper-filter", "session-filter", "year-filter"].forEach(function (id) { document.getElementById(id).addEventListener("change", renderCards); });
    document.getElementById("clear-filters").addEventListener("click", function () { ["level-filter", "paper-filter", "session-filter", "year-filter"].forEach(function (id) { document.getElementById(id).value = "all"; }); renderCards(); });
    document.getElementById("start-demo").addEventListener("click", function () { startDemo(false); });
    document.getElementById("shuffle-demo").addEventListener("click", function () { state.demoItems = shuffled(state.demo.items); var button = document.getElementById("shuffle-demo"); button.textContent = "Fresh order ready"; setTimeout(function () { button.textContent = "Generate fresh demo"; }, 1600); });
  }
  function boot() {
    fetch(url("/data/diploma_past_papers.json")).then(function (response) { if (!response.ok) throw new Error("catalog " + response.status); return response.json(); }).then(function (data) {
      state.papers = data.papers || []; state.demo = (data.mcqDemoPapers || [])[0]; state.demoItems = state.demo ? state.demo.items.slice() : [];
      var years = Array.from(new Set(state.papers.map(function (p) { return p.year; }))).sort(function (a, b) { return b - a; });
      var year = document.getElementById("year-filter"); years.forEach(function (y) { var option = document.createElement("option"); option.value = y; option.textContent = y; year.appendChild(option); });
      bind(); renderCards();
    }).catch(function (error) { document.getElementById("paper-cards").innerHTML = '<div class="exam-empty">The catalog could not load. ' + esc(error.message) + '</div>'; });
  }
  boot();
}());
