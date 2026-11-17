/* ==========================================================================
   Trailside Rentals — homepage motion
   No pinned or scroll-jacked sections. One rAF loop, woken by scroll /
   resize / pointer, sleeps when idle.
   ========================================================================== */
(function () {
  "use strict";
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => 1 - Math.pow(1 - t, 3);
  const smooth = (t) => t * t * (3 - 2 * t);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const cfg = window.TRAILSIDE;
  let W = innerWidth, H = innerHeight, Y = scrollY, mobile = W <= 760;

  /* ---------- static fills ---------- */
  if (cfg) {
    const item = (id) => cfg.items.find((i) => i.id === id);
    $$("[data-price]").forEach((el) => { const [id, d] = el.dataset.price.split(":"); const it = item(id); if (it) el.textContent = "$" + cfg.priceFor(it, Number(d)); });
    $$("[data-extra]").forEach((el) => { const it = item(el.dataset.extra); if (it) el.textContent = "$" + it.extraDay; });
  }
  $$("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));

  /* ---------- word split for headings ---------- */
  $$("[data-split]").forEach((el) => {
    const words = el.textContent.trim().split(/\s+/);
    el.setAttribute("aria-label", el.textContent.trim());
    el.innerHTML = words.map((w, i) => `<span class="w" aria-hidden="true"><span style="--i:${i}">${w}</span></span>`).join(" ");
  });
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } }), { threshold: 0.15, rootMargin: "0px 0px -6% 0px" });
  $$("[data-rise], [data-split]").forEach((el) => io.observe(el));

  /* ---------- nav ---------- */
  const nav = $("#h-nav");
  const tones = $$("[data-tone]");
  const menuBtn = $(".h-menu-btn"), menu = $("#h-menu");
  const setMenu = (open) => { menuBtn.setAttribute("aria-expanded", String(open)); menu.hidden = !open; };
  menuBtn.addEventListener("click", () => setMenu(menuBtn.getAttribute("aria-expanded") !== "true"));
  menu.addEventListener("click", (e) => { if (e.target.closest("a")) setMenu(false); });
  addEventListener("keydown", (e) => { if (e.key === "Escape") setMenu(false); });
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
      const target = Math.max(geo, popT > 0 ? Math.sin(popT * Math.PI / 2) : 0);
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
    const tx = mobile ? 2 : 44, tc = mobile ? 4 : 30;   // on phones the tether hangs straight so it never crosses text
    rail.tether.setAttribute("d", `M${px.toFixed(1)} ${(py + 11 * k).toFixed(1)} C ${px.toFixed(1)} ${(py + 60 * k).toFixed(1)}, ${(px + tc * k).toFixed(1)} ${(py + 80 * k).toFixed(1)}, ${(px + tx * k).toFixed(1)} ${(py + 150 * k).toFixed(1)}`);
    return busy;
  }

  /* ======================================================================
     Cover: load reveal, pointer tilt, light scroll parallax
     ====================================================================== */
  const cover = $(".cover"), wall = $("#cover-wall"), copy = $(".cover__copy");
  const tilt = { x: 0, y: 0, tx: 0, ty: 0 };
  if (fine && !reduce) {
    cover.addEventListener("pointermove", (e) => { tilt.tx = (e.clientX / W - 0.5) * 2; tilt.ty = (e.clientY / H - 0.5) * 2; kick(); });
    cover.addEventListener("pointerleave", () => { tilt.tx = 0; tilt.ty = 0; kick(); });
  }
  function drawCover() {
    if (Y > H * 1.2) return false;
    tilt.x = lerp(tilt.x, tilt.tx, 0.08); tilt.y = lerp(tilt.y, tilt.ty, 0.08);
    const sc = reduce ? 0 : Y;
    wall.style.transform = `translate3d(${(tilt.x * -10).toFixed(2)}px, ${(-sc * 0.12 + tilt.y * -6).toFixed(2)}px, 0) rotateY(${(tilt.x * -5).toFixed(3)}deg) rotateX(${(tilt.y * 3).toFixed(3)}deg)`;
    copy.style.transform = `translate3d(${(tilt.x * 6).toFixed(2)}px, ${(sc * 0.18).toFixed(2)}px, 0)`;
    copy.style.opacity = String(clamp(1 - sc / (H * 0.85)));
    return Math.abs(tilt.x - tilt.tx) > 0.001 || Math.abs(tilt.y - tilt.ty) > 0.001;
  }

  /* ======================================================================
     Collage: tiles fly in from depth once, then drift a little with
     scroll (depth-based) and tilt toward the pointer on desktop.
     ====================================================================== */
  const collage = $(".collage"), world = $("#collage-world");
  const tiles = $$(".tile", world);
  tiles.forEach((t, i) => t.style.setProperty("--i", i));
  let tileZ = [];
  const measureTiles = () => { tileZ = tiles.map((t) => parseFloat(t.style.getPropertyValue(mobile ? "--mz" : "--z")) || 0); };
  new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) collage.classList.add("is-in"); }), { threshold: 0.12 }).observe(world);
  if (fine && !reduce) {
    collage.addEventListener("pointermove", (e) => {
      const r = world.getBoundingClientRect();
      const nx = clamp((e.clientX - r.left) / r.width) - 0.5, ny = clamp((e.clientY - r.top) / r.height) - 0.5;
      world.style.setProperty("--ty", (nx * 7).toFixed(2) + "deg");
      world.style.setProperty("--tx", (ny * -5).toFixed(2) + "deg");
    });
    collage.addEventListener("pointerleave", () => { world.style.setProperty("--ty", "0deg"); world.style.setProperty("--tx", "0deg"); });
  }
  function drawCollage() {
    if (reduce || !collage.classList.contains("is-in")) return;
    const r = world.getBoundingClientRect();
    if (r.bottom < -100 || r.top > H + 100) return;
    const p = (r.top + r.height / 2 - H / 2) / H;           // -1..1 around the screen centre
    tiles.forEach((t, i) => {
      const z = tileZ[i] || 0;
      t.style.setProperty("--py", (p * (z / 170) * (mobile ? 26 : 46)).toFixed(1));
    });
  }
  // the clip plays only while it's on screen
  const clipVideo = $("#clip-video");
  if (clipVideo) {
    if (reduce) clipVideo.setAttribute("controls", "");
    else new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) clipVideo.play().catch(() => {}); else clipVideo.pause(); }), { threshold: 0.2 }).observe(clipVideo);
  }

  /* ======================================================================
     How it works: phone follows the step in view (desktop)
     ====================================================================== */
  const shots = $$(".phone__shot");
  // phone captions (shown above the phone on small screens), built from the step list
  const phoneBox = $(".how__phone");
  const caps = document.createElement("div");
  caps.className = "how__caps";
  caps.innerHTML = $$(".how__step").map((s, i) => `<div class="how__cap${i === 0 ? " is-on" : ""}"><span>${i + 1}</span><h3>${s.querySelector("h3").textContent}</h3><p>${s.querySelector("p").textContent}</p></div>`).join("");
  phoneBox.prepend(caps);
  const capEls = $$(".how__cap", caps);
  const stepIO = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    $$(".how__step").forEach((s) => s.classList.toggle("is-on", s === e.target));
    const n = Number(e.target.dataset.shot);
    shots.forEach((s, i) => s.classList.toggle("is-on", i === n));
    capEls.forEach((c, i) => c.classList.toggle("is-on", i === n));
  }), { rootMargin: "-45% 0px -45% 0px" });
  $$(".how__step").forEach((s) => stepIO.observe(s));

  /* ======================================================================
     More from the gorge: native sideways swipe, arrow buttons on desktop
     ====================================================================== */
  const track = $("#gallery-track");
  const galBtns = $$("[data-gal]");
  function galState() {
    const max = track.scrollWidth - track.clientWidth - 2;
    galBtns.forEach((b) => (b.disabled = Number(b.dataset.gal) < 0 ? track.scrollLeft <= 2 : track.scrollLeft >= max));
  }
  galBtns.forEach((b) => b.addEventListener("click", () => {
    track.scrollBy({ left: Number(b.dataset.gal) * track.clientWidth * 0.8, behavior: reduce ? "auto" : "smooth" });
  }));
  track.addEventListener("scroll", galState, { passive: true });
  // let a mouse wheel's vertical scroll pass through to the page; horizontal trackpad swipes still move the row
  galState();

  /* ---------- end background drift ---------- */
  const end = $(".end"), endBg = $(".end__bg");
  function drawEnd() {
    if (reduce) return;
    const r = end.getBoundingClientRect();
    if (r.bottom < 0 || r.top > H) return;
    endBg.style.setProperty("--py", (r.top * -0.1).toFixed(1));
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
    drawCollage();
    drawEnd();
    if (busy) kick();
  }
  function kick() { if (!raf) raf = requestAnimationFrame(frame); }
  function layout() {
    W = innerWidth; H = innerHeight; mobile = W <= 760;
    measureBolts();
    measureTiles();
    galState();
    kick();
  }
  addEventListener("scroll", kick, { passive: true });
  addEventListener("resize", layout);
  addEventListener("load", layout);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
  if ("ResizeObserver" in window) new ResizeObserver(() => { measureBolts(); kick(); }).observe(document.body);

  buildBolts();
  layout();
  let revealed = false;
  const reveal = () => { if (revealed) return; revealed = true; requestAnimationFrame(() => requestAnimationFrame(() => { document.body.classList.remove("is-loading"); introStart = performance.now(); kick(); })); };
  const img = $(".cover__climber");
  if (img.complete) reveal();
  else { img.addEventListener("load", reveal, { once: true }); img.addEventListener("error", reveal, { once: true }); setTimeout(reveal, 1800); }
})();
