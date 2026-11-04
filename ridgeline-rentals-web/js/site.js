/* Trailside Rentals — shared page behavior and motion */
(function () {
  "use strict";
  const root = document.documentElement;
  root.classList.add("js");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.addEventListener("load", () => root.classList.add("is-loaded"));
  setTimeout(() => root.classList.add("is-loaded"), 1800); // weak signal fallback

  /* ---------- header: white over photos, solid after, hides on scroll down ---------- */
  const header = document.querySelector(".site-header");
  const heroEl = document.querySelector(".panel--hero, .page-hero");
  let lastY = window.scrollY;
  function onHeader() {
    if (!header) return;
    const y = window.scrollY;
    const heroH = heroEl ? heroEl.offsetHeight - 90 : 10;
    header.classList.toggle("is-solid", y > heroH || !header.classList.contains("site-header--over"));
    if (!header.classList.contains("menu-open")) header.classList.toggle("is-hidden", y > 300 && y > lastY + 4);
    if (y < lastY - 4) header.classList.remove("is-hidden");
    lastY = y;
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
  document.querySelectorAll("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));
})();
