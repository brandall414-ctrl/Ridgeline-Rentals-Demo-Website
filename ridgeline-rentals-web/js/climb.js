/* ==========================================================================
   Trailside — "The Climb" homepage concept
   - draws a cable down the left rail, through a bolt at every chapter
   - a carabiner rides the cable at the reading line as you scroll
   - the Sky Bridge clip is scrubbed by scroll position
   ========================================================================== */
(function () {
  "use strict";
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const root = document.querySelector(".climb");
  const svg = document.querySelector(".route");
  const ghost = svg.querySelector(".cable-ghost");
  const cable = svg.querySelector(".cable");
  const boltsG = svg.querySelector(".bolts");
  const biner = document.querySelector(".biner");
  const chapters = Array.from(document.querySelectorAll("[data-sector]"));
  const sectorList = document.querySelector(".sectors");
  const counter = document.querySelector(".height");
  let total = 0, anchors = [], railW = 60, pageH = 0;

  /* ---------- sector nav ---------- */
  sectorList.innerHTML = chapters.map((c, i) => `<li data-i="${i}"><a href="#${c.id}">${c.dataset.sector}</a><i></i></li>`).join("");
  const sectorItems = Array.from(sectorList.children);

  /* ---------- build the cable path ---------- */
  function build() {
    railW = svg.getBoundingClientRect().width;
    pageH = root.offsetHeight;
    svg.setAttribute("viewBox", `0 0 ${railW} ${pageH}`);
    const top = (el) => el.getBoundingClientRect().top + window.scrollY - root.getBoundingClientRect().top - window.scrollY;
    const xs = [0.62, 0.3, 0.7, 0.36, 0.66, 0.32, 0.6];
    anchors = chapters.map((c, i) => ({ x: railW * xs[i % xs.length], y: Math.max(40, top(c) + Math.min(180, c.offsetHeight * 0.18)) }));
    anchors.unshift({ x: railW * 0.5, y: 0 });
    anchors.push({ x: railW * 0.5, y: pageH });
    let d = `M ${anchors[0].x} ${anchors[0].y}`;
    for (let i = 1; i < anchors.length; i++) {
      const a = anchors[i - 1], b = anchors[i], my = (a.y + b.y) / 2;
      // a slack cable: sags sideways between bolts
      const sag = (i % 2 ? 1 : -1) * railW * 0.22;
      d += ` C ${a.x + sag} ${my - (b.y - a.y) * 0.15}, ${b.x + sag} ${my + (b.y - a.y) * 0.15}, ${b.x} ${b.y}`;
    }
    ghost.setAttribute("d", d);
    cable.setAttribute("d", d);
    total = cable.getTotalLength();
    boltsG.innerHTML = anchors.slice(1, -1).map((p) => `<rect class="bolt" x="${p.x - 5}" y="${p.y - 5}" width="10" height="10" transform="rotate(45 ${p.x} ${p.y})"></rect>`).join("");
    update();
  }

  // length along the path whose y is closest to targetY (path y only increases)
  function lengthAtY(targetY) {
    let lo = 0, hi = total;
    for (let n = 0; n < 22; n++) {
      const mid = (lo + hi) / 2;
      if (cable.getPointAtLength(mid).y < targetY) lo = mid; else hi = mid;
    }
    return lo;
  }

  /* ---------- per-frame update ---------- */
  function update() {
    if (!total) return;
    const vh = window.innerHeight;
    const rootTop = root.getBoundingClientRect().top + window.scrollY;
    const readY = window.scrollY + vh * 0.55 - rootTop;
    const len = lengthAtY(readY);
    cable.style.strokeDasharray = `${len} ${total}`;
    const p = cable.getPointAtLength(len);
    const q = cable.getPointAtLength(Math.min(total, len + 2));
    const ang = Math.atan2(q.y - p.y, q.x - p.x) * 180 / Math.PI - 90;
    const sx = svg.getBoundingClientRect().left;
    biner.style.transform = `translate3d(${sx + p.x - biner.offsetWidth / 2}px, ${p.y + rootTop - window.scrollY - 4}px, 0) rotate(${ang * 0.35}deg)`;
    const bolts = boltsG.children;
    for (let i = 0; i < bolts.length; i++) bolts[i].classList.toggle("is-passed", anchors[i + 1].y <= readY);
    // current chapter
    let cur = 0;
    chapters.forEach((c, i) => { if (c.getBoundingClientRect().top < vh * 0.55) cur = i; });
    sectorItems.forEach((li, i) => { li.classList.toggle("is-current", i === cur); li.classList.toggle("is-passed", i < cur); });
    counter.innerHTML = `<b>${String(cur + 1).padStart(2, "0")} / ${String(chapters.length).padStart(2, "0")}</b><span>${chapters[cur].dataset.sector}</span>`;
    if (!reduce) parallax(vh);
    scrub(vh);
  }

  /* ---------- parallax on two photos ---------- */
  const hero = document.querySelector(".trailhead");
  const clipPhoto = document.querySelector(".clipin__photo");
  function parallax(vh) {
    const r = hero.getBoundingClientRect();
    const t = Math.min(1, Math.max(0, -r.top / r.height));
    hero.style.setProperty("--zoom", (1.04 + t * 0.1).toFixed(4));
    if (clipPhoto) {
      const c = clipPhoto.getBoundingClientRect();
      const k = (c.top + c.height / 2 - vh / 2) / vh; // -1..1
      clipPhoto.style.setProperty("--py", `${(k * -40).toFixed(1)}px`);
    }
  }

  /* ---------- sky bridge: scroll scrubs the clip ---------- */
  const bridge = document.querySelector(".bridge");
  const video = bridge.querySelector("video");
  const lines = Array.from(bridge.querySelectorAll(".bridge__line"));
  const meter = bridge.querySelector(".bridge__meter i");
  let wantT = 0, seeking = false;
  function scrub(vh) {
    const r = bridge.getBoundingClientRect();
    const span = r.height - vh;
    const t = Math.min(1, Math.max(0, -r.top / span));
    meter.style.width = (t * 100).toFixed(1) + "%";
    const idx = Math.min(lines.length - 1, Math.floor(t * lines.length * 0.999));
    lines.forEach((l, i) => l.classList.toggle("is-on", i === idx));
    if (reduce || !video.duration) return;
    wantT = t * (video.duration - 0.05);
    if (!seeking) { seeking = true; video.currentTime = wantT; }
  }
  video.addEventListener("seeked", () => {
    seeking = false;
    if (Math.abs(video.currentTime - wantT) > 0.03) { seeking = true; video.currentTime = wantT; }
  });
  // iOS only renders seeks after a user-initiated play once
  const prime = () => { video.play().then(() => video.pause()).catch(() => {}); window.removeEventListener("touchstart", prime); };
  window.addEventListener("touchstart", prime, { passive: true });

  /* ---------- wiring ---------- */
  let ticking = false;
  window.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { update(); ticking = false; });
  }, { passive: true });
  let rT;
  window.addEventListener("resize", () => { clearTimeout(rT); rT = setTimeout(build, 120); });
  window.addEventListener("load", build);
  document.querySelectorAll(".climb img").forEach((img) => { if (!img.complete) img.addEventListener("load", () => { clearTimeout(rT); rT = setTimeout(build, 120); }, { once: true }); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(build);
  build();

  const note = document.querySelector(".concept-note");
  if (note) note.querySelector("button").addEventListener("click", () => note.remove());
})();
