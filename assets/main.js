/* Shared interactivity for all pages. Every feature is guarded by
   element-existence checks so one file serves the whole site. */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- theme toggle ---------- */
  var themeBtn = document.getElementById("themeBtn");

  function currentTheme() {
    return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
  }

  function setThemeIcon() {
    if (!themeBtn) return;
    var sun = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
    var moon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/></svg>';
    themeBtn.innerHTML = currentTheme() === "dark" ? sun : moon;
  }

  if (themeBtn) {
    setThemeIcon();
    themeBtn.addEventListener("click", function () {
      var next = currentTheme() === "dark" ? "light" : "dark";
      if (next === "dark") {
        document.documentElement.setAttribute("data-theme", "dark");
      } else {
        document.documentElement.removeAttribute("data-theme");
      }
      try { localStorage.setItem("theme", next); } catch (e) {}
      setThemeIcon();
      refreshDotPalette();
    });
  }

  /* ---------- mobile menu ---------- */
  var menuBtn = document.getElementById("menuBtn");
  var navLinks = document.getElementById("navLinks");
  if (menuBtn && navLinks) {
    menuBtn.addEventListener("click", function () {
      var open = navLinks.classList.toggle("open");
      menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
    });
    navLinks.addEventListener("click", function (e) {
      if (e.target.tagName === "A") {
        navLinks.classList.remove("open");
        menuBtn.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* ---------- dot-grid canvas ---------- */
  var canvas = document.getElementById("dotgrid");
  var dotPalette = { line: "#DEE5EF", teal: "#2563EB" };

  function refreshDotPalette() {
    var cs = getComputedStyle(document.documentElement);
    dotPalette.line = cs.getPropertyValue("--line").trim() || dotPalette.line;
    dotPalette.teal = cs.getPropertyValue("--teal").trim() || dotPalette.teal;
    if (staticDraw) staticDraw();
  }

  var staticDraw = null;

  if (canvas && canvas.getContext) {
    var ctx = canvas.getContext("2d");
    var SPACING = 26;
    var BASE_R = 1.1;
    var MAX_R = 2.3;
    var RADIUS = 125;
    var mouse = { x: -1e4, y: -1e4 };
    var finePointer = window.matchMedia("(pointer: fine)").matches;
    var animate = finePointer && !reduceMotion;
    var rafId = null;

    function hexToRgb(hex) {
      hex = hex.replace("#", "");
      if (hex.length === 3) hex = hex.replace(/./g, function (c) { return c + c; });
      var n = parseInt(hex, 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }

    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!animate) draw();
    }

    function draw() {
      var w = window.innerWidth, h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);
      var lineRgb, tealRgb;
      try {
        lineRgb = hexToRgb(dotPalette.line);
        tealRgb = hexToRgb(dotPalette.teal);
      } catch (e) { return; }
      for (var x = SPACING / 2; x < w; x += SPACING) {
        for (var y = SPACING / 2; y < h; y += SPACING) {
          var dx = x - mouse.x, dy = y - mouse.y;
          var d = Math.sqrt(dx * dx + dy * dy);
          var t = 0;
          if (d < RADIUS) {
            t = 1 - d / RADIUS;
            t = t * t * (3 - 2 * t); /* smoothstep */
          }
          var r = BASE_R + (MAX_R - BASE_R) * t;
          var cr = Math.round(lineRgb[0] + (tealRgb[0] - lineRgb[0]) * t);
          var cg = Math.round(lineRgb[1] + (tealRgb[1] - lineRgb[1]) * t);
          var cb = Math.round(lineRgb[2] + (tealRgb[2] - lineRgb[2]) * t);
          ctx.beginPath();
          ctx.fillStyle = "rgb(" + cr + "," + cg + "," + cb + ")";
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    staticDraw = draw;

    if (animate) {
      var loop = function () { draw(); rafId = requestAnimationFrame(loop); };
      window.addEventListener("mousemove", function (e) { mouse.x = e.clientX; mouse.y = e.clientY; });
      window.addEventListener("mouseout", function () { mouse.x = -1e4; mouse.y = -1e4; });
      rafId = requestAnimationFrame(loop);
      document.addEventListener("visibilitychange", function () {
        if (document.hidden) { cancelAnimationFrame(rafId); rafId = null; }
        else if (!rafId) { rafId = requestAnimationFrame(loop); }
      });
    }

    window.addEventListener("resize", resize);
    refreshDotPalette();
    resize();
    if (!animate) draw();
  }

  /* ---------- typed "currently ..." line ---------- */
  var typeEl = document.getElementById("typeLine");
  if (typeEl) {
    var phrases = [];
    try { phrases = JSON.parse(typeEl.getAttribute("data-phrases") || "[]"); } catch (e) {}
    if (phrases.length) {
      if (reduceMotion) {
        typeEl.textContent = phrases[0];
      } else {
        var pi = 0, ci = 0, deleting = false;
        var tick = function () {
          var phrase = phrases[pi];
          if (!deleting) {
            ci++;
            typeEl.textContent = phrase.slice(0, ci);
            if (ci === phrase.length) {
              deleting = true;
              setTimeout(tick, 2300);
              return;
            }
            setTimeout(tick, 42 + Math.random() * 46);
          } else {
            ci--;
            typeEl.textContent = phrase.slice(0, ci);
            if (ci === 0) {
              deleting = false;
              pi = (pi + 1) % phrases.length;
              setTimeout(tick, 380);
              return;
            }
            setTimeout(tick, 24);
          }
        };
        setTimeout(tick, 600);
      }
    }
  }

  /* ---------- affiliations marquee (duplicate track for seamless wrap) ---------- */
  var track = document.getElementById("affilTrack");
  if (track && !reduceMotion) {
    track.innerHTML += track.innerHTML;
  }

  /* ---------- scholar stats ---------- */
  var scholarEls = document.querySelectorAll("[data-scholar]");
  if (scholarEls.length) {
    fetch("assets/scholar.json", { cache: "no-cache" })
      .then(function (r) { if (!r.ok) throw new Error("no scholar.json"); return r.json(); })
      .then(function (data) {
        scholarEls.forEach(function (el) {
          var key = el.getAttribute("data-scholar");
          if (data[key] != null && isFinite(data[key])) {
            el.setAttribute("data-count", String(data[key]));
            if (el.dataset.counted) el.textContent = data[key] + (el.getAttribute("data-suffix") || "");
          }
        });
        var upd = document.getElementById("scholarUpdated");
        if (upd && data.updated) upd.textContent = "Stats from Google Scholar, updated " + data.updated;
      })
      .catch(function () { /* keep hardcoded fallbacks */ });
  }

  /* ---------- count-up ---------- */
  var counters = document.querySelectorAll("[data-count]");
  if (counters.length) {
    var animateCount = function (el) {
      var target = parseInt(el.getAttribute("data-count"), 10) || 0;
      var suffix = el.getAttribute("data-suffix") || "";
      if (reduceMotion) {
        el.textContent = target + suffix;
        el.dataset.counted = "1";
        return;
      }
      var t0 = null, DUR = 900;
      var step = function (ts) {
        if (!t0) t0 = ts;
        var p = Math.min((ts - t0) / DUR, 1);
        p = 1 - Math.pow(1 - p, 3);
        /* re-read target each frame so a late scholar.json update still lands */
        var tgt = parseInt(el.getAttribute("data-count"), 10) || 0;
        el.textContent = Math.round(tgt * p) + (p === 1 ? suffix : "");
        if (p < 1) requestAnimationFrame(step);
        else el.dataset.counted = "1";
      };
      requestAnimationFrame(step);
    };
    var cObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          cObs.unobserve(en.target);
          animateCount(en.target);
        }
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { cObs.observe(el); });
  }

  /* ---------- scroll reveal ---------- */
  var revealables = document.querySelectorAll(".card, .pub, .timeline-item, .contact-card, .lang-item, .focus-item, .stat");
  if (revealables.length && !reduceMotion && "IntersectionObserver" in window) {
    revealables.forEach(function (el) { el.classList.add("will-reveal"); });
    var rObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          rObs.unobserve(en.target);
          var el = en.target;
          var siblings = Array.prototype.slice.call(el.parentElement.children);
          var idx = siblings.indexOf(el) % 6;
          setTimeout(function () { el.classList.add("reveal"); }, idx * 70);
        }
      });
    }, { threshold: 0.12 });
    revealables.forEach(function (el) { rObs.observe(el); });
  }

  /* ---------- contact form: mailto builder ---------- */
  var form = document.getElementById("mailForm");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = (form.querySelector("#mfName") || {}).value || "";
      var subject = (form.querySelector("#mfSubject") || {}).value || "Portfolio contact";
      var message = (form.querySelector("#mfMessage") || {}).value || "";
      var body = message + (name ? "\n\n— " + name : "");
      window.location.href = "mailto:zoh.sarwar@gmail.com?subject=" +
        encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
    });
  }
})();
