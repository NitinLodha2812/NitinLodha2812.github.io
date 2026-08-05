/* =====================================================================
   Nitin Lodha - Portfolio interactions (v2)
   Vanilla core with a guarded momentum scroll enhancement.
   No em dashes anywhere in this project.
   ===================================================================== */
(function () {
  "use strict";
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var isTouch = window.matchMedia("(hover: none), (pointer: coarse)").matches;
  var root = document.documentElement;

  /* ---------- Theme ---------- */
  var themeToggle = document.getElementById("themeToggle");
  var metaTheme = document.querySelector('meta[name="theme-color"]');

  function applyTheme(theme) {
    root.setAttribute("data-theme", theme);
    if (metaTheme) metaTheme.setAttribute("content", theme === "light" ? "#f4f4f8" : "#08080c");
    try { localStorage.setItem("theme", theme); } catch (e) {}
  }
  var stored;
  try { stored = localStorage.getItem("theme"); } catch (e) {}
  if (!stored) stored = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  applyTheme(stored);

  function toggleTheme(ev) {
    var next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
    if (document.startViewTransition && !reduceMotion) {
      var x = ev ? ev.clientX : window.innerWidth - 40;
      var y = ev ? ev.clientY : 40;
      var end = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
      var t = document.startViewTransition(function () { applyTheme(next); });
      t.ready.then(function () {
        root.animate(
          { clipPath: ["circle(0px at " + x + "px " + y + "px)", "circle(" + end + "px at " + x + "px " + y + "px)"] },
          { duration: 620, easing: "cubic-bezier(0.22,1,0.36,1)", pseudoElement: "::view-transition-new(root)" }
        );
      });
    } else {
      applyTheme(next);
    }
    if (window.__recolorParticles) window.__recolorParticles();
  }
  if (themeToggle) themeToggle.addEventListener("click", toggleTheme);

  /* ---------- Nav: scrolled state, mobile menu, active link ---------- */
  var nav = document.getElementById("nav");
  var burger = document.getElementById("burger");
  var mobileMenu = document.getElementById("mobileMenu");
  var progress = document.getElementById("scrollProgress");

  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    if (nav) nav.classList.toggle("scrolled", y > 40);
    var h = document.documentElement.scrollHeight - window.innerHeight;
    if (progress) progress.style.width = (h > 0 ? (y / h) * 100 : 0) + "%";
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  function setMenu(open) {
    if (!mobileMenu || !burger) return;
    mobileMenu.classList.toggle("open", open);
    burger.classList.toggle("open", open);
    document.body.classList.toggle("no-scroll", open);
    burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  }
  if (burger) burger.addEventListener("click", function () { setMenu(!mobileMenu.classList.contains("open")); });
  if (mobileMenu) {
    Array.prototype.forEach.call(mobileMenu.querySelectorAll("a"), function (a) {
      a.addEventListener("click", function () { setMenu(false); });
    });
  }

  var navLinks = document.querySelectorAll("#navLinks a");
  var sections = [];
  navLinks.forEach(function (a) {
    var id = a.getAttribute("href").slice(1);
    var el = document.getElementById(id);
    if (el) sections.push({ el: el, link: a });
  });
  if ("IntersectionObserver" in window && sections.length) {
    var navObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          navLinks.forEach(function (l) { l.classList.remove("active"); });
          var match = sections.filter(function (s) { return s.el === e.target; })[0];
          if (match) match.link.classList.add("active");
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    sections.forEach(function (s) { navObs.observe(s.el); });
  }

  /* ---------- Split text setup ---------- */
  function splitWords(el) {
    var out = [], i = 0;
    (function walk(node, grad) {
      Array.prototype.forEach.call(node.childNodes, function (child) {
        if (child.nodeType === 3) {
          child.textContent.split(/(\s+)/).forEach(function (w) {
            if (w === "") return;
            if (w.trim() === "") { out.push(document.createTextNode(w)); return; }
            var wrap = document.createElement("span"); wrap.className = "s-word";
            var inner = document.createElement("span"); inner.className = "s-inner" + (grad ? " grad" : "");
            inner.textContent = w; inner.style.setProperty("--d", (i * 0.05) + "s"); i++;
            wrap.appendChild(inner); out.push(wrap);
          });
        } else if (child.nodeType === 1) {
          walk(child, grad || (child.classList && child.classList.contains("grad")));
        }
      });
    })(el, false);
    el.innerHTML = ""; out.forEach(function (n) { el.appendChild(n); });
    el.classList.add("split-ready");
  }

  function splitChars(el) {
    var text = el.textContent, i = 0, passedSpace = false;
    el.innerHTML = "";
    text.split("").forEach(function (ch) {
      var s = document.createElement("span");
      if (ch === " ") { s.className = "s-char space"; s.innerHTML = "&nbsp;"; passedSpace = true; }
      else { s.className = "s-char" + (passedSpace ? " g" : ""); s.textContent = ch; }
      s.style.setProperty("--d", (i * 0.04) + "s"); i++;
      el.appendChild(s);
    });
    el.classList.add("split-ready");
  }

  if (!reduceMotion) {
    document.querySelectorAll(".split-words").forEach(splitWords);
    document.querySelectorAll(".split-chars").forEach(splitChars);
  }

  /* ---------- Reveal on scroll (reveals + split words) ---------- */
  var revealEls = document.querySelectorAll(".reveal, .reveal-scale, .split-words");
  if ("IntersectionObserver" in window) {
    var revObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in-view", "in"); revObs.unobserve(e.target); }
      });
    }, { threshold: 0.14, rootMargin: "0px 0px -8% 0px" });
    revealEls.forEach(function (el) { revObs.observe(el); });
    // Safety: force reveal after a few seconds in case something never intersects.
    setTimeout(function () { revealEls.forEach(function (el) { el.classList.add("in-view", "in"); }); }, 4000);
  } else {
    revealEls.forEach(function (el) { el.classList.add("in-view", "in"); });
  }

  /* ---------- Count up stats ---------- */
  var counters = document.querySelectorAll("[data-count]");
  if ("IntersectionObserver" in window && !reduceMotion) {
    var cObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        var target = parseInt(el.getAttribute("data-count"), 10);
        var suffix = el.getAttribute("data-suffix") || "";
        var start = null, dur = 1400;
        function step(ts) {
          if (start === null) start = ts;
          var p = Math.min((ts - start) / dur, 1);
          var eased = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(eased * target) + suffix;
          if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
        cObs.unobserve(el);
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { cObs.observe(el); });
  }

  /* ---------- Typed role effect ---------- */
  var typed = document.getElementById("typed");
  if (typed) {
    var words = ["AI agents.", "full stack products.", "ML systems.", "things people use.", "tools that ship."];
    var wi = 0, ci = 0, deleting = false;
    function tick() {
      var word = words[wi];
      if (reduceMotion) { typed.textContent = word; wi = (wi + 1) % words.length; setTimeout(tick, 2000); return; }
      typed.textContent = word.slice(0, ci);
      if (!deleting) {
        if (ci < word.length) { ci++; setTimeout(tick, 70); }
        else { deleting = true; setTimeout(tick, 1600); }
      } else {
        if (ci > 0) { ci--; setTimeout(tick, 34); }
        else { deleting = false; wi = (wi + 1) % words.length; setTimeout(tick, 260); }
      }
    }
    tick();
  }

  /* ---------- Custom cursor + spotlight + magnetic ---------- */
  if (!isTouch && !reduceMotion) {
    var dot = document.getElementById("cursorDot");
    var ring = document.getElementById("cursorRing");
    var spot = document.getElementById("spotlight");
    var mx = window.innerWidth / 2, my = window.innerHeight / 2, rx = mx, ry = my;
    if (dot) dot.style.opacity = "0";
    if (ring) ring.style.opacity = "0";
    var shown = false;
    window.addEventListener("mousemove", function (e) {
      if (!shown) { shown = true; if (dot) dot.style.opacity = "1"; if (ring) ring.style.opacity = "1"; if (spot) spot.style.opacity = "1"; }
      mx = e.clientX; my = e.clientY;
      if (dot) { dot.style.left = mx + "px"; dot.style.top = my + "px"; }
      if (spot) { spot.style.left = mx + "px"; spot.style.top = my + "px"; }
    });
    (function ringLoop() {
      rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18;
      if (ring) { ring.style.left = rx + "px"; ring.style.top = ry + "px"; }
      requestAnimationFrame(ringLoop);
    })();
    document.querySelectorAll("a, button, [data-cursor], .skill-chip").forEach(function (el) {
      el.addEventListener("mouseenter", function () { if (ring) ring.classList.add("hover"); });
      el.addEventListener("mouseleave", function () { if (ring) ring.classList.remove("hover"); });
    });
    document.querySelectorAll("[data-magnetic]").forEach(function (el) {
      el.addEventListener("mousemove", function (e) {
        var r = el.getBoundingClientRect();
        var dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        el.style.transform = "translate(" + dx * 0.25 + "px," + dy * 0.35 + "px)";
      });
      el.addEventListener("mouseleave", function () { el.style.transform = ""; });
    });
  }

  /* ---------- Tilt on cards ---------- */
  if (!isTouch && !reduceMotion) {
    document.querySelectorAll("[data-tilt]").forEach(function (el) {
      var max = 5;
      el.style.transition = "transform 0.2s var(--ease)";
      el.addEventListener("mousemove", function (e) {
        var r = el.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        el.style.transform = "perspective(900px) rotateX(" + (0.5 - py) * max + "deg) rotateY(" + (px - 0.5) * max + "deg) translateY(-4px)";
      });
      el.addEventListener("mouseleave", function () { el.style.transform = ""; });
    });
    document.querySelectorAll(".venture").forEach(function (el) {
      el.addEventListener("mousemove", function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty("--mx", (e.clientX - r.left) + "px");
        el.style.setProperty("--my", (e.clientY - r.top) + "px");
      });
    });
  }

  /* ---------- Parallax on floating elements ---------- */
  if (!reduceMotion) {
    var floats = document.querySelectorAll("[data-float]");
    var ticking = false;
    function parallax() {
      var y = window.scrollY || 0;
      floats.forEach(function (el, i) {
        var speed = (i % 2 === 0 ? -1 : 1) * (0.04 + i * 0.015);
        el.style.transform = "translateY(" + y * speed + "px)";
      });
      ticking = false;
    }
    window.addEventListener("scroll", function () { if (!ticking) { requestAnimationFrame(parallax); ticking = true; } }, { passive: true });
  }

  /* ---------- Particle constellation background ---------- */
  var canvas = document.getElementById("bgCanvas");
  if (canvas && canvas.getContext) {
    var ctx = canvas.getContext("2d");
    var particles = [], W, H, DPR = Math.min(window.devicePixelRatio || 1, 2);
    var color = "150,138,255", line = "124,108,255";
    function readColors() {
      var isLight = root.getAttribute("data-theme") === "light";
      color = isLight ? "97,70,240" : "150,138,255";
      line = isLight ? "97,70,240" : "124,108,255";
    }
    window.__recolorParticles = readColors; readColors();
    function resize() {
      W = window.innerWidth; H = window.innerHeight;
      canvas.style.width = W + "px"; canvas.style.height = H + "px";
      canvas.width = W * DPR; canvas.height = H * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      var count = Math.min(Math.floor((W * H) / 16000), 90);
      particles = [];
      for (var i = 0; i < count; i++) {
        particles.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35, r: Math.random() * 1.6 + 0.6 });
      }
    }
    var mouse = { x: -999, y: -999 };
    window.addEventListener("mousemove", function (e) { mouse.x = e.clientX; mouse.y = e.clientY; });
    window.addEventListener("mouseout", function () { mouse.x = -999; mouse.y = -999; });
    function draw() {
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(" + color + ",0.55)"; ctx.fill();
        for (var j = i + 1; j < particles.length; j++) {
          var q = particles[j], dx = p.x - q.x, dy = p.y - q.y, d = dx * dx + dy * dy;
          if (d < 15000) {
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = "rgba(" + line + "," + (0.14 * (1 - d / 15000)) + ")"; ctx.lineWidth = 1; ctx.stroke();
          }
        }
        var mdx = p.x - mouse.x, mdy = p.y - mouse.y, md = mdx * mdx + mdy * mdy;
        if (md < 26000) {
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(mouse.x, mouse.y);
          ctx.strokeStyle = "rgba(" + line + "," + (0.22 * (1 - md / 26000)) + ")"; ctx.lineWidth = 1; ctx.stroke();
        }
      }
      requestAnimationFrame(draw);
    }
    resize(); window.addEventListener("resize", resize);
    if (!reduceMotion) draw();
    else { for (var k = 0; k < particles.length; k++) { var pp = particles[k]; ctx.beginPath(); ctx.arc(pp.x, pp.y, pp.r, 0, Math.PI * 2); ctx.fillStyle = "rgba(" + color + ",0.4)"; ctx.fill(); } }
  }

  /* ---------- Smooth anchor scroll (uses Lenis when present) ---------- */
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      var id = a.getAttribute("href");
      if (id === "#" || id.length < 2) return;
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      if (window.__lenis) { window.__lenis.scrollTo(target, { offset: -70 }); return; }
      var top = target.getBoundingClientRect().top + window.scrollY - 70;
      window.scrollTo({ top: top, behavior: reduceMotion ? "auto" : "smooth" });
    });
  });

  /* ---------- Momentum scroll (Lenis, guarded progressive enhancement) ---------- */
  function initLenis() {
    if (reduceMotion || isTouch) return;
    var s = document.createElement("script");
    s.src = "https://unpkg.com/lenis@1.1.14/dist/lenis.min.js";
    s.onload = function () {
      if (!window.Lenis) return;
      try {
        var lenis = new window.Lenis({ duration: 1.05, smoothWheel: true, wheelMultiplier: 1, touchMultiplier: 1.5 });
        window.__lenis = lenis;
        (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(0);
      } catch (e) {}
    };
    s.onerror = function () {};
    document.head.appendChild(s);
  }

  /* ---------- Intro preloader ---------- */
  function runIntro() {
    var intro = document.getElementById("intro");
    var heroTitle = document.querySelector(".hero-title");
    if (reduceMotion || !intro) {
      if (heroTitle) heroTitle.classList.add("in");
      if (intro) intro.style.display = "none";
      initLenis();
      return;
    }
    intro.style.animation = "none";
    document.body.classList.add("no-scroll");
    var bar = intro.querySelector(".intro-bar > span");
    if (bar) { requestAnimationFrame(function () { bar.style.transition = "width 0.95s cubic-bezier(0.22,1,0.36,1)"; bar.style.width = "100%"; }); }
    setTimeout(function () {
      intro.classList.add("done");
      document.body.classList.remove("no-scroll");
      if (heroTitle) heroTitle.classList.add("in");
      initLenis();
      setTimeout(function () { intro.style.display = "none"; }, 950);
    }, 1150);
  }
  if (document.readyState === "complete") runIntro();
  else window.addEventListener("load", runIntro);
})();
