/* Trailside Rentals — inner pages (rates, agreement): prices, menu, nav state. */
(function () {
  "use strict";
  const cfg = window.TRAILSIDE;
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const money = (n) => "$" + n;
  if (cfg) {
    const item = (id) => cfg.items.find((i) => i.id === id);
    $$("[data-price]").forEach((el) => { const [id, d] = el.dataset.price.split(":"); const it = item(id); if (it) el.textContent = money(cfg.priceFor(it, Number(d))); });
    $$("[data-dep]").forEach((el) => { const it = item(el.dataset.dep); if (it) el.textContent = money(it.deposit); });
    $$("[data-prot]").forEach((el) => { const it = item(el.dataset.prot); if (it) el.textContent = money(it.protection); });
  }
  $$("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));
  const nav = document.getElementById("h-nav"), btn = document.querySelector(".h-menu-btn"), menu = document.getElementById("h-menu");
  btn.addEventListener("click", () => { const o = btn.getAttribute("aria-expanded") !== "true"; btn.setAttribute("aria-expanded", String(o)); menu.hidden = !o; });
  const onScroll = () => nav.classList.toggle("is-scrolled", scrollY > 8);
  addEventListener("scroll", onScroll, { passive: true }); onScroll();
})();
