/* Quintile shared KaTeX renderer — safe split of math delimiters + escaped prose. */
(function (global) {
  "use strict";
  var KATEX_VER = "0.16.11";
  var CDN = "https://cdn.jsdelivr.net/npm/katex@" + KATEX_VER + "/dist/";
  var loading = null;

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var existing = document.querySelector('script[src="' + src + '"]');
      if (existing) {
        if (global.katex) { resolve(); return; }
        existing.addEventListener("load", function () { resolve(); });
        existing.addEventListener("error", reject);
        return;
      }
      var s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = function () { resolve(); };
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  function loadCss(href) {
    if (document.querySelector('link[href="' + href + '"]')) return;
    var l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = href;
    document.head.appendChild(l);
  }

  function ensure() {
    if (global.katex) return Promise.resolve(global.katex);
    if (loading) return loading;
    loadCss(CDN + "katex.min.css");
    loading = loadScript(CDN + "katex.min.js")
      .then(function () { return loadScript(CDN + "contrib/auto-render.min.js"); })
      .then(function () { return global.katex; })
      .catch(function (err) {
        loading = null;
        console.warn("QuintileLatex: KaTeX failed to load", err);
        throw err;
      });
    return loading;
  }

  // $$...$$, $...$, \[...\], \(...\) — non-greedy; prose outside is HTML-escaped.
  var MATH_RE = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$|\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)/g;

  function renderMath(math, display) {
    if (!global.katex) {
      return escapeHtml((display ? "$$" : "$") + math + (display ? "$$" : "$"));
    }
    try {
      return global.katex.renderToString(math, {
        throwOnError: false,
        displayMode: !!display,
        strict: "ignore"
      });
    } catch (e) {
      return '<span class="katex-error">' + escapeHtml(math) + "</span>";
    }
  }

  function renderHtml(text) {
    var src = String(text == null ? "" : text);
    if (!src) return "";
    var out = [];
    var last = 0;
    var m;
    MATH_RE.lastIndex = 0;
    while ((m = MATH_RE.exec(src)) !== null) {
      if (m.index > last) out.push(escapeHtml(src.slice(last, m.index)));
      var display = m[1] != null || m[3] != null;
      var math = m[1] != null ? m[1] : m[2] != null ? m[2] : m[3] != null ? m[3] : m[4];
      out.push(renderMath(math, display));
      last = m.index + m[0].length;
    }
    if (last < src.length) out.push(escapeHtml(src.slice(last)));
    return out.join("");
  }

  function render(el) {
    if (!el) return;
    var src =
      el.getAttribute("data-latex") != null
        ? el.getAttribute("data-latex")
        : el.textContent;
    el.setAttribute("data-latex", src);
    el.innerHTML = renderHtml(src);
    return el;
  }

  function renderAll(root) {
    var scope = root || document;
    if (!scope.querySelectorAll) return;
    var nodes = scope.querySelectorAll("[data-latex], .qlatex");
    for (var i = 0; i < nodes.length; i++) render(nodes[i]);
  }

  function set(el, text) {
    if (!el) return Promise.resolve();
    var src = String(text == null ? "" : text);
    el.setAttribute("data-latex", src);
    return ensure().then(
      function () { render(el); },
      function () { el.textContent = src; }
    );
  }

  global.QuintileLatex = {
    version: KATEX_VER,
    ensure: ensure,
    escapeHtml: escapeHtml,
    renderHtml: renderHtml,
    render: render,
    renderAll: renderAll,
    set: set
  };

  if (document.head) ensure().catch(function () {});
})(typeof window !== "undefined" ? window : globalThis);
