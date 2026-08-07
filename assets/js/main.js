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
    if (window.__recolorWebgl) window.__recolorWebgl();
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

  /* ---------- 3D diorama: pointer parallax on hero layers ---------- */
  if (!isTouch && !reduceMotion) {
    var depthEls = document.querySelectorAll("[data-depth]");
    var tmx = 0, tmy = 0, cmx = 0, cmy = 0, dRun = false;
    function depthFrame() {
      cmx += (tmx - cmx) * 0.10; cmy += (tmy - cmy) * 0.10;
      depthEls.forEach(function (el) {
        var d = parseFloat(el.getAttribute("data-depth")) || 0;
        el.style.translate = (-cmx * d) + "px " + (-cmy * d) + "px";
      });
      if (Math.abs(tmx - cmx) > 0.0005 || Math.abs(tmy - cmy) > 0.0005) { requestAnimationFrame(depthFrame); }
      else { dRun = false; }
    }
    window.addEventListener("mousemove", function (e) {
      tmx = (e.clientX / window.innerWidth - 0.5);
      tmy = (e.clientY / window.innerHeight - 0.5);
      if (!dRun) { dRun = true; requestAnimationFrame(depthFrame); }
    });
  }

  /* ---------- Fun facts: shuffler + question chips ---------- */
  (function funStuff() {
    var facts = [
      "I have published 10+ peer reviewed papers.",
      "My first research paper went out in 2021, while I was still an undergrad.",
      "I built an agent that ranks candidates with Claude and a Qdrant vector index.",
      "I ported a MATLAB medical research tool into a full web app.",
      "I can drop you into a movie scene using Stable Diffusion.",
      "I built a control plane that decides an agent's action in about a tenth of a millisecond.",
      "I have shipped work at Postman, Ericsson, Samsung, and Fiserv.",
      "I cut a team's feature turnaround time by 30 percent at Ericsson.",
      "I move between Philadelphia and Cupertino.",
      "I study Computer and Information Science at the University of Pennsylvania."
    ];
    var factText = document.getElementById("factText");
    var factBtn = document.getElementById("factBtn");
    var factCount = document.getElementById("factCount");
    var idx = 0;
    function pad(n) { return (n < 10 ? "0" : "") + n; }
    if (factText && factBtn && factCount) {
      factCount.textContent = pad(1) + " / " + pad(facts.length);
      factBtn.addEventListener("click", function () {
        var next = idx;
        while (next === idx && facts.length > 1) { next = Math.floor((cryptoRand()) * facts.length); }
        idx = next;
        factText.classList.add("swap");
        setTimeout(function () {
          factText.textContent = facts[idx];
          factCount.textContent = pad(idx + 1) + " / " + pad(facts.length);
          factText.classList.remove("swap");
        }, 260);
      });
    }
    // avoid Math.random dependency issues by using a simple time-free pseudo shuffle
    var seed = 0;
    function cryptoRand() {
      if (window.crypto && window.crypto.getRandomValues) {
        var a = new Uint32Array(1); window.crypto.getRandomValues(a); return a[0] / 4294967296;
      }
      seed = (seed * 9301 + 49297) % 233280; return seed / 233280;
    }
    var answer = document.getElementById("funAnswer");
    document.querySelectorAll(".fun-chip").forEach(function (chip) {
      chip.addEventListener("click", function () {
        document.querySelectorAll(".fun-chip").forEach(function (c) { c.classList.remove("active"); });
        chip.classList.add("active");
        if (!answer) return;
        answer.classList.add("swap");
        setTimeout(function () { answer.textContent = chip.getAttribute("data-fun"); answer.classList.remove("swap"); }, 200);
      });
    });
  })();

  /* ---------- Explore: expandable grid with FLIP morph panel ---------- */
  (function explore() {
    var ck = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
    var EX = {
      agents: {
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="8" width="16" height="12" rx="2"/><path d="M12 8V4H8M2 14h2M20 14h2M9 13v2M15 13v2"/></svg>',
        kicker: "The problem I keep coming back to", title: "AI Agents and Guardrails",
        body: "I build autonomous agents and the systems that keep them honest. A recruiting copilot at Postman that ranks candidates with Claude and a Qdrant vector index. An HR chatbot that answers Workday questions with read only tools. And Corda AI, my venture, a control plane that decides allow, deny, or hold for a human in about a tenth of a millisecond, then keeps a tamper evident record.",
        points: ["Recruiter Agent: chat in, ranked shortlist out", "Corda AI: runtime permissions, approvals, and audit", "Agents that ask a human when they should"],
        tags: ["Agentic AI", "Claude", "Qdrant", "MCP"], links: [{ href: "https://cordaai.co/", label: "Visit Corda AI", primary: true }]
      },
      research: {
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
        kicker: "Yes, I actually read the papers", title: "10+ Publications",
        body: "More than a dozen peer reviewed papers across machine learning, computer vision, healthcare, quantum computing, security, and smart cities. My first went out in 2021 while I was still an undergrad, and my latest landed in 2025. A favorite line of work is context based image retrieval, where a hybrid pipeline lifted medical image retrieval accuracy by up to 28 percent.",
        points: ["Venues across IEEE, AIP, and IGI", "Up to 28 percent gain on medical image retrieval", "From paddy leaf disease to smart city supply chains"],
        tags: ["Computer Vision", "Healthcare AI", "Optimization"], links: [{ href: "https://scholar.google.com/citations?user=LnlYBn0AAAAJ&hl=en", label: "View on Google Scholar", primary: true }]
      },
      matlab: {
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h4l2 6 4-14 2 8h6"/></svg>',
        kicker: "A rewrite I am proud of", title: "From MATLAB to the browser",
        body: "A cardiology lab had a MATLAB tool for studying cerebral blood flow in LVAD heart pump patients. I rebuilt it as a full Python and Flask web app. From raw signals sampled at 125 Hz it computes cerebral autoregulation, cerebrovascular reactivity, and per beat pulsatility, and it separates heart driven from pump driven beats. Results export straight to Excel and JSON.",
        points: ["125 Hz signal processing in the browser", "Clinical metrics: CA, Mx, CVR, and PI", "No MATLAB license required"],
        tags: ["Python", "Flask", "Signal Processing"], links: [{ href: "https://github.com/NitinLodha2812/Serial-LVAD", label: "See the code", primary: true }]
      },
      multimodal: {
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/></svg>',
        kicker: "I can put you in a movie", title: "Multimodal magic",
        body: "For my computer vision course at Penn I built a pipeline that drops you into a cinematic scene. It captions your uploaded photo, writes a scene with an LLM, generates the frame with Stable Diffusion, and face swaps you into it, all behind a simple Gradio interface.",
        points: ["Image to text to image, chained end to end", "Stable Diffusion for the frame, face swap for you", "Wrapped in a one click Gradio app"],
        tags: ["Diffusers", "PyTorch", "Gradio"], links: [{ href: "https://github.com/NitinLodha2812/CIS5810-Cinematic", label: "See the code", primary: true }]
      },
      range: {
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m16 18 6-6-6-6M8 6l-6 6 6 6"/></svg>',
        kicker: "Same curiosity, different altitude", title: "Low level to high level",
        body: "I like the whole ladder of hard problems. Down low, an N-ary tree file system in C++ with OpenMP that made backups more than 100 percent faster through hashing and change detection. Up high, LLM agents, full stack products, and research. The fun is in moving between them.",
        points: ["C++ and OpenMP for parallel, faster backups", "Distributed systems and observability from Ericsson and Fiserv", "Full stack from React to FastAPI to Flask"],
        tags: ["C++", "OpenMP", "Systems"], links: [{ href: "https://github.com/NitinLodha2812/N-ary-tree-file-system", label: "See the code", primary: true }]
      },
      next: {
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>',
        kicker: "Where I am headed", title: "What is next",
        body: "I want to keep building AI agents that people can actually trust, ship Corda AI to teams running agents in production, and turn more research into products that hold up in the real world. If you are working on something hard in agents, full stack, or ML, I would love to talk.",
        points: ["Trustworthy, auditable AI agents", "Research that becomes real products", "Always up for a hard problem"],
        tags: ["Agents", "Guardrails", "Products"], links: [{ href: "https://cordaai.co/", label: "Visit Corda AI", primary: true }, { href: "#contact", label: "Get in touch" }]
      }
    };

    var overlay = document.getElementById("exOverlay");
    var panel = document.getElementById("exPanel");
    var inner = document.getElementById("exPanelInner");
    var closeBtn = document.getElementById("exClose");
    var backdrop = document.getElementById("exBackdrop");
    if (!overlay || !panel || !inner) return;
    var activeTile = null, isOpen = false;

    function detailHTML(d) {
      var pts = (d.points || []).map(function (p) { return '<li>' + ck + '<span>' + p + '</span></li>'; }).join("");
      var tags = (d.tags || []).map(function (t) { return '<span class="chip">' + t + '</span>'; }).join("");
      var ctas = (d.links || []).map(function (l) {
        var ext = l.href.charAt(0) === "#" ? "" : ' target="_blank" rel="noopener"';
        var cls = l.primary ? "btn btn-primary" : "btn btn-ghost";
        return '<a class="' + cls + ' exd-cta" href="' + l.href + '"' + ext + ' data-cursor>' + l.label + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>';
      }).join("");
      return '<div class="exd-head exd-anim"><span class="exd-ico">' + d.icon + '</span><div><span class="exd-kicker">' + d.kicker + '</span><h3 class="exd-title">' + d.title + '</h3></div></div>'
        + '<p class="exd-body exd-anim">' + d.body + '</p>'
        + (pts ? '<ul class="exd-points">' + pts + '</ul>' : '')
        + (tags ? '<div class="exd-tags exd-anim">' + tags + '</div>' : '')
        + (ctas ? '<div class="exd-ctas exd-anim">' + ctas + '</div>' : '');
    }
    function flip(from, reverse) {
      var last = panel.getBoundingClientRect();
      var dx = (from.left + from.width / 2) - (last.left + last.width / 2);
      var dy = (from.top + from.height / 2) - (last.top + last.height / 2);
      var sx = Math.max(from.width / last.width, 0.1), sy = Math.max(from.height / last.height, 0.1);
      var a = { transform: "translate(" + dx + "px," + dy + "px) scale(" + sx + "," + sy + ")", opacity: 0.3, borderRadius: "20px" };
      var b = { transform: "none", opacity: 1, borderRadius: "24px" };
      return panel.animate(reverse ? [b, a] : [a, b], { duration: reverse ? 420 : 520, easing: reverse ? "cubic-bezier(0.5,0,0.75,0)" : "cubic-bezier(0.22,1,0.36,1)" });
    }
    function open(tile) {
      var d = EX[tile.getAttribute("data-ex")]; if (!d) return;
      activeTile = tile; inner.innerHTML = detailHTML(d);
      overlay.classList.add("open"); overlay.setAttribute("aria-hidden", "false");
      document.body.classList.add("no-scroll"); if (window.__lenis) window.__lenis.stop();
      panel.scrollTop = 0; isOpen = true;
      var anims = inner.querySelectorAll(".exd-anim, .exd-points li");
      if (!reduceMotion && tile.getBoundingClientRect && panel.animate) {
        panel.style.transform = "none";
        flip(tile.getBoundingClientRect(), false);
        anims.forEach(function (el, i) {
          el.animate([{ opacity: 0, transform: "translateY(16px)" }, { opacity: 1, transform: "none" }], { duration: 500, delay: 190 + i * 65, easing: "cubic-bezier(0.22,1,0.36,1)", fill: "backwards" });
          el.style.opacity = "1"; el.style.transform = "none";
        });
      } else { anims.forEach(function (el) { el.style.opacity = "1"; el.style.transform = "none"; }); }
      inner.querySelectorAll("a.exd-cta").forEach(function (link) {
        link.addEventListener("click", function (e) {
          var href = link.getAttribute("href");
          if (href && href.charAt(0) === "#") {
            e.preventDefault();
            close(function () {
              var target = document.querySelector(href); if (!target) return;
              if (window.__lenis) window.__lenis.scrollTo(target, { offset: -70 });
              else window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - 70, behavior: reduceMotion ? "auto" : "smooth" });
            });
          } else { close(); }
        });
      });
      if (closeBtn) closeBtn.focus();
    }
    function close(cb) {
      if (!isOpen) { if (typeof cb === "function") cb(); return; }
      var done = function () {
        overlay.classList.remove("open"); overlay.setAttribute("aria-hidden", "true");
        document.body.classList.remove("no-scroll"); if (window.__lenis) window.__lenis.start();
        isOpen = false; var t = activeTile; activeTile = null;
        if (t && t.focus && typeof cb !== "function") t.focus();
        if (typeof cb === "function") cb();
      };
      if (!reduceMotion && activeTile && panel.animate) {
        var a = flip(activeTile.getBoundingClientRect(), true);
        overlay.classList.remove("open");
        a.onfinish = done; a.oncancel = done;
      } else { done(); }
    }
    document.querySelectorAll(".ex-tile").forEach(function (tile) { tile.addEventListener("click", function () { open(tile); }); });
    if (closeBtn) closeBtn.addEventListener("click", close);
    if (backdrop) backdrop.addEventListener("click", close);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
  })();

  /* ---------- Surprise: run my AI agent, get a ProofCard verdict ---------- */
  (function agentSurprise() {
    var fab = document.getElementById("agentFab");
    var overlay = document.getElementById("agentOverlay");
    var backdrop = document.getElementById("agentBackdrop");
    var closeBtn = document.getElementById("agentClose");
    var linesEl = document.getElementById("agentLines");
    var consoleEl = document.getElementById("agentConsole");
    var proofcard = document.getElementById("proofcard");
    var againBtn = document.getElementById("agentAgain");
    var hireBtn = document.getElementById("agentHire");
    var confetti = document.getElementById("confetti");
    if (!fab || !overlay || !consoleEl || !proofcard) return;

    function rnd() { if (window.crypto && crypto.getRandomValues) { var a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] / 4294967296; } return 0.5; }
    function pick(a) { return a[Math.floor(rnd() * a.length)]; }
    function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

    var VERDICTS = ["Verdict: HIRE", "Verdict: STRONG HIRE", "Verdict: SHIP HIM", "Verdict: HIRE. TWICE.", "Verdict: OFFER SENT"];
    var TRAITS = ["Ships agents end to end", "12 published papers", "Curious to a fault", "Turns research into products", "Builds guardrails, not just agents", "Low level to LLM, full range", "Moves fast, breaks nothing", "Reads the papers, then writes them", "Shipped at Postman, Ericsson, Samsung", "A relentless late night builder"];
    var NOTES = ["My agent is biased, but it is not wrong.", "Ran the numbers. The numbers say hire.", "Even the guardrails approved this one.", "Sourced the whole database. Found one Nitin.", "Deterministic rules and the LLM agree.", "Scored in the top percentile of one."];

    var timers = [], running = false;
    function clearTimers() { timers.forEach(clearTimeout); timers = []; }

    function typeLines(lines, done) {
      linesEl.innerHTML = ""; var i = 0, delay = reduceMotion ? 30 : 620;
      (function next() {
        if (i >= lines.length) { if (done) timers.push(setTimeout(done, reduceMotion ? 30 : 520)); return; }
        var d = document.createElement("div"); d.className = "agent-line"; d.innerHTML = lines[i]; linesEl.appendChild(d);
        i++; timers.push(setTimeout(next, delay));
      })();
    }
    function run() {
      clearTimers();
      consoleEl.classList.remove("hide"); proofcard.classList.remove("show");
      var score = 90 + Math.floor(rnd() * 10);
      typeLines([
        "> booting <b>nitin.agent</b> ...",
        "> sourcing the candidate ... <span class='ok'>done</span>",
        "> screening 12 papers, 4 companies, 3 ventures ... <span class='ok'>done</span>",
        "> scoring against the role ... <b>" + score + "/100</b>",
        "> writing the ProofCard <span class='cursor'>_</span>"
      ], function () { reveal(score); });
    }
    function reveal(score) {
      document.getElementById("pcVerdict").textContent = pick(VERDICTS);
      document.getElementById("pcNote").textContent = '"' + pick(NOTES) + '"';
      document.getElementById("pcTraits").innerHTML = shuffle(TRAITS).slice(0, 4).map(function (t) {
        return '<li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>' + t + '</li>';
      }).join("");
      var num = document.getElementById("pcScoreNum"), ring = document.getElementById("pcRing");
      var circ = 2 * Math.PI * 52; if (ring) { ring.style.strokeDasharray = circ; ring.style.strokeDashoffset = circ; }
      if (num) num.textContent = "0";
      consoleEl.classList.add("hide"); proofcard.classList.add("show");
      if (window.__agentBurst) window.__agentBurst();
      confettiBurst();
      if (reduceMotion) { if (num) num.textContent = score; if (ring) ring.style.strokeDashoffset = circ * (1 - score / 100); return; }
      var start = null;
      (function step(ts) {
        if (start === null) start = ts; var p = Math.min((ts - start) / 1100, 1), e = 1 - Math.pow(1 - p, 3);
        if (num) num.textContent = Math.round(e * score);
        if (ring) ring.style.strokeDashoffset = circ * (1 - e * score / 100);
        if (p < 1) requestAnimationFrame(step);
      })(0);
    }
    function confettiBurst() {
      if (!confetti || reduceMotion || !confetti.getContext) return;
      var ctx = confetti.getContext("2d");
      var W = confetti.width = window.innerWidth, H = confetti.height = window.innerHeight;
      var colors = ["#8b7bff", "#7c6cff", "#18d3c6", "#35e0a8", "#c084fc"], parts = [];
      for (var i = 0; i < 150; i++) parts.push({ x: W / 2 + (rnd() - 0.5) * 220, y: H / 2, vx: (rnd() - 0.5) * 17, vy: (rnd() - 1) * 15 - 4, g: 0.34 + rnd() * 0.22, r: 3 + rnd() * 4, c: colors[Math.floor(rnd() * colors.length)], rot: rnd() * 6, vr: (rnd() - 0.5) * 0.4, life: 0 });
      var max = 150;
      (function frame() {
        ctx.clearRect(0, 0, W, H); var alive = false;
        for (var i = 0; i < parts.length; i++) {
          var p = parts[i]; p.life++; if (p.life > max) continue; alive = true;
          p.vy += p.g; p.x += p.vx; p.y += p.vy; p.vx *= 0.99; p.rot += p.vr;
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.globalAlpha = Math.max(0, 1 - p.life / max);
          ctx.fillStyle = p.c; ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 1.6); ctx.restore();
        }
        if (alive) requestAnimationFrame(frame); else ctx.clearRect(0, 0, W, H);
      })();
    }
    function open() {
      overlay.classList.add("open"); overlay.setAttribute("aria-hidden", "false");
      document.body.classList.add("no-scroll"); if (window.__lenis) window.__lenis.stop();
      if (closeBtn) closeBtn.focus(); run();
    }
    function close() {
      clearTimers();
      overlay.classList.remove("open"); overlay.setAttribute("aria-hidden", "true");
      document.body.classList.remove("no-scroll"); if (window.__lenis) window.__lenis.start();
      if (fab && fab.focus) fab.focus();
    }
    fab.addEventListener("click", open);
    if (closeBtn) closeBtn.addEventListener("click", close);
    if (backdrop) backdrop.addEventListener("click", close);
    if (againBtn) againBtn.addEventListener("click", run);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && overlay.classList.contains("open")) close(); });
    if (hireBtn) hireBtn.addEventListener("click", function (e) {
      e.preventDefault(); close();
      timers.push(setTimeout(function () {
        var t = document.getElementById("contact"); if (!t) return;
        if (window.__lenis) window.__lenis.scrollTo(t, { offset: -70 });
        else window.scrollTo({ top: t.getBoundingClientRect().top + window.scrollY - 70, behavior: reduceMotion ? "auto" : "smooth" });
      }, 120));
    });
  })();

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
      if (window.__webglOn) { ctx.clearRect(0, 0, W, H); return; }
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

  /* ---------- 3D interactive object (Three.js, guarded enhancement) ---------- */
  function initWebGL() {
    if (reduceMotion) return; // 2D constellation stays as the reduced-motion background; 3D runs on mobile too
    var cnv = document.getElementById("webglCanvas");
    if (!cnv) return;
    var s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
    s.onload = function () { if (window.THREE) { try { buildScene(cnv); } catch (e) {} } };
    s.onerror = function () {};
    document.head.appendChild(s);
  }
  function buildScene(cnv) {
    var THREE = window.THREE;
    var mobile = isTouch || window.innerWidth < 760;
    var renderer = new THREE.WebGLRenderer({ canvas: cnv, alpha: true, antialias: !mobile, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 240);
    camera.position.set(0, 0, 18);

    function themeColors() {
      var light = root.getAttribute("data-theme") === "light";
      return {
        core: light ? 0x6146f0 : 0x8b7bff, node: light ? 0x06b0a4 : 0x18d3c6,
        star: light ? 0x7a6cff : 0xc3c4ff, grid: light ? 0x9aa0e6 : 0x4b40a6,
        fog: light ? 0xf4f4f8 : 0x08080c
      };
    }
    var tc = themeColors();
    scene.fog = new THREE.FogExp2(tc.fog, 0.012);

    // Calm starfield for a real universe feel (sparse, slow, depth via fog)
    var STAR = mobile ? 400 : 1000, spread = 120;
    var sgeo = new THREE.BufferGeometry(), sp = new Float32Array(STAR * 3);
    for (var s = 0; s < STAR; s++) { sp[s * 3] = (Math.random() - 0.5) * spread; sp[s * 3 + 1] = (Math.random() - 0.5) * spread; sp[s * 3 + 2] = -115 + Math.random() * 127; }
    sgeo.setAttribute("position", new THREE.BufferAttribute(sp, 3));
    var smat = new THREE.PointsMaterial({ color: tc.star, size: mobile ? 2.2 : 1.8, transparent: true, opacity: 0.85, sizeAttenuation: false, fog: true });
    var stars = new THREE.Points(sgeo, smat); scene.add(stars);

    // Morphing core, offset right so it clears the headline text
    var group = new THREE.Group(); scene.add(group); group.position.x = 4.6;
    var geo = new THREE.IcosahedronGeometry(6.2, mobile ? 2 : 3);
    var orig = geo.attributes.position.array.slice(0);
    var mat = new THREE.MeshBasicMaterial({ color: tc.core, wireframe: true, transparent: true, opacity: 0.28 });
    var mesh = new THREE.Mesh(geo, mat); group.add(mesh);
    var pgeo = new THREE.BufferGeometry(); pgeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(orig), 3));
    var pmat = new THREE.PointsMaterial({ color: tc.node, size: 0.12, transparent: true, opacity: 0.9 });
    var points = new THREE.Points(pgeo, pmat); group.add(points);
    var geo2 = new THREE.IcosahedronGeometry(3.2, 1);
    var mat2 = new THREE.MeshBasicMaterial({ color: tc.node, wireframe: true, transparent: true, opacity: 0.16 });
    var mesh2 = new THREE.Mesh(geo2, mat2); group.add(mesh2);

    window.__recolorWebgl = function () {
      var c = themeColors();
      mat.color.setHex(c.core); pmat.color.setHex(c.node); mat2.color.setHex(c.node);
      smat.color.setHex(c.star);
      if (scene.fog) scene.fog.color.setHex(c.fog);
    };

    var mX = 0, mY = 0;
    window.addEventListener("mousemove", function (e) { mX = e.clientX / window.innerWidth - 0.5; mY = e.clientY / window.innerHeight - 0.5; });
    window.addEventListener("resize", function () {
      camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Drag to spin, desktop only so it never fights touch scrolling
    var dvx = 0, dvy = 0, dragging = false, lastX = 0, lastY = 0;
    if (!isTouch) {
      var draggableTarget = function (t) { return !(t && t.closest && t.closest("a,button,input,textarea,[data-cursor],[data-tilt],.ex-tile,.fun-chip,.skill-chip,.pub")); };
      window.addEventListener("pointerdown", function (e) {
        if (e.button !== 0 || !draggableTarget(e.target)) return;
        dragging = true; lastX = e.clientX; lastY = e.clientY; document.body.style.userSelect = "none";
        var dh = document.getElementById("dragHint"); if (dh) dh.classList.add("hide");
      });
      window.addEventListener("pointermove", function (e) {
        if (!dragging) return;
        var dx = e.clientX - lastX, dy = e.clientY - lastY; lastX = e.clientX; lastY = e.clientY;
        dvy = dx * 0.006; dvx = dy * 0.006; group.rotation.y += dvy; group.rotation.x += dvx;
      });
      window.addEventListener("pointerup", function () { if (dragging) { dragging = false; document.body.style.userSelect = ""; } });
    }

    var pos = geo.attributes.position, ppos = pgeo.attributes.position, sposArr = sgeo.attributes.position.array, t = 0, burst = 0;
    window.__agentBurst = function () { burst = 1.1; };
    function animate() {
      t += 0.008;
      for (var i = 0; i < orig.length; i += 3) {
        var ox = orig[i], oy = orig[i + 1], oz = orig[i + 2];
        var n = Math.sin(ox * 0.8 + t) * Math.cos(oy * 0.8 + t * 0.7) * Math.sin(oz * 0.8 + t * 0.5);
        var f = 1 + n * (0.13 + burst * 0.65);
        pos.array[i] = ox * f; pos.array[i + 1] = oy * f; pos.array[i + 2] = oz * f;
        ppos.array[i] = ox * f; ppos.array[i + 1] = oy * f; ppos.array[i + 2] = oz * f;
      }
      pos.needsUpdate = true; ppos.needsUpdate = true;
      if (!dragging) { group.rotation.y += 0.0016 + dvy; group.rotation.x += 0.0008 + dvx; dvy *= 0.94; dvx *= 0.94; }
      mesh2.rotation.y -= 0.004; mesh2.rotation.x -= 0.0022;
      group.rotation.y += burst * 0.05; group.scale.setScalar(1 + burst * 0.22); burst *= 0.93;
      // stars drift very slowly for a calm, real universe feel
      for (var j = 0; j < STAR; j++) { sposArr[j * 3 + 2] += 0.012; if (sposArr[j * 3 + 2] > 12) sposArr[j * 3 + 2] -= 127; }
      sgeo.attributes.position.needsUpdate = true; stars.rotation.y += 0.00008;
      camera.position.x += (mX * 5 - camera.position.x) * 0.04;
      camera.position.y += (-mY * 5 - camera.position.y) * 0.04;
      camera.lookAt(0, 0, 0);
      group.position.y = (window.scrollY || 0) * 0.006;
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    }
    animate();
    window.__webglOn = true;
    root.classList.add("webgl-active");
    cnv.classList.add("on");
  }

  /* ---------- Intro preloader ---------- */
  function runIntro() {
    var intro = document.getElementById("intro");
    var heroTitle = document.querySelector(".hero-title");
    initWebGL();
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
