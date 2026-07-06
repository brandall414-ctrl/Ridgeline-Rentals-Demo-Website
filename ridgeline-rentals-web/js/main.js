/* ==========================================================================
   Ridgeline Rentals — main.js
   Loads JSON content and injects it into the DOM, then wires up interactions.
   No external libraries. Content lives in /content/*.json so copy can be
   edited without touching HTML.
   ========================================================================== */
(() => {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- tiny helpers ---------- */
  // Resolve a dot-path ("hero.headline", "site.contact.phone") against an object.
  function getPath(obj, path) {
    if (path === ".") return obj;
    return path.split(".").reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
  }

  async function loadJSON(url) {
    const res = await fetch(url, { cache: "no-cache" });
    if (!res.ok) throw new Error(`${url} -> ${res.status}`);
    return res.json();
  }

  /* ---------- content binding ---------- */
  // Text: [data-content-key] ; attributes: [data-content-href], [data-content-src]
  function applyBindings(data, scope = document) {
    scope.querySelectorAll("[data-content-key]").forEach((el) => {
      const v = getPath(data, el.dataset.contentKey);
      if (v != null && typeof v !== "object") el.textContent = v;
    });
    scope.querySelectorAll("[data-content-href]").forEach((el) => {
      const v = getPath(data, el.dataset.contentHref);
      if (v != null) el.setAttribute("href", v);
    });
    scope.querySelectorAll("[data-content-src]").forEach((el) => {
      const v = getPath(data, el.dataset.contentSrc);
      if (v != null) el.setAttribute("src", v);
    });
  }

  // Generic list renderer: clones <template data-tpl="NAME"> for each item.
  // Field mapping inside the template:
  //   [data-field="k"]       -> textContent (k may be "." for the item itself)
  //   [data-field-src="k"]   -> src attribute
  //   [data-field-href="k"]  -> href attribute
  function renderList(container, items, tplName) {
    const tpl = document.querySelector(`template[data-tpl="${tplName}"]`);
    if (!tpl || !Array.isArray(items)) return;
    const frag = document.createDocumentFragment();
    items.forEach((item, i) => {
      const node = tpl.content.firstElementChild.cloneNode(true);
      node.style.setProperty("--i", i);
      node.querySelectorAll("[data-field]").forEach((el) => {
        const v = getPath(item, el.dataset.field);
        if (v != null && typeof v !== "object") el.textContent = v;
      });
      node.querySelectorAll("[data-field-src]").forEach((el) => {
        const v = getPath(item, el.dataset.fieldSrc);
        if (v != null) el.setAttribute("src", v);
      });
      node.querySelectorAll("[data-field-href]").forEach((el) => {
        const v = getPath(item, el.dataset.fieldHref);
        if (v != null) el.setAttribute("href", v);
      });
      frag.appendChild(node);
    });
    container.replaceChildren(frag);
  }

  // Map of simple list names -> data path.
  const LIST_PATHS = {
    nav: "site.nav",
    steps: "howItWorks.steps",
    tips: "proTips.tips",
    trust: "trust.items",
    requirements: "requirements.items",
    protection: "protection.items",
  };

  function renderSimpleLists(data) {
    document.querySelectorAll("[data-list]").forEach((container) => {
      const name = container.dataset.list;
      const path = LIST_PATHS[name];
      if (!path) return;
      renderList(container, getPath(data, path), name);
    });
  }

  // Pricing cards need a nested price sub-list, so they get a dedicated renderer.
  function renderPricing(data) {
    const container = document.querySelector("[data-pricing]");
    const items = getPath(data, "pricing.items");
    if (!container || !Array.isArray(items)) return;
    const tpl = document.querySelector('template[data-tpl="price-card"]');
    if (!tpl) return;
    const frag = document.createDocumentFragment();
    items.forEach((item, i) => {
      const node = tpl.content.firstElementChild.cloneNode(true);
      node.style.setProperty("--i", i);
      const img = node.querySelector("img");
      if (img) { img.src = item.image; img.alt = item.name; }
      const name = node.querySelector("[data-field='name']");
      if (name) name.textContent = item.name;
      const desc = node.querySelector("[data-field='description']");
      if (desc) desc.textContent = item.description;
      const prices = node.querySelector("[data-prices]");
      if (prices && Array.isArray(item.prices)) {
        prices.replaceChildren();
        item.prices.forEach((p) => {
          const row = document.createElement("div");
          row.className = "price-row";
          if (item.prices.length > 1) {
            const label = document.createElement("span");
            label.className = "price-row__label";
            label.textContent = p.label;
            row.appendChild(label);
          }
          if (p.originalPrice) {
            const old = document.createElement("span");
            old.className = "price-old";
            old.textContent = p.originalPrice;
            row.appendChild(old);
          }
          const now = document.createElement("span");
          now.className = "price-now";
          now.textContent = p.price;
          row.appendChild(now);
          prices.appendChild(row);
        });
      }
      frag.appendChild(node);
    });
    container.replaceChildren(frag);
  }

  /* ---------- interactions ---------- */
  function setupHeader() {
    const header = document.querySelector("[data-header]");
    const hero = document.querySelector("[data-hero]");
    if (!header) return;
    const getTrigger = () => (hero ? hero.offsetHeight - 90 : 60);
    let ticking = false;
    const update = () => {
      header.classList.toggle("is-scrolled", window.scrollY > getTrigger());
      ticking = false;
    };
    update();
    window.addEventListener("scroll", () => {
      if (!ticking) { window.requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
    window.addEventListener("resize", update, { passive: true });
  }

  function setupNavToggle() {
    const toggle = document.querySelector(".nav-toggle");
    if (!toggle) return;
    const close = () => {
      document.body.classList.remove("nav-open");
      toggle.setAttribute("aria-expanded", "false");
    };
    toggle.addEventListener("click", () => {
      const open = document.body.classList.toggle("nav-open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    document.querySelectorAll("[data-mobile-nav] a").forEach((a) => a.addEventListener("click", close));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
    window.addEventListener("resize", () => { if (window.innerWidth >= 820) close(); });
  }

  function setupReveals() {
    const els = Array.from(document.querySelectorAll(".reveal"));
    // Stagger direct .reveal children inside any [data-stagger] container.
    document.querySelectorAll("[data-stagger]").forEach((group) => {
      Array.from(group.children)
        .filter((c) => c.classList.contains("reveal"))
        .forEach((c, i) => c.style.setProperty("--i", i));
    });
    if (reduceMotion || !("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("is-visible"));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    els.forEach((el) => io.observe(el));
  }

  /* ---------- boot ---------- */
  async function init() {
    const page = document.body.dataset.page; // "landing" | "rates"
    let data = {};
    try {
      const site = await loadJSON("content/site.json");
      data.site = site;
      if (page) {
        const pageData = await loadJSON(`content/${page}.json`);
        data = Object.assign({}, pageData, { site });
      }
      applyBindings(data);
      renderSimpleLists(data);
      renderPricing(data);
    } catch (err) {
      // Fail gracefully: leave the HTML fallback copy in place.
      console.warn("Ridgeline content load issue:", err.message);
    }
    // Interactions run regardless of content load success.
    setupHeader();
    setupNavToggle();
    setupReveals();

    // If the page was opened with a hash (e.g. index.html#contact), re-align to
    // it now that injected content has changed the layout above the target.
    if (location.hash && location.hash.length > 1) {
      try {
        const target = document.querySelector(location.hash);
        if (target) requestAnimationFrame(() => target.scrollIntoView());
      } catch (_) { /* invalid selector in hash — ignore */ }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
