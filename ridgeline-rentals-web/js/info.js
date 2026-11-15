/* Trailside Rentals — "Everything you need to know": live forecast, FAQ, jump-nav highlight. */
(function () {
  "use strict";
  const $ = (s) => document.querySelector(s), $$ = (s) => Array.from(document.querySelectorAll(s));

  /* ---------- 4-day forecast for the gorge (Open-Meteo, no key) ---------- */
  const WX = {
    0: ["Clear", "sun"], 1: ["Mostly clear", "sun"], 2: ["Partly cloudy", "part"], 3: ["Cloudy", "cloud"],
    45: ["Fog", "cloud"], 48: ["Fog", "cloud"], 51: ["Drizzle", "rain"], 53: ["Drizzle", "rain"], 55: ["Drizzle", "rain"],
    61: ["Rain", "rain"], 63: ["Rain", "rain"], 65: ["Heavy rain", "rain"], 66: ["Freezing rain", "rain"], 67: ["Freezing rain", "rain"],
    71: ["Snow", "snow"], 73: ["Snow", "snow"], 75: ["Heavy snow", "snow"], 77: ["Snow", "snow"], 80: ["Showers", "rain"], 81: ["Showers", "rain"],
    82: ["Heavy showers", "rain"], 85: ["Snow showers", "snow"], 86: ["Snow showers", "snow"], 95: ["Thunderstorms", "storm"], 96: ["Thunderstorms", "storm"], 99: ["Thunderstorms", "storm"],
  };
  const ICON = {
    sun: '<circle cx="12" cy="12" r="4.5"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/>',
    part: '<circle cx="9" cy="9" r="3.5"/><path d="M9 2v1.6M2 9h1.6M4 4l1.1 1.1M14 4l-1.1 1.1"/><path d="M8 19h9a3.5 3.5 0 0 0 0-7 5 5 0 0 0-9.4 1.6A2.8 2.8 0 0 0 8 19Z"/>',
    cloud: '<path d="M7 18.5h10a4 4 0 0 0 0-8 5.5 5.5 0 0 0-10.5 1.8A3.2 3.2 0 0 0 7 18.5Z"/>',
    rain: '<path d="M7 15h10a4 4 0 0 0 0-8 5.5 5.5 0 0 0-10.5 1.8A3.2 3.2 0 0 0 7 15Z"/><path d="M9 18l-1 2.5M13 18l-1 2.5M17 18l-1 2.5"/>',
    snow: '<path d="M7 15h10a4 4 0 0 0 0-8 5.5 5.5 0 0 0-10.5 1.8A3.2 3.2 0 0 0 7 15Z"/><path d="M9 19h.01M13 20.5h.01M17 19h.01"/>',
    storm: '<path d="M7 14h10a4 4 0 0 0 0-8 5.5 5.5 0 0 0-10.5 1.8A3.2 3.2 0 0 0 7 14Z"/><path d="m12.5 15-2 3.5h3l-2 3.5"/>',
  };
  const box = $("#wx");
  if (box) {
    const url = "https://api.open-meteo.com/v1/forecast?latitude=40.569&longitude=-109.615&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&temperature_unit=fahrenheit&timezone=America%2FDenver&forecast_days=4";
    const fail = () => { box.innerHTML = '<p class="wx__loading">The forecast didn\'t load. Use the National Weather Service link below.</p>'; };
    const ctrl = "AbortController" in window ? new AbortController() : null;
    const t = setTimeout(() => ctrl && ctrl.abort(), 8000);
    fetch(url, ctrl ? { signal: ctrl.signal } : {}).then((r) => (r.ok ? r.json() : Promise.reject())).then((d) => {
      clearTimeout(t);
      const D = d.daily; if (!D || !D.time) return fail();
      box.innerHTML = D.time.map((day, i) => {
        const [label, ic] = WX[D.weather_code[i]] || ["—", "cloud"];
        const date = new Date(day + "T12:00:00");
        const name = i === 0 ? "Today" : date.toLocaleDateString("en-US", { weekday: "short" });
        const rain = D.precipitation_probability_max ? D.precipitation_probability_max[i] : null;
        const warn = ic === "rain" || ic === "snow" || ic === "storm";
        return `<div class="wx__day${warn ? " is-warn" : ""}"><span class="wx__name">${name}</span><svg viewBox="0 0 24 24" aria-hidden="true">${ICON[ic]}</svg><span class="wx__label">${label}</span><span class="wx__t"><b>${Math.round(D.temperature_2m_max[i])}°</b> ${Math.round(D.temperature_2m_min[i])}°</span>${rain != null ? `<span class="wx__rain">${rain}% rain</span>` : ""}</div>`;
      }).join("");
    }).catch(fail);
  }

  /* ---------- FAQ: one open at a time, smooth height ---------- */
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  $$(".faq__item").forEach((d) => {
    const sum = d.querySelector("summary"), body = d.querySelector(".faq__a");
    sum.addEventListener("click", (e) => {
      if (reduce) return;
      e.preventDefault();
      if (d.open) {
        body.style.height = body.scrollHeight + "px";
        requestAnimationFrame(() => { body.style.height = "0px"; });
        body.addEventListener("transitionend", () => { d.open = false; body.style.height = ""; }, { once: true });
      } else {
        $$(".faq__item[open]").forEach((o) => { if (o !== d) { o.open = false; } });
        d.open = true;
        const h = body.scrollHeight; body.style.height = "0px";
        requestAnimationFrame(() => { body.style.height = h + "px"; });
        body.addEventListener("transitionend", () => { body.style.height = ""; }, { once: true });
      }
    });
  });

  /* ---------- jump nav: highlight the section in view ---------- */
  const links = $$(".i-jump a");
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    links.forEach((a) => {
      const on = a.getAttribute("href") === "#" + e.target.id;
      a.classList.toggle("is-on", on);
      if (on && a.parentElement.scrollWidth > a.parentElement.clientWidth) a.parentElement.scrollTo({ left: a.offsetLeft - 20, behavior: "smooth" });
    });
  }), { rootMargin: "-40% 0px -55% 0px" });
  $$(".i-sec[id]").forEach((s) => io.observe(s));
})();
