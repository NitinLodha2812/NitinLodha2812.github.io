/* Nitin Lodha — portfolio interactions. No libraries.

   The motion system is one idea: a pulse travels through a line of type and
   each letter widens as it passes, using the width axis of Roboto Flex.
   The hero name, section headings, menu links and the contact email all use
   the same Wave object. Everything else is small and answers an action. */
(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

  /* ---------- Split text into word and letter spans ---------- */
  function splitLetters(el) {
    var text = el.textContent;
    var letters = [];
    el.textContent = "";
    text.split(/(\s+)/).forEach(function (part) {
      if (!part) return;
      if (/^\s+$/.test(part)) { el.appendChild(document.createTextNode(" ")); return; }
      var w = document.createElement("span");
      w.className = "w";
      Array.from(part).forEach(function (ch) {
        var c = document.createElement("span");
        c.className = "ch";
        c.textContent = ch;
        w.appendChild(c);
        letters.push(c);
      });
      el.appendChild(w);
    });
    return letters;
  }

  /* ---------- One shared animation loop ---------- */
  var active = new Set();
  var raf = 0;
  function wake(a) {
    active.add(a);
    if (!raf) raf = requestAnimationFrame(tick);
  }
  function tick(now) {
    raf = 0;
    active.forEach(function (a) { if (!a.step(now)) active.delete(a); });
    if (active.size) raf = requestAnimationFrame(tick);
  }

  /* ---------- Wave ---------- */
  function Wave(el, letters, opts) {
    this.el = el;
    this.letters = letters;
    this.groups = [{ letters: letters, base: 100 }];
    this.o = Object.assign({
      amp: 50,          // peak change in width, in wdth units
      wAmp: 150,        // peak change in weight
      sigma: 0.07,      // pulse width, as a fraction of the line
      frame: null,      // element whose box defines 0..1; defaults to the text extent
      trace: null,      // svg path that draws the signal
      dot: null,        // marker riding the peak
      resetWhenIdle: false
    }, opts || {});
    this.baseWeight = 700;
    this.pulses = [];
    this.pointer = { p: 0.5, a: 0, tp: 0.5, ta: 0 };
    this.squeeze = 0;
    this.reveal = null;
    this.revealPulse = null;
  }

  Wave.prototype.readBase = function () {
    var cs = getComputedStyle(this.el);
    this.baseWeight = parseFloat(cs.fontWeight) || 700;
    var st = parseFloat(cs.fontStretch);
    this.groups.forEach(function (g) { g.base = isNaN(st) ? 100 : st; });
    this.calibrate();
  };

  // Measure how much each letter's width moves per unit of the width axis
  // and per unit of weight, so a pulse can be paid for exactly by the other
  // letters and the line never changes length.
  Wave.prototype.calibrate = function () {
    var bw = this.baseWeight;
    var widths = function (L) { return L.map(function (c) { return c.getBoundingClientRect().width; }); };
    this.groups.forEach(function (g) {
      var L = g.letters;
      var hi = Math.min(151, g.base + 20), lo = Math.max(25, g.base - 20);
      L.forEach(function (c) { c.style.fontStretch = g.base + "%"; c.style.fontWeight = bw; });
      var w0 = widths(L);
      L.forEach(function (c) { c.style.fontStretch = hi + "%"; });
      var wh = widths(L);
      L.forEach(function (c) { c.style.fontStretch = lo + "%"; });
      var wl = widths(L);
      L.forEach(function (c) { c.style.fontStretch = g.base + "%"; c.style.fontWeight = bw + 150; });
      var ww = widths(L);
      L.forEach(function (c, i) {
        c.style.fontWeight = bw;
        c._a = Math.max(0.01, (wh[i] - wl[i]) / Math.max(1, hi - lo));
        c._b = (ww[i] - w0[i]) / 150;
      });
      g.sumA = L.reduce(function (t, c) { return t + c._a; }, 0) || 1;
    });
  };

  Wave.prototype.measure = function () {
    var left, width;
    if (this.o.frame) {
      var fr = this.o.frame.getBoundingClientRect();
      left = fr.left; width = fr.width;
    } else {
      var min = Infinity, max = -Infinity;
      this.letters.forEach(function (c) {
        var r = c.getBoundingClientRect();
        if (r.left < min) min = r.left;
        if (r.right > max) max = r.right;
      });
      left = min; width = Math.max(1, max - min);
    }
    this.letters.forEach(function (c) {
      var r = c.getBoundingClientRect();
      c._x = (r.left + r.width / 2 - left) / width;
    });
  };

  Wave.prototype.signal = function (x) {
    var k = 2 * this.o.sigma * this.o.sigma, s = 0, d, i, p;
    for (i = 0; i < this.pulses.length; i++) {
      p = this.pulses[i];
      d = x - p.p;
      s += p.a * Math.exp(-d * d / k);
    }
    p = this.pointer;
    if (p.a > 0.001) { d = x - p.p; s += p.a * Math.exp(-d * d / k); }
    return Math.min(s, 1.15);
  };

  Wave.prototype.apply = function () {
    var self = this, o = this.o;
    this.groups.forEach(function (g) {
      var base = g.base - self.squeeze;
      var dS = [], dW = [], extra = 0;
      g.letters.forEach(function (c, i) {
        var s = self.signal(c._x || 0);
        dS[i] = Math.min(o.amp * s, 151 - base);
        dW[i] = Math.min(o.wAmp * s, 1000 - self.baseWeight);
        extra += (c._a || 0) * dS[i] + (c._b || 0) * dW[i];
      });
      // Widen and thicken the letters under the pulse, then take the extra
      // width back evenly from every letter so the line keeps its length.
      var comp = extra / (g.sumA || 1);
      var write = function (shift) {
        g.letters.forEach(function (c, i) {
          var st = base + dS[i] - comp - shift;
          var wt = self.baseWeight + dW[i];
          if (self.reveal !== null) {
            var t = clamp((self.reveal - (c._x - 0.07)) / 0.14, 0, 1);
            st = lerp(25, st, easeOut(t));
            c.style.opacity = clamp(t * 2.2, 0, 1).toFixed(3);
          }
          c.style.fontStretch = clamp(st, 25, 151).toFixed(2) + "%";
          c.style.fontWeight = Math.round(clamp(wt, 100, 1000));
        });
      };
      write(0);
      // Weight and width do not add up linearly at the extremes, so for lines
      // that must stay flush, measure once and hand back what is left over.
      if (g.node && g.target && self.reveal === null && self.squeeze === 0 && extra > 0.5) {
        var err = g.node.getBoundingClientRect().width - g.target;
        if (Math.abs(err) > 0.5) write(err / (g.sumA || 1));
      }
    });
    if (o.trace) this.drawTrace();
  };

  Wave.prototype.reset = function () {
    this.letters.forEach(function (c) {
      c.style.fontStretch = "";
      c.style.fontWeight = "";
      c.style.opacity = "";
    });
  };

  Wave.prototype.drawTrace = function () {
    var N = 180, d = "", peak = 0, peakX = 0;
    var end = this.reveal === null ? 1 : clamp(this.reveal, 0, 1);
    for (var i = 0; i <= N; i++) {
      var x = (i / N) * end;
      var s = this.signal(x);
      if (s > peak) { peak = s; peakX = x; }
      d += (i ? "L" : "M") + (x * 1000).toFixed(1) + " " + (72 - 60 * s).toFixed(2);
    }
    this.o.trace.setAttribute("d", d);
    if (this.o.dot) {
      var dot = this.o.dot;
      dot.style.left = (peakX * 100).toFixed(2) + "%";
      dot.style.top = (72 - 60 * peak).toFixed(2) + "%";
      dot.style.opacity = peak > 0.12 ? "1" : "0";
    }
  };

  Wave.prototype.sweep = function (opts) {
    opts = opts || {};
    var p = {
      p0: opts.p0 != null ? opts.p0 : -0.15,
      p1: opts.p1 != null ? opts.p1 : 1.15,
      a: opts.a != null ? opts.a : 1,
      dur: opts.dur || 1200,
      start: performance.now() + (opts.delay || 0),
      p: -1
    };
    p.p = p.p0;
    this.pulses.push(p);
    wake(this);
    return p;
  };

  Wave.prototype.step = function (now) {
    var q = this.pointer;
    this.pulses = this.pulses.filter(function (p) {
      var t = (now - p.start) / p.dur;
      if (t >= 1) { p.done = true; return false; }
      p.p = lerp(p.p0, p.p1, easeInOut(clamp(t, 0, 1)));
      return true;
    });
    if (this.revealPulse) {
      if (this.revealPulse.done) {
        this.revealPulse = null;
        this.reveal = null;
        this.letters.forEach(function (c) { c.style.opacity = ""; });
      } else {
        this.reveal = this.revealPulse.p + 0.03;
      }
    }
    q.p = lerp(q.p, q.tp, 0.16);
    q.a = lerp(q.a, q.ta, 0.07);
    var busy = this.pulses.length > 0 || this.revealPulse ||
      Math.abs(q.a - q.ta) > 0.002 || (q.a > 0.002 && Math.abs(q.p - q.tp) > 0.0005);
    if (!busy && q.ta === 0) q.a = 0;
    this.apply();
    if (!busy && this.o.resetWhenIdle && q.a === 0) this.reset();
    return busy;
  };

  Wave.prototype.follow = function (clientX, strength) {
    var r = this.el.getBoundingClientRect();
    var q = this.pointer;
    q.tp = (clientX - r.left) / r.width;
    if (q.a < 0.02) q.p = q.tp;
    q.ta = strength;
    wake(this);
  };
  Wave.prototype.release = function () {
    this.pointer.ta = 0;
    wake(this);
  };

  /* ---------- Fit a line of type to its container ----------
     Pick a size from the widest line at normal width, then set each line's
     width axis so it fills the container exactly. On phones the rows stack
     and each gets its own width, so both lines end flush. */
  function fit(w, rows, fitEl, maxSize) {
    var el = w.el;
    var avail = el.clientWidth;
    if (!avail) return;
    var stacked = rows.length > 1 && getComputedStyle(rows[0]).display === "block";
    var groups = stacked
      ? rows.map(function (r) { return { letters: r._letters, node: r }; })
      : [{ letters: w.letters, node: fitEl }];

    w.letters.forEach(function (c) {
      c.style.fontStretch = "100%";
      c.style.fontWeight = w.baseWeight;
      c.style.opacity = "";
    });
    el.style.fontSize = "100px";
    var widest = 0;
    groups.forEach(function (g) { widest = Math.max(widest, g.node.getBoundingClientRect().width); });
    var size = Math.min(100 * avail / widest, maxSize());
    el.style.fontSize = size.toFixed(2) + "px";

    groups.forEach(function (g) {
      var lo = 25, hi = 151;
      for (var k = 0; k < 14; k++) {
        var mid = (lo + hi) / 2;
        g.letters.forEach(function (c) { c.style.fontStretch = mid + "%"; });
        if (g.node.getBoundingClientRect().width > avail) hi = mid; else lo = mid;
      }
      g.base = lo;
      g.letters.forEach(function (c) { c.style.fontStretch = lo + "%"; });
      g.target = g.node.getBoundingClientRect().width;
    });
    w.groups = groups;
    w.calibrate();
  }

  /* ---------- Hero ---------- */
  var hero = document.getElementById("top");
  var heroName = document.getElementById("heroName");
  var heroWave = null, heroRows = [], heroFit = null;
  if (heroName) {
    heroRows = Array.from(heroName.querySelectorAll(".row"));
    heroFit = heroName.querySelector(".fit");
    var heroLetters = [];
    heroRows.forEach(function (r) {
      r._letters = splitLetters(r);
      heroLetters = heroLetters.concat(r._letters);
    });
    heroWave = new Wave(heroName, heroLetters, {
      amp: 64, wAmp: 190, sigma: 0.06,
      frame: heroName,
      trace: document.getElementById("tracePath"),
      dot: document.getElementById("traceDot")
    });
    heroWave.baseWeight = 800;
  }

  /* ---------- Contact email ---------- */
  var email = document.getElementById("email");
  var emailWave = null, emailRows = [], emailFit = null;
  if (email) {
    emailRows = Array.from(email.querySelectorAll(".row"));
    emailFit = email.querySelector(".fit");
    var emailLetters = [];
    emailRows.forEach(function (r) {
      r._letters = splitLetters(r);
      emailLetters = emailLetters.concat(r._letters);
    });
    emailWave = new Wave(email, emailLetters, { amp: 56, wAmp: 160, sigma: 0.05, frame: email });
    emailWave.baseWeight = 760;
  }

  var lastW = 0, lastH = 0;
  function layout() {
    lastW = window.innerWidth; lastH = window.innerHeight;
    if (heroWave) {
      fit(heroWave, heroRows, heroFit, function () { return window.innerHeight * 0.3; });
      heroWave.measure();
      heroWave.apply();
    }
    if (emailWave) {
      fit(emailWave, emailRows, emailFit, function () { return 150; });
      emailWave.measure();
      emailWave.apply();
    }
  }

  function fontsReady() {
    if (!document.fonts) return Promise.resolve();
    var wait = Promise.all([
      document.fonts.load('800 100px "Roboto Flex"'),
      document.fonts.load('400 20px "Newsreader"')
    ]).then(function () { return document.fonts.ready; });
    return Promise.race([wait, new Promise(function (r) { setTimeout(r, 2500); })]);
  }

  fontsReady().then(function () {
    layout();
    if (heroWave && !reduce) {
      heroWave.reveal = -0.2;
      heroWave.apply();
      heroName.classList.add("is-fit");
      heroWave.revealPulse = heroWave.sweep({ p0: -0.1, p1: 1.12, dur: 1800, delay: 150 });
    } else if (heroName) {
      heroName.classList.add("is-fit");
    }
    if (hero) hero.classList.add("is-in");
    onScroll();
  });

  // A late font swap changes every measurement, so lay out again.
  if (document.fonts && document.fonts.addEventListener) {
    document.fonts.addEventListener("loadingdone", function () {
      if (heroName && heroName.classList.contains("is-fit") && !(heroWave && heroWave.revealPulse)) layout();
    });
  }

  var resizeT = 0;
  window.addEventListener("resize", function () {
    clearTimeout(resizeT);
    resizeT = setTimeout(function () {
      // Mobile browsers resize the viewport as the address bar hides; only
      // refit when the width changes or the height changes a lot.
      if (window.innerWidth === lastW && Math.abs(window.innerHeight - lastH) < 140) return;
      if (heroWave && heroWave.revealPulse) {
        heroWave.revealPulse = null;
        heroWave.reveal = null;
      }
      layout();
      if (window.innerWidth > 760) closeMenu();
    }, 140);
  });

  if (heroWave && !reduce) {
    if (fine) {
      hero.addEventListener("pointermove", function (e) {
        if (heroWave.revealPulse) return;
        var r = heroName.getBoundingClientRect();
        var dy = Math.abs(e.clientY - (r.top + r.height / 2));
        heroWave.follow(e.clientX, clamp(1.15 - dy / (window.innerHeight * 0.6), 0.3, 1));
      });
      hero.addEventListener("pointerleave", function () { heroWave.release(); });
    }
    // Tap or click the name to send a pulse through it.
    heroName.parentElement.addEventListener("click", function () {
      if (!heroWave.revealPulse) heroWave.sweep({ dur: 1300 });
    });
  }

  if (emailWave && fine && !reduce) {
    email.addEventListener("pointermove", function (e) { emailWave.follow(e.clientX, 1); });
    email.addEventListener("pointerleave", function () { emailWave.release(); });
  }

  /* ---------- Section headings: one pulse when they arrive ---------- */
  var headingWaves = [];
  document.querySelectorAll(".wave").forEach(function (h) {
    var text = h.textContent;
    h.textContent = "";
    var sr = document.createElement("span");
    sr.className = "sr";
    sr.textContent = text;
    var vis = document.createElement("span");
    vis.setAttribute("aria-hidden", "true");
    vis.textContent = text;
    h.appendChild(sr);
    h.appendChild(vis);
    var w = new Wave(h, splitLetters(vis), { amp: 46, wAmp: 160, sigma: 0.08, resetWhenIdle: true });
    h._wave = w;
    headingWaves.push(h);
  });
  if (!reduce && "IntersectionObserver" in window) {
    var headIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        headIO.unobserve(en.target);
        var w = en.target._wave;
        w.readBase();
        w.measure();
        w.sweep({ dur: 1250, delay: 80 });
      });
    }, { threshold: 0.9, rootMargin: "0px 0px -8% 0px" });
    headingWaves.forEach(function (h) { headIO.observe(h); });
  }

  /* ---------- Statement: words take ink as you read ---------- */
  var ink = document.getElementById("ink");
  var inkWords = [];
  if (ink) {
    var text = ink.textContent;
    ink.textContent = "";
    text.split(/(\s+)/).forEach(function (part) {
      if (!part) return;
      if (/^\s+$/.test(part)) { ink.appendChild(document.createTextNode(" ")); return; }
      var s = document.createElement("span");
      s.className = "word";
      s.textContent = part;
      ink.appendChild(s);
      inkWords.push(s);
    });
    if (reduce) inkWords.forEach(function (s) { s.classList.add("on"); });
  }
  function updateInk() {
    if (!ink || reduce) return;
    var r = ink.getBoundingClientRect(), vh = window.innerHeight;
    var progress = clamp((vh * 0.88 - r.top) / (vh * 0.3 + r.height), 0, 1);
    var count = Math.round(progress * inkWords.length);
    for (var i = 0; i < inkWords.length; i++) inkWords[i].classList.toggle("on", i < count);
  }

  /* ---------- Years chart ---------- */
  var years = document.getElementById("years");
  if (years) {
    // Today's date as a fractional year; bars fade past it and the marker sits on it.
    var d = new Date();
    var nowY = d.getFullYear() + (d.getMonth() + d.getDate() / 31) / 12;
    years.style.setProperty("--now", clamp(nowY, 2019, 2027.45).toFixed(3));
  }

  /* ---------- Charts draw in once they are on screen ---------- */
  var charts = [years, document.getElementById("spark")].filter(Boolean);
  if (reduce || !("IntersectionObserver" in window)) {
    charts.forEach(function (c) { c.classList.add("is-in"); });
  } else {
    var chartIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("is-in"); chartIO.unobserve(en.target); }
      });
    }, { threshold: 0.35 });
    charts.forEach(function (c) { chartIO.observe(c); });
  }

  /* ---------- Projects: expand a row ---------- */
  document.querySelectorAll(".item-head").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var item = btn.closest(".item");
      var open = !item.classList.contains("is-open");
      item.classList.toggle("is-open", open);
      btn.setAttribute("aria-expanded", String(open));
    });
  });

  /* ---------- Portrait: a lens that shows the photo in colour ---------- */
  var portrait = document.getElementById("portrait");
  if (portrait) {
    var place = function (e) {
      var r = portrait.getBoundingClientRect();
      portrait.style.setProperty("--x", (e.clientX - r.left).toFixed(1) + "px");
      portrait.style.setProperty("--y", (e.clientY - r.top).toFixed(1) + "px");
    };
    if (fine) {
      portrait.addEventListener("pointerenter", function (e) { place(e); portrait.classList.add("is-lens"); });
      portrait.addEventListener("pointermove", place);
      portrait.addEventListener("pointerleave", function () { portrait.classList.remove("is-lens"); });
    } else {
      portrait.addEventListener("click", function (e) {
        place(e);
        portrait.classList.toggle("is-full");
      });
    }
  }

  /* ---------- Copy email ---------- */
  var copyBtn = document.getElementById("copyEmail");
  var copyStatus = document.getElementById("copyStatus");
  if (copyBtn) {
    var addr = "nitinlodha2812@gmail.com";
    var label = copyBtn.textContent;
    var copyT = 0;
    var done = function () {
      copyBtn.textContent = "Copied";
      copyBtn.classList.add("is-done");
      if (copyStatus) copyStatus.textContent = "Email address copied";
      if (emailWave && !reduce) emailWave.sweep({ dur: 1100 });
      clearTimeout(copyT);
      copyT = setTimeout(function () {
        copyBtn.textContent = label;
        copyBtn.classList.remove("is-done");
        if (copyStatus) copyStatus.textContent = "";
      }, 2200);
    };
    var fallback = function () {
      var ta = document.createElement("textarea");
      ta.value = addr;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand("copy"); } catch (err) { ok = false; }
      ta.remove();
      if (ok) done(); else copyBtn.textContent = addr;
    };
    copyBtn.addEventListener("click", function () {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(addr).then(done, fallback);
      } else {
        fallback();
      }
    });
  }

  /* ---------- Mobile menu ---------- */
  var nav = document.getElementById("nav");
  var menu = document.getElementById("menu");
  var menuBtn = document.getElementById("menuBtn");
  var menuWaves = [];
  if (menu) {
    menu.querySelectorAll(".menu-links a").forEach(function (a) {
      var text = a.textContent;
      a.setAttribute("aria-label", text);
      var vis = document.createElement("span");
      vis.setAttribute("aria-hidden", "true");
      vis.textContent = text;
      a.textContent = "";
      a.appendChild(vis);
      menuWaves.push(new Wave(a, splitLetters(vis), { amp: 60, wAmp: 160, sigma: 0.12, resetWhenIdle: true }));
    });
  }
  function openMenu() {
    menu.classList.add("is-open");
    menu.removeAttribute("inert");
    nav.classList.add("is-open");
    menuBtn.setAttribute("aria-expanded", "true");
    menuBtn.textContent = "Close";
    document.body.style.overflow = "hidden";
    if (!reduce) {
      menuWaves.forEach(function (w, i) {
        w.readBase();
        w.measure();
        w.sweep({ dur: 900, delay: 60 + i * 70 });
      });
    }
  }
  function closeMenu() {
    if (!menu || !menu.classList.contains("is-open")) return;
    menu.classList.remove("is-open");
    menu.setAttribute("inert", "");
    nav.classList.remove("is-open");
    menuBtn.setAttribute("aria-expanded", "false");
    menuBtn.textContent = "Menu";
    document.body.style.overflow = "";
  }
  if (menuBtn) {
    menuBtn.addEventListener("click", function () {
      if (menu.classList.contains("is-open")) closeMenu(); else openMenu();
    });
    menu.querySelectorAll("a").forEach(function (a) { a.addEventListener("click", closeMenu); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && menu.classList.contains("is-open")) { closeMenu(); menuBtn.focus(); }
    });
  }

  /* ---------- Scroll: nav colour, current section, hero squeeze ---------- */
  var toned = Array.from(document.querySelectorAll("main [data-tone]"));
  var navLinks = Array.from(document.querySelectorAll(".nav-links a"));
  var navTargets = navLinks.map(function (a) { return document.querySelector(a.getAttribute("href")); });
  var lastSqueeze = -1;

  function onScroll() {
    if (nav) {
      var y = nav.offsetHeight / 2;
      for (var i = 0; i < toned.length; i++) {
        var r = toned[i].getBoundingClientRect();
        if (r.top <= y && r.bottom > y) { nav.setAttribute("data-tone", toned[i].getAttribute("data-tone")); break; }
      }
      var mark = window.innerHeight * 0.35, current = -1;
      navTargets.forEach(function (t, j) { if (t && t.getBoundingClientRect().top <= mark) current = j; });
      navLinks.forEach(function (a, j) {
        if (j === current) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current");
      });
    }
    updateInk();
    if (heroWave && !reduce && heroName.classList.contains("is-fit")) {
      // The name condenses as the hero scrolls away.
      var k = clamp(window.scrollY / (hero.offsetHeight * 0.85), 0, 1);
      var sq = Math.round(k * 40 * 10) / 10;
      if (sq !== lastSqueeze) {
        lastSqueeze = sq;
        heroWave.squeeze = sq;
        if (!active.has(heroWave)) heroWave.apply();
      }
    }
  }

  var scrollQueued = false;
  window.addEventListener("scroll", function () {
    if (scrollQueued) return;
    scrollQueued = true;
    requestAnimationFrame(function () { scrollQueued = false; onScroll(); });
  }, { passive: true });
  onScroll();
})();
