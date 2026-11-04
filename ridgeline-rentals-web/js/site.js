/* Trailside Rentals — shared page behavior */
(function () {
  "use strict";
  const root = document.documentElement;
  root.classList.add("js");
  window.addEventListener("load", () => root.classList.add("is-loaded"));
  // fallback in case load is slow on weak signal
  setTimeout(() => root.classList.add("is-loaded"), 1800);

  const header = document.querySelector(".site-header");
  const onScroll = () => header && header.classList.toggle("is-scrolled", window.scrollY > 8);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  const btn = document.querySelector(".menu-btn");
  const menu = document.getElementById("mobile-menu");
  if (btn && menu) {
    btn.addEventListener("click", () => {
      const open = btn.getAttribute("aria-expanded") !== "true";
      btn.setAttribute("aria-expanded", String(open));
      menu.classList.toggle("is-open", open);
    });
    menu.addEventListener("click", (e) => {
      if (e.target.closest("a")) { btn.setAttribute("aria-expanded", "false"); menu.classList.remove("is-open"); }
    });
  }

  // Contact details and prices come from js/config.js
  const cfg = window.TRAILSIDE;
  if (cfg) {
    document.querySelectorAll("[data-contact]").forEach((el) => {
      const k = el.dataset.contact;
      if (k === "email") { el.textContent = cfg.contact.email; if (el.tagName === "A") el.href = "mailto:" + cfg.contact.email; }
      if (k === "phone") { el.textContent = cfg.contact.phone; if (el.tagName === "A") el.href = cfg.contact.phoneHref; }
      if (k === "location") el.textContent = cfg.contact.location;
    });
    document.querySelectorAll("[data-price]").forEach((el) => {
      const it = cfg.items.find((i) => i.id === el.dataset.price);
      if (it) el.textContent = "$" + it.price;
    });
  }
  document.querySelectorAll("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));
})();
