/* ==========================================================================
   Trailside Rentals — homepage motion
   One rAF loop, woken by scroll / resize / pointer, sleeps when idle.
   ========================================================================== */
(function () {
  "use strict";
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => 1 - Math.pow(1 - t, 3);
  const smooth = (t) => t * t * (3 - 2 * t);
  const range = (v, a, b) => clamp((v - a) / (b - a));
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(pointer: fine)").matches;
  const cfg = window.TRAILSIDE;
  let W = innerWidth, H = innerHeight, Y = scrollY, mobile = W <= 760;

  /* ---------- static fills ---------- */
  if (cfg) {
    $$("[data-price]").forEach((el) => {
      const [id, days] = el.dataset.price.split(":");
      const it = cfg.items.find((i) => i.id === id);
      if (it) el.textContent = "$" + cfg.priceFor(it, Number(days));
    });
  }
  $$("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));

  /* ---------- word split for headings ---------- */
  $$("[data-split]").forEach((el) => {
    const words = el.textContent.trim().split(/\s+/);
    el.setAttribute("aria-label", el.textContent.trim());
    el.innerHTML = words.map((w, i) => `<span class="w" aria-hidden="true"><span style="--i:${i}">${w}</span></span>`).join(" ");
  });
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } }), { threshold: 0.18, rootMargin: "0px 0px -6% 0px" });
  $$("[data-rise], [data-split]").forEach((el) => io.observe(el));

  /* ---------- nav ---------- */
  const nav = $("#h-nav");
  const tones = $$("[data-tone]");
  const menuBtn = $(".h-menu-btn"), menu = $("#h-menu");
  menuBtn.addEventListener("click", () => {
    const open = menuBtn.getAttribute("aria-expanded") !== "true";
    menuBtn.setAttribute("aria-expanded", String(open));
    menu.hidden = !open;
  });
  menu.addEventListener("click", (e) => { if (e.target.closest("a")) { menuBtn.setAttribute("aria-expanded", "false"); menu.hidden = true; } });
  function updateNav() {
    nav.classList.toggle("is-scrolled", Y > 8);
    const probe = 26;
    let tone = "light";
    for (const s of tones) { const r = s.getBoundingClientRect(); if (r.top <= probe && r.bottom > probe) { tone = s.dataset.tone; break; } }
    nav.classList.toggle("is-dark", tone === "dark");
    nav.classList.toggle("is-gray", tone === "gray");
  }

  /* ---------- map toggle ---------- */
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-map]"); const f = $("#map-frame");
    if (!b || !f) return;
    f.src = f.getAttribute("data-" + b.dataset.map);
    $$("[data-map]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
  });

  /* ======================================================================
     The rail: cable, bolts, two carabiners
     ====================================================================== */
  const svgNS = "http://www.w3.org/2000/svg";
  const rail = { root: $("#rail-root"), cable: $("#cable"), twist: $("#cable-twist"), bolts: $("#bolts"),
    a: $("#biner-a"), b: $("#biner-b"), armA: $("#arm-a"), armB: $("#arm-b"), tether: $("#tether"), pouch: $("#pouch") };
  const pitches = $$("[data-pitch]").slice(1);
  let boltDocY = [], boltEls = [];
  const biners = [{ el: rail.a, t: 0, pop: 0, last: null }, { el: rail.b, t: 0, pop: 0, last: null }];
  let introStart = null;

  function buildBolts() {
    rail.bolts.innerHTML = "";
    boltEls = pitches.map(() => {
      const g = document.createElementNS(svgNS, "g");
      g.innerHTML = `<g class="bolt__in"><rect class="bolt__plate" x="-16" y="-15" width="10" height="30" rx="3"/><circle class="bolt__hole" cx="-11" cy="-8" r="1.7"/><circle class="bolt__hole" cx="-11" cy="8" r="1.7"/><rect class="bolt__plate" x="-7" y="-2" width="4" height="4"/><ellipse class="bolt__eye" cx="0" cy="0" rx="4.6" ry="3.4"/></g>`;
      rail.bolts.appendChild(g);
      return g;
    });
  }
  function measureBolts() { boltDocY = pitches.map((p) => p.getBoundingClientRect().top + scrollY); }

  function drawRail(now) {
    const k = mobile ? 0.74 : 1;
    const cx = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--rail-x")) || 34;
    rail.root.setAttribute("transform", `translate(${cx} 0)`);
    rail.cable.setAttribute("y2", H + 40);
    rail.twist.setAttribute("y2", H + 40);
    rail.twist.style.strokeDashoffset = String(-Y);

    // intro: carabiners slide down the cable into place
    if (introStart == null) introStart = now;
    const intro = reduce ? 1 : ease(clamp((now - introStart - 900) / 1300));
    const baseA = H * (mobile ? 0.5 : 0.42);
    const gap = 92 * k;
    const ys = [lerp(-60, baseA, intro), lerp(-60 - gap, baseA + gap, intro)];
    let busy = intro < 1;

    const by = boltDocY.map((d) => d - Y);
    boltEls.forEach((g, i) => { g.setAttribute("transform", `translate(0 ${by[i].toFixed(1)}) scale(${k})`); g.style.display = by[i] < -40 || by[i] > H + 40 ? "none" : ""; });

    const rIn = 24 * k, rOut = 44 * k;
    biners.forEach((bn, i) => {
      const y = ys[i];
      let d = Infinity, rel = null;
      by.forEach((b) => { const dd = Math.abs(b - y); if (dd < d) { d = dd; rel = b - y; } });
      // a bolt that jumped clean past the carabiner in one frame still gets a visible pop
      if (!reduce && bn.last != null && rel != null && Math.sign(rel) !== Math.sign(bn.last) && Math.abs(rel) < 220) bn.pop = now;
      bn.last = rel;
      const geo = smooth(clamp((rOut - d) / (rOut - rIn)));
      const popT = reduce ? 0 : Math.max(0, 1 - (now - bn.pop) / 340);
      const target = Math.max(geo, Math.sin(popT * Math.PI / 2) * (popT > 0 ? 1 : 0));
      bn.t = reduce ? target : lerp(bn.t, target, 0.38);
      if (Math.abs(bn.t - target) > 0.002 || popT > 0) busy = true;
      bn.y = y;
      const x = bn.t * 25 * k;
      bn.x = x;
      bn.el.setAttribute("transform", `translate(${x.toFixed(2)} ${y.toFixed(2)})`);
      bn.el.firstElementChild.setAttribute("transform", `rotate(${(-16 * bn.t).toFixed(2)}) scale(${k})`);
    });

    // lanyard: both arms meet at the energy absorber, which hangs off to the right
    const px = (mobile ? 22 : 34) * k, py = ys[1] + 70 * k;
    const arm = (bn, el) => {
      const x0 = bn.x + 1 * k, y0 = bn.y + 18 * k;
      el.setAttribute("d", `M${x0.toFixed(1)} ${y0.toFixed(1)} C ${(x0 + 20 * k).toFixed(1)} ${(y0 + (py - y0) * 0.45).toFixed(1)}, ${px.toFixed(1)} ${(py - 34 * k).toFixed(1)}, ${px.toFixed(1)} ${(py - 11 * k).toFixed(1)}`);
    };
    arm(biners[0], rail.armA); arm(biners[1], rail.armB);
    rail.pouch.setAttribute("transform", `translate(${px.toFixed(1)} ${py.toFixed(1)}) scale(${k})`);
    rail.tether.setAttribute("d", `M${px.toFixed(1)} ${(py + 11 * k).toFixed(1)} C ${px.toFixed(1)} ${(py + 60 * k).toFixed(1)}, ${(px + 30 * k).toFixed(1)} ${(py + 80 * k).toFixed(1)}, ${(px + 44 * k).toFixed(1)} ${(py + 150 * k).toFixed(1)}`);
    return busy;
  }

  /* ======================================================================
     Cover: load reveal, pointer tilt, scroll parallax
     ====================================================================== */
  const cover = $(".cover"), wall = $("#cover-wall"), copy = $(".cover__copy"), shadow = $(".cover__shadow");
  const tilt = { x: 0, y: 0, tx: 0, ty: 0 };
  if (fine && !reduce) {
    cover.addEventListener("pointermove", (e) => { tilt.tx = (e.clientX / W - 0.5) * 2; tilt.ty = (e.clientY / H - 0.5) * 2; kick(); });
    cover.addEventListener("pointerleave", () => { tilt.tx = 0; tilt.ty = 0; kick(); });
  }
  function drawCover() {
    if (Y > H * 1.2) return false;
    tilt.x = lerp(tilt.x, tilt.tx, 0.08); tilt.y = lerp(tilt.y, tilt.ty, 0.08);
    const sc = reduce ? 0 : Y;
    wall.style.transform = `translate3d(${(tilt.x * -10).toFixed(2)}px, ${(-sc * 0.16 + tilt.y * -6).toFixed(2)}px, 0) rotateY(${(tilt.x * -5).toFixed(3)}deg) rotateX(${(tilt.y * 3).toFixed(3)}deg)`;
    shadow.style.setProperty("--sx", (tilt.x * -22).toFixed(2));
    shadow.style.setProperty("--sy", (tilt.y * -14).toFixed(2));
    copy.style.transform = `translate3d(${(tilt.x * 6).toFixed(2)}px, ${(sc * 0.28).toFixed(2)}px, 0)`;
    copy.style.opacity = String(clamp(1 - sc / (H * 0.75)));
    return Math.abs(tilt.x - tilt.tx) > 0.001 || Math.abs(tilt.y - tilt.ty) > 0.001;
  }

  /* ======================================================================
     Walk the route (3D corridor)
     ====================================================================== */
  const walk = $(".walk"), walkItems = $$("#walk-world > *").map((el) => ({ el, z: Number(el.dataset.z), x: Number(el.dataset.x || 0), word: el.tagName === "P", end: el.classList.contains("walk__photo--end") }));
  const walkEnd = Math.abs(Math.min(...walkItems.map((i) => i.z)));
  const walkBar = $("#walk-bar");
  function drawWalk() {
    const r = walk.getBoundingClientRect();
    if (r.bottom < -50 || r.top > H + 50) return;
    const p = clamp(-r.top / (r.height - H));
    const cam = p * walkEnd;
    const spread = mobile ? 0.3 : 0.34;
    walkItems.forEach((it, i) => {
      const z = it.z + cam;
      let o;
      if (it.end) o = range(z, -1700, -950);
      else if (it.word) o = range(z, -2600, -1800) * (1 - range(z, -900, -420));
      else o = range(z, -1750, -1150) * (1 - range(z, -520, -60));
      const x = it.x * W * spread;
      const y = it.end ? 0 : it.word ? (mobile ? -H * 0.26 : 0) : (mobile ? H * 0.08 : (i % 3 === 0 ? -1 : 1) * H * 0.03);
      const ry = it.x * -14;
      it.el.style.opacity = o.toFixed(3);
      it.el.style.visibility = o < 0.01 ? "hidden" : "visible";
      if (o >= 0.01) it.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, ${z.toFixed(1)}px) rotateY(${ry}deg)`;
    });
    walkBar.style.transform = `scaleX(${p.toFixed(4)})`;
  }

  /* ======================================================================
     Ladder clip
     ====================================================================== */
  const clip = $(".clip"), clipFrame = $("#clip-frame"), clipStage = $(".clip__stage"), clipVideo = $("#clip-video");
  if (reduce) clipVideo.setAttribute("controls", "");
  else new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) clipVideo.play().catch(() => {}); else clipVideo.pause(); }), { threshold: 0.15 }).observe(clip);
  function drawClip() {
    if (reduce) return;
    const r = clip.getBoundingClientRect();
    if (r.bottom < -50 || r.top > H + 50) return;
    const p = clamp(-r.top / (r.height - H));
    const g = ease(range(p, 0, 0.42));
    const s0 = mobile ? 0.7 : 0.58;
    const s = lerp(s0, 1, g);
    clipFrame.style.setProperty("--s", s.toFixed(4));
    clipFrame.style.setProperty("--r", (lerp(40, mobile ? 0 : 28, g) / s).toFixed(2));
    clipStage.style.setProperty("--t", ease(range(p, 0.3, 0.58)).toFixed(3));
    clipStage.style.setProperty("--c", ease(range(p, 0.55, 0.78)).toFixed(3));
  }

  /* ======================================================================
     Kit: parts assemble, then come apart with labels
     ====================================================================== */
  const kitPin = $(".kit__pin"), kitSpace = $("#kit-space");
  const parts = {};
  $$(".kit__part").forEach((el) => (parts[el.dataset.part] = el));
  // positions as fractions of the space (x of width, y of height)
  const KIT = {
    desk: {
      helmet:  { a: [-0.10, -0.20, 0.78, -8], b: [-0.32, -0.04, 1, -4], z: 60 },
      harness: { a: [-0.06, 0.16, 0.86, 0],   b: [0.00, 0.06, 1.06, 0], z: 0 },
      lanyard: { a: [0.11, -0.02, 0.86, 6],   b: [0.32, -0.06, 1, 4], z: 30 },
    },
    mob: {
      helmet:  { a: [-0.12, -0.18, 0.86, -8], b: [-0.24, -0.27, 0.96, -4], z: 60 },
      harness: { a: [-0.06, 0.12, 0.9, 0],    b: [0.0, 0.17, 1.02, 0], z: 0 },
      lanyard: { a: [0.14, -0.06, 0.86, 6],   b: [0.25, -0.24, 0.92, 4], z: 30 },
    },
  };
  function drawKit() {
    const r = kitPin.getBoundingClientRect();
    if (r.bottom < -50 || r.top > H + 50) return;
    const p = reduce ? 1 : clamp(-r.top / (r.height - H));
    const e = smooth(range(p, 0.12, 0.62));
    const lab = range(p, 0.5, 0.72);
    const sw = kitSpace.clientWidth, sh = kitSpace.clientHeight;
    const set = mobile ? KIT.mob : KIT.desk;
    Object.entries(set).forEach(([name, c]) => {
      const el = parts[name]; if (!el) return;
      const x = lerp(c.a[0], c.b[0], e) * sw, y = lerp(c.a[1], c.b[1], e) * sh, s = lerp(c.a[2], c.b[2], e), rz = lerp(c.a[3], c.b[3], e);
      const z = Math.sin(e * Math.PI) * c.z * 2.2;
      const ry = reduce ? 0 : (p - 0.5) * (name === "harness" ? 10 : -16);
      el.style.transform = `translate(-50%, -50%) translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, ${z.toFixed(1)}px) rotateY(${ry.toFixed(2)}deg) rotateZ(${rz.toFixed(2)}deg) scale(${s.toFixed(3)})`;
      el.style.setProperty("--lab", lab.toFixed(3));
    });
  }

  /* ======================================================================
     How it works: phone follows the step in view
     ====================================================================== */
  const shots = $$(".phone__shot");
  const stepIO = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    $$(".how__step").forEach((s) => s.classList.toggle("is-on", s === e.target));
    const n = Number(e.target.dataset.shot);
    shots.forEach((s, i) => s.classList.toggle("is-on", i === n));
  }), { rootMargin: "-45% 0px -45% 0px" });
  $$(".how__step").forEach((s) => stepIO.observe(s));

  /* ======================================================================
     Photo strip: vertical scroll drives a horizontal pan
     ====================================================================== */
  const strip = $(".strip"), track = $("#strip-track"), stripFigs = $$("#strip-track figure");
  let stripRun = 0;
  function sizeStrip() {
    if (reduce) return;
    const padR = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--pad-r")) || 20;
    stripRun = Math.max(0, track.scrollWidth - W + padR);
    strip.style.height = (H + stripRun) + "px";
  }
  function drawStrip() {
    if (reduce) return;
    const r = strip.getBoundingClientRect();
    if (r.bottom < -50 || r.top > H + 50) return;
    const p = clamp(-r.top / Math.max(1, r.height - H));
    track.style.transform = `translate3d(${(-p * stripRun).toFixed(1)}px, 0, 0)`;
    stripFigs.forEach((f) => {
      const fr = f.getBoundingClientRect();
      const c = (fr.left + fr.width / 2 - W / 2) / W;
      f.firstElementChild.style.setProperty("--px", (5 + c * 6).toFixed(2));
    });
  }

  /* ---------- end background drift ---------- */
  const end = $(".end"), endBg = $(".end__bg");
  function drawEnd() {
    if (reduce) return;
    const r = end.getBoundingClientRect();
    if (r.bottom < 0 || r.top > H) return;
    endBg.style.setProperty("--py", ((r.top) * -0.12).toFixed(1));
  }

  /* ======================================================================
     Loop
     ====================================================================== */
  let raf = 0;
  function frame(now) {
    raf = 0;
    Y = scrollY;
    updateNav();
    let busy = drawRail(now);
    busy = drawCover() || busy;
    if (!reduce) { drawWalk(); drawClip(); drawStrip(); drawEnd(); }
    drawKit();
    if (busy) kick();
  }
  function kick() { if (!raf) raf = requestAnimationFrame(frame); }
  function layout() {
    W = innerWidth; H = innerHeight; mobile = W <= 760;
    sizeStrip();
    measureBolts();
    kick();
  }
  addEventListener("scroll", kick, { passive: true });
  addEventListener("resize", layout);
  addEventListener("load", layout);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);

  buildBolts();
  if (reduce) walkItems.forEach((it) => { it.el.loading = "lazy"; });
  layout();
  // reveal the cover once the climber is decoded
  const img = $(".cover__climber");
  let revealed = false;
  const reveal = () => { if (revealed) return; revealed = true; requestAnimationFrame(() => requestAnimationFrame(() => { document.body.classList.remove("is-loading"); introStart = performance.now(); kick(); })); };
  if (img.complete) reveal();
  else { img.addEventListener("load", reveal, { once: true }); img.addEventListener("error", reveal, { once: true }); setTimeout(reveal, 1800); }
  // layout shifts as lazy images arrive
  $$("img[loading=lazy]").forEach((i) => i.addEventListener("load", () => { measureBolts(); kick(); }, { once: true }));
})();
