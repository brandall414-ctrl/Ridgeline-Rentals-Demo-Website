/* Trailside Rentals — shared page behavior and motion */
(function () {
  "use strict";
  const root = document.documentElement;
  root.classList.add("js");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.addEventListener("load", () => root.classList.add("is-loaded"));
  setTimeout(() => root.classList.add("is-loaded"), 1800); // weak signal fallback

  /* ---------- header ----------
     Hides while you scroll down. Comes back only when you scroll up on
     purpose (60px or more), or after you stop scrolling for 3 seconds. */
  const header = document.querySelector(".site-header");
  const heroEl = document.querySelector(".panel--hero, .page-hero");
  let lastY = window.scrollY, upTravel = 0, idleTimer = null;
  const SHOW_AFTER_UP = 60, IDLE_MS = 3000;
  function showHeader() { header && header.classList.remove("is-hidden"); }
  function onHeader() {
    if (!header) return;
    const y = window.scrollY, dy = y - lastY;
    const heroH = heroEl ? heroEl.offsetHeight - 90 : 10;
    header.classList.toggle("is-solid", y > heroH || !header.classList.contains("site-header--over"));
    if (header.classList.contains("menu-open") || y < 120) { showHeader(); upTravel = 0; }
    else if (dy > 0) { upTravel = 0; header.classList.add("is-hidden"); }
    else if (dy < 0) { upTravel -= dy; if (upTravel >= SHOW_AFTER_UP) showHeader(); }
    lastY = y;
    clearTimeout(idleTimer);
    idleTimer = setTimeout(showHeader, IDLE_MS);
  }

  /* ---------- stacked panels: the covered panel dims and pushes back ---------- */
  const panels = Array.from(document.querySelectorAll(".panel"));
  const pageHeroImg = document.querySelector(".page-hero img");
  function onPanels() {
    if (reduce) return;
    const vh = window.innerHeight;
    panels.forEach((p, i) => {
      const next = panels[i + 1];
      let cover = 0;
      if (next) cover = Math.min(1, Math.max(0, 1 - next.getBoundingClientRect().top / vh));
      p.style.setProperty("--dim", (cover * 0.65).toFixed(3));
      p.style.setProperty("--zoom", (1 + cover * 0.08).toFixed(4));
    });
    if (pageHeroImg) {
      const r = pageHeroImg.parentElement.getBoundingClientRect();
      const t = Math.min(1, Math.max(0, -r.top / r.height));
      pageHeroImg.parentElement.style.setProperty("--zoom", (1 + t * 0.12).toFixed(4));
    }
  }
  let ticking = false;
  window.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { onHeader(); onPanels(); ticking = false; });
  }, { passive: true });
  window.addEventListener("resize", onPanels);
  onHeader(); onPanels();

  /* ---------- mobile menu ---------- */
  const btn = document.querySelector(".menu-btn");
  const menu = document.getElementById("mobile-menu");
  if (btn && menu) {
    const set = (open) => {
      btn.setAttribute("aria-expanded", String(open));
      menu.classList.toggle("is-open", open);
      header.classList.toggle("menu-open", open);
      document.body.style.overflow = open ? "hidden" : "";
    };
    btn.addEventListener("click", () => set(btn.getAttribute("aria-expanded") !== "true"));
    menu.addEventListener("click", (e) => { if (e.target.closest("a")) set(false); });
  }

  /* ---------- scroll reveals ---------- */
  const revealEls = document.querySelectorAll("[data-reveal], [data-wipe]");
  if ("IntersectionObserver" in window && !reduce) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.05 });
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("is-in"));
  }

  /* ---------- content from js/config.js ---------- */
  const cfg = window.TRAILSIDE;
  if (cfg) {
    document.querySelectorAll("[data-contact]").forEach((el) => {
      const k = el.dataset.contact;
      if (k === "email") { el.textContent = cfg.contact.email; if (el.tagName === "A") el.href = "mailto:" + cfg.contact.email; }
      if (k === "phone") { el.textContent = cfg.contact.phone; if (el.tagName === "A") el.href = cfg.contact.phoneHref; }
    });
    document.querySelectorAll("[data-price]").forEach((el) => {
      const [id, days] = el.dataset.price.split(":");
      const it = cfg.items.find((i) => i.id === id);
      if (it) el.textContent = "$" + cfg.priceFor(it, Number(days || 1));
    });
  }
  /* ---------- location map: trailhead satellite vs. wider map from Vernal ---------- */
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-map]");
    const f = document.getElementById("map-frame");
    if (!b || !f) return;
    f.src = f.getAttribute("data-" + b.dataset.map);
    document.querySelectorAll("[data-map]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
  });

  document.querySelectorAll("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));
})();
