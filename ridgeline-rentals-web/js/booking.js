/* ==========================================================================
   Trailside Rentals — booking flow (demo, Apple-style screens)
   Screens: 0 dates · 1 gear · 2 climbers · 3 video + agreement · 4 review/pay · 5 done
   Spec: design/booking-apple/BOOKING-STYLE.md
   Availability is simulated (see demoBooked). Payment is not connected.
   When the backend exists, replace:
     - demoBooked()          -> GET /api/availability
     - confirmBooking()      -> POST /api/bookings (after Stripe confirms payment)
     - signature records     -> POST /api/agreements
   ========================================================================== */
(function () {
  "use strict";
  const cfg = window.TRAILSIDE;
  const AG = window.TrailsideAgreement;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const money = (n) => "$" + (Math.round(n * 100) / 100).toLocaleString("en-US", { minimumFractionDigits: n % 1 ? 2 : 0 });
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- dates ---------- */
  const pad = (n) => String(n).padStart(2, "0");
  const key = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parse = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const fmt = (d, o) => d.toLocaleDateString("en-US", o || { weekday: "short", month: "short", day: "numeric" });
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const seasonStart = parse(cfg.seasonStart);
  const seasonEnd = parse(cfg.seasonEnd);
  const firstDay = today > seasonStart ? today : seasonStart;

  /* ---------- availability (demo) ---------- */
  function seeded(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return ((h >>> 0) % 10000) / 10000;
  }
  function demoBooked(dayKey, item) {
    if (!cfg.demoBookings) return 0;
    const d = parse(dayKey), dow = d.getDay();
    const weekend = dow === 5 || dow === 6 || dow === 0;
    const r = seeded(dayKey + item.id);
    if (dow === 6 && seeded(dayKey) > 0.86) return item.stock;
    const load = weekend ? 0.35 + r * 0.6 : r * 0.45;
    return Math.min(item.stock, Math.floor(item.stock * load));
  }
  function dayStatus(dayKey) {
    const d = parse(dayKey);
    if (d < firstDay || d > seasonEnd) return { state: "off" };
    if (cfg.closures[dayKey]) return { state: "closed", reason: cfg.closures[dayKey] };
    const left = {};
    cfg.items.forEach((it) => (left[it.id] = it.stock - demoBooked(dayKey, it)));
    if (left.kit <= 0 && left.lanyard <= 0) return { state: "soldout", left };
    return { state: "open", left };
  }
  function rangeKeys() {
    if (!state.start) return [];
    return Array.from({ length: state.days }, (_, i) => key(addDays(parse(state.start), i)));
  }
  function rangeLeft(itemId) {
    const ks = rangeKeys();
    if (!ks.length) return 0;
    return Math.min(...ks.map((k) => { const s = dayStatus(k); return s.left ? s.left[itemId] : 0; }));
  }

  /* ---------- state ---------- */
  const state = {
    step: 0,
    view: new Date(firstDay.getFullYear(), firstDay.getMonth(), 1),
    start: null,
    days: 1,
    qty: { kit: 1, lanyard: 0, helmet: 0, harness: 0 },
    protection: "deposit",
    lead: { name: "", email: "", phone: "" },
    climbers: [],
    videoDone: false,
    signatures: {},
    signerIdx: null,
    ref: null,
  };
  const NAMES = ["Dates", "Gear", "Climbers", "Agreement", "Review", "Done"];
  const PROGRESS = 5; // screens 0–4 show progress

  /* ---------- calendar ---------- */
  function renderCalendar() {
    const y = state.view.getFullYear(), m = state.view.getMonth();
    $("#cal-month").textContent = state.view.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    $("#cal-prev").disabled = new Date(y, m, 1) <= new Date(firstDay.getFullYear(), firstDay.getMonth(), 1);
    $("#cal-next").disabled = new Date(y, m + 1, 1) > seasonEnd;
    const sel = rangeKeys();
    let html = ["S", "M", "T", "W", "T", "F", "S"].map((d) => `<div class="dow" aria-hidden="true">${d}</div>`).join("");
    const lead = new Date(y, m, 1).getDay();
    for (let i = 0; i < lead; i++) html += `<span class="d blank" aria-hidden="true"></span>`;
    const n = new Date(y, m + 1, 0).getDate();
    for (let d = 1; d <= n; d++) {
      const k = key(new Date(y, m, d));
      const s = dayStatus(k);
      const cls = ["d"]; let dis = false;
      let label = fmt(parse(k), { weekday: "long", month: "long", day: "numeric" });
      if (s.state === "off") { dis = true; label += ", not available"; }
      else if (s.state === "closed") { cls.push("closed"); dis = true; label += ", closed: " + s.reason; }
      else if (s.state === "soldout") { dis = true; label += ", sold out"; }
      else {
        if (s.left.kit <= cfg.lowStockAt) cls.push("low");
        label += `, ${s.left.kit} full kits left`;
      }
      if (k === sel[0]) cls.push("sel"); else if (sel.includes(k)) cls.push("in");
      html += `<button type="button" class="${cls.join(" ")}" data-day="${k}" ${dis ? "disabled" : ""} aria-label="${esc(label)}" aria-pressed="${sel.includes(k)}"><span class="n">${d}</span><span class="dot"></span></button>`;
    }
    $("#cal").innerHTML = html;
  }
  function nextDayOk(startKey) {
    const s = dayStatus(key(addDays(parse(startKey), 1)));
    return s.state === "open" ? true : s.state === "closed" ? "The next day is closed" : s.state === "soldout" ? "The next day is sold out" : "The next day is outside the season";
  }
  function renderLength() {
    const ok = state.start ? nextDayOk(state.start) : true;
    $$("#len button").forEach((b) => {
      const d = Number(b.dataset.days);
      b.setAttribute("aria-pressed", String(d === state.days));
      b.disabled = !state.start || (d === 2 && ok !== true);
    });
    const ks = rangeKeys();
    let note = "Pick a date first.";
    if (ks.length) {
      const range = ks.length === 1 ? fmt(parse(ks[0]), { weekday: "short", month: "short", day: "numeric" }) : `${fmt(parse(ks[0]))} to ${fmt(parse(ks[1]))}`;
      note = ok !== true ? `${range}. ${ok}, so this is a 1-day rental.` : `${range}. Return within ${state.days * 24} hours of pickup.`;
    }
    $("#len-note").textContent = note;
  }

  /* ---------- gear ---------- */
  function clampQty() { cfg.items.forEach((it) => { state.qty[it.id] = Math.max(0, Math.min(state.qty[it.id], rangeLeft(it.id))); }); }
  function renderItems() {
    $("#items").innerHTML = cfg.items.map((it) => {
      const left = state.start ? rangeLeft(it.id) : 0;
      const q = state.qty[it.id];
      const sub = `${money(cfg.priceFor(it, state.days))} for ${state.days} day${state.days > 1 ? "s" : ""}${left <= cfg.lowStockAt ? ` · ${left ? left + " left" : "none left"}` : ""}`;
      return `<div class="cell"><img class="thumb" src="${it.img}" alt=""><div class="lbl"><b>${it.name}</b><small>${sub}</small></div>
        <span class="stepper" role="group" aria-label="${it.name} quantity"><button type="button" data-dec="${it.id}" aria-label="Remove one ${it.name}" ${q <= 0 ? "disabled" : ""}>−</button><i></i><button type="button" data-inc="${it.id}" aria-label="Add one ${it.name}" ${q >= left ? "disabled" : ""}>+</button></span><span class="qty ${q ? "" : "zero"}" aria-live="polite">${q}</span></div>`;
    }).join("");
  }

  /* ---------- pricing ---------- */
  const itemById = (id) => cfg.items.find((i) => i.id === id);
  const climberCount = () => state.qty.kit + state.qty.lanyard;
  function pricing() {
    const lines = [];
    let total = 0, hold = 0;
    cfg.items.forEach((it) => {
      const q = state.qty[it.id];
      if (!q) return;
      const amt = q * cfg.priceFor(it, state.days);
      total += amt;
      lines.push([`${q} × ${it.name}, ${state.days} day${state.days > 1 ? "s" : ""}`, amt]);
    });
    const prot = state.qty.kit * itemById("kit").protection + state.qty.lanyard * itemById("lanyard").protection;
    const dep = state.qty.kit * itemById("kit").deposit + state.qty.lanyard * itemById("lanyard").deposit;
    if (state.protection === "protection" && prot) { lines.push(["Gear Protection", prot]); total += prot; }
    else hold = dep;
    return { lines, total, hold, prot, dep };
  }
  const datesShort = () => { const ks = rangeKeys(); const s = (k) => fmt(parse(k), { month: "short", day: "numeric" }); return !ks.length ? "" : ks.length === 1 ? s(ks[0]) : `${s(ks[0])}–${parse(ks[1]).getDate()}`; };
  const datesLong = () => { const ks = rangeKeys(); const o = { weekday: "short", month: "short", day: "numeric" }; return !ks.length ? "" : ks.length === 1 ? fmt(parse(ks[0]), o) : `${fmt(parse(ks[0]), o)} – ${fmt(parse(ks[1]), o)}`; };
  function renderBar() {
    const p = pricing();
    $("#prot-amt").textContent = p.prot ? money(p.prot) : "";
    $("#hold-amt").textContent = p.dep ? money(p.dep) + " hold" : "";
    const main = $("#bar-main"), sub = $("#bar-sub"), btn = $("#a-next");
    btn.textContent = "Continue";
    if (state.step === 0) {
      if (!state.start) { main.textContent = "Pick a date"; sub.textContent = "1 or 2 day rentals"; }
      else { main.textContent = datesShort(); sub.textContent = `${rangeLeft("kit")} kits left`; }
    } else if (state.step === 3) {
      const list = signers(); const n = list.filter((s) => state.signatures[sigKey(s)]).length;
      main.textContent = `${n} of ${list.length} signed`; sub.textContent = state.videoDone ? "Video watched" : "Video not finished";
    } else {
      main.textContent = money(p.total);
      sub.textContent = `${climberCount()} climber${climberCount() === 1 ? "" : "s"} · ${state.days} day${state.days > 1 ? "s" : ""}`;
    }
  }

  /* ---------- climbers ---------- */
  function syncClimbers() {
    const n = climberCount();
    while (state.climbers.length < n) state.climbers.push({ name: "", age: "adult", guardian: 0, weightOk: false });
    state.climbers.length = n;
    if (state.climbers[0]) state.climbers[0].name = state.lead.name;
  }
  function renderClimbers() {
    syncClimbers();
    const adults = state.climbers.map((c, i) => ({ c, i })).filter(({ c }) => c.age === "adult");
    $("#climbers").innerHTML = state.climbers.map((c, i) => {
      const lead = i === 0;
      return `<p class="g-label">Climber ${i + 1}${lead ? " (you)" : ""}</p>
      <div class="g" data-i="${i}">
        ${lead ? `<div class="cell"><div class="lbl"><b id="c-name-0">${esc(c.name) || "Your name"}</b><small>18 or older</small></div></div>`
               : `<div class="f-cell"><label for="c-name-${i}">Full legal name</label><input id="c-name-${i}" data-f="name" value="${esc(c.name)}" placeholder="First and last name" autocomplete="off"><span class="err"></span></div>
                  <div class="cell"><div class="seg" role="group" aria-label="Climber ${i + 1} age"><button type="button" data-age="adult" aria-pressed="${c.age === "adult"}">18 or older</button><button type="button" data-age="minor" aria-pressed="${c.age === "minor"}">14 to 17</button></div></div>`}
        ${c.age === "minor" ? `<div class="f-cell"><label for="c-guard-${i}">Parent or guardian on the route</label><select id="c-guard-${i}" data-f="guardian">${adults.map(({ c: a, i: ai }) => `<option value="${ai}" ${Number(c.guardian) === ai ? "selected" : ""}>${esc(a.name || "Climber " + (ai + 1))}</option>`).join("")}</select></div>` : ""}
        <label class="cell tap"><span class="lbl">90–265 lbs, 62" reach</span><input class="sw" type="checkbox" role="switch" data-f="weightOk" ${c.weightOk ? "checked" : ""} aria-label="Climber ${i + 1} meets weight and reach"></label>
      </div>`;
    }).join("") + `<p class="g-foot">A parent or guardian signs the agreement for climbers aged 14 to 17 and must climb with them.</p>`;
  }
  function refreshGuardianLabels() {
    $$("#climbers select[data-f=guardian] option").forEach((o) => { const a = state.climbers[Number(o.value)]; if (a) o.textContent = a.name || "Climber " + (Number(o.value) + 1); });
  }

  /* ---------- signing ---------- */
  function signers() {
    return state.climbers.map((c, i) => ({ c, i })).filter(({ c }) => c.age === "adult").map(({ c, i }) => ({
      i, name: c.name, minors: state.climbers.filter((m) => m.age === "minor" && Number(m.guardian) === i).map((m) => m.name),
    }));
  }
  function sigKey(s) { return `${s.i}|${s.name.trim().toLowerCase()}|${s.minors.join(",")}`; }
  function pruneSignatures() { const valid = new Set(signers().map(sigKey)); Object.keys(state.signatures).forEach((k) => { if (!valid.has(k)) delete state.signatures[k]; }); }
  const returnDeadline = () => `${state.days * 24} hours from the time gear is taken from the locker (${state.days}-day rental)`;
  function fillFor(s) {
    return {
      renterName: s.name,
      contact: s.i === 0 ? `${state.lead.phone} / ${state.lead.email}` : `Booked by ${state.lead.name} (${state.lead.email})`,
      rentalDates: rangeKeys().map((k) => fmt(parse(k), { weekday: "long", month: "long", day: "numeric", year: "numeric" })).join(" and "),
      returnDeadline: returnDeadline(), gear: { ...state.qty }, protection: state.protection,
    };
  }
  function renderSigners() {
    pruneSignatures();
    const list = signers();
    if (state.signerIdx == null || !list.some((s) => s.i === state.signerIdx)) {
      const open = list.find((s) => !state.signatures[sigKey(s)]);
      state.signerIdx = (open || list[0]).i;
    }
    const done = list.filter((s) => state.signatures[sigKey(s)]).length;
    $("#sign-hint").textContent = list.length > 1 ? `${done} of ${list.length} adults signed. Each adult signs here or on their own phone.` : (done ? "Signed." : "Sign the rental agreement.");
    $("#signers").innerHTML = list.length > 1 ? list.map((s) => `<button type="button" class="signer" data-signer="${s.i}" aria-current="${s.i === state.signerIdx}">${esc(s.name.split(" ")[0])}${state.signatures[sigKey(s)] ? ' <span class="tick" aria-label="signed">✓</span>' : ""}</button>`).join("") : "";
    renderSignArea();
    renderBar();
  }
  function renderSignArea() {
    const s = signers().find((x) => x.i === state.signerIdx);
    const rec = state.signatures[sigKey(s)];
    const area = $("#sign-area");
    if (rec) {
      area.innerHTML = `<div class="signed-card"><b>${esc(s.name)} signed <span class="ok-text">✓</span></b><img src="${rec.signature}" alt="Signature of ${esc(s.name)}"><span class="g-foot" style="padding:0">${new Date(rec.signedAt).toLocaleString("en-US")} · version ${rec.agreementVersion}</span><button type="button" class="sig-tools" style="border:0;background:none;padding:0;justify-content:flex-start" id="resign"><span style="color:var(--a-accent)">Clear and sign again</span></button></div>`;
      $("#resign").onclick = () => { delete state.signatures[sigKey(s)]; renderSigners(); };
      return;
    }
    const minorAck = s.minors.length ? [`I am the parent or legal guardian of ${s.minors.join(" and ")}, I have authority to sign for them, and I will be on the course with them at all times.`] : [];
    const acks = AG.ACKS.concat(minorAck);
    area.innerHTML = `
      <p class="g-label">${esc(s.name)}${s.minors.length ? `, signing for ${esc(s.minors.join(", "))}` : ""}</p>
      <div class="doc-card" id="doc-scroll" tabindex="0" aria-label="Rental agreement text">${AG.render(fillFor(s))}</div>
      <p class="read-state" id="read-state"><svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 2v10M3 8l4 4 4-4"/></svg><span>Scroll to the end to continue</span></p>
      <fieldset id="sign-fields" disabled style="border:0;padding:0;margin:0;min-width:0">
        <p class="g-label">Confirm each statement <span id="ack-count"></span></p>
        <div class="g">${acks.map((a, n) => `<label class="cell tap legal"><span class="lbl">${esc(a)}</span><input class="sw" type="checkbox" role="switch" data-ack="${n}"></label>`).join("")}</div>
        <p class="g-label">Signature</p>
        <div class="g"><div class="f-cell"><label for="typed-name">Type your full legal name</label><input id="typed-name" autocomplete="off" placeholder="${esc(s.name)}"><span class="err" id="typed-err"></span></div></div>
        <div class="sigbox" id="sig-pad" style="margin-top:10px"><canvas id="sig-canvas" aria-label="Signature"></canvas><span class="ph" id="sig-ph">Your signature appears when you type your name</span></div>
        <div class="sig-tools"><span id="sig-mode-note">Generated from your typed name · ${fmt(today, { month: "short", day: "numeric", year: "numeric" })}</span><button type="button" id="sig-mode">Draw instead</button></div>
        <div class="g" style="margin-top:14px"><label class="cell tap legal"><span class="lbl">${esc(AG.CONSENT)}</span><input class="sw" type="checkbox" role="switch" id="consent"></label></div>
        <button type="button" class="a-btn block" id="sign-btn" disabled>Sign</button>
      </fieldset>`;
    const sc = $("#doc-scroll");
    const pad = { hasInk: false, mode: "type", ctx: null };
    const norm = (v) => v.trim().toLowerCase().replace(/\s+/g, " ");
    const nameOk = () => { const t = norm($("#typed-name").value); return !!t && t === norm(s.name); };
    const unlock = () => {
      if (sc.scrollTop + sc.clientHeight >= sc.scrollHeight - 24) {
        $("#sign-fields").disabled = false;
        const st = $("#read-state"); st.classList.add("done");
        st.innerHTML = `<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2"><path d="m2 7.5 3 3 7-7"/></svg><span>Read to the end</span>`;
        sc.removeEventListener("scroll", unlock);
        setupPad();
      }
    };
    sc.addEventListener("scroll", unlock, { passive: true });
    const check = () => {
      const boxes = $$("[data-ack]", area);
      const n = boxes.filter((b) => b.checked).length;
      $("#ack-count").textContent = `· ${n} of ${boxes.length}`;
      const typed = norm($("#typed-name").value);
      $("#typed-err").textContent = typed && !nameOk() ? "Type your name exactly as it appears above." : "";
      $("#sign-btn").disabled = !(n === boxes.length && nameOk() && pad.hasInk && $("#consent").checked);
    };
    function clearPad() { const cv = $("#sig-canvas"); if (pad.ctx) pad.ctx.clearRect(0, 0, cv.width, cv.height); pad.hasInk = false; $("#sig-pad").classList.remove("inked"); }
    function drawTyped() {
      if (pad.mode !== "type" || !pad.ctx) return;
      clearPad();
      if (!nameOk()) return;
      const cv = $("#sig-canvas"), w = cv.clientWidth, h = cv.clientHeight, ctx = pad.ctx;
      const text = $("#typed-name").value.trim().replace(/\s+/g, " ");
      let size = Math.min(40, h * 0.32);
      ctx.font = `${size}px "Homemade Apple", cursive`;
      while (ctx.measureText(text).width > w - 40 && size > 14) { size -= 2; ctx.font = `${size}px "Homemade Apple", cursive`; }
      ctx.fillStyle = "#13284a";
      ctx.fillText(text, 20, h * 0.62);
      pad.hasInk = true; $("#sig-pad").classList.add("inked");
    }
    area.oninput = (e) => { if (e.target.id === "typed-name") drawTyped(); check(); };
    area.onchange = check;
    check();
    $("#sign-btn").onclick = async () => {
      state.signatures[sigKey(s)] = {
        signer: s.name, minors: s.minors, email: s.i === 0 ? state.lead.email : null,
        acknowledgments: acks, consent: AG.CONSENT, typedName: $("#typed-name").value.trim(),
        signatureMethod: pad.mode === "type" ? "adopted typed signature" : "hand drawn",
        signature: $("#sig-canvas").toDataURL("image/png"),
        signedAt: new Date().toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        videoWatched: state.videoDone, agreementVersion: AG.VERSION, agreementSha256: await AG.hash(sc.innerText), agreementHtml: AG.render(fillFor(s)),
        userAgent: navigator.userAgent,
      };
      state.signerIdx = null;
      clearError();
      renderSigners();
      $("#sign-hint").scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    };
    function setupPad() {
      const wrap = $("#sig-pad"), cv = $("#sig-canvas");
      const ratio = window.devicePixelRatio || 1;
      cv.width = wrap.clientWidth * ratio; cv.height = wrap.clientHeight * ratio;
      const ctx = cv.getContext("2d");
      ctx.scale(ratio, ratio); ctx.lineWidth = 2.2; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = "#13284a";
      pad.ctx = ctx;
      let drawing = false, last = null;
      const pos = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
      cv.onpointerdown = (e) => { if (pad.mode !== "draw") return; drawing = true; last = pos(e); cv.setPointerCapture(e.pointerId); };
      cv.onpointermove = (e) => {
        if (!drawing) return;
        const p = pos(e); ctx.beginPath(); ctx.moveTo(last[0], last[1]); ctx.lineTo(p[0], p[1]); ctx.stroke(); last = p;
        if (!pad.hasInk) { pad.hasInk = true; wrap.classList.add("inked"); check(); }
      };
      cv.onpointerup = cv.onpointercancel = () => { drawing = false; };
      $("#sig-mode").onclick = () => {
        pad.mode = pad.mode === "type" ? "draw" : "type";
        $("#sig-mode").textContent = pad.mode === "type" ? "Draw instead" : "Use my typed name";
        $("#sig-mode-note").textContent = pad.mode === "type" ? "Generated from your typed name" : "Sign with your finger or mouse";
        $("#sig-ph").textContent = pad.mode === "type" ? "Your signature appears when you type your name" : "Sign here";
        cv.style.cursor = pad.mode === "draw" ? "crosshair" : "default";
        clearPad(); drawTyped(); check();
      };
      if (document.fonts && document.fonts.load) document.fonts.load('40px "Homemade Apple"').then(() => { drawTyped(); check(); }).catch(() => {});
      drawTyped();
    }
    requestAnimationFrame(unlock);
  }

  /* ---------- safety video ---------- */
  function setupVideo() {
    const v = $("#safety-video");
    v.poster = cfg.safetyVideo.poster;
    v.innerHTML = `<source src="${cfg.safetyVideo.webm}" type="video/webm"><source src="${cfg.safetyVideo.src}" type="video/mp4">`;
    v.load();
    const bar = $("#video-bar"), status = $("#video-status"), text = $("#video-status-text");
    v.addEventListener("timeupdate", () => {
      if (state.videoDone || !v.duration) return;
      const pct = Math.min(100, (v.currentTime / v.duration) * 100);
      bar.style.width = pct + "%";
      text.textContent = `${Math.round(pct)}% watched`;
    });
    v.addEventListener("ended", () => {
      state.videoDone = true;
      bar.style.width = "100%";
      text.textContent = "Watched to the end";
      status.classList.add("done");
      $("#sign-card").classList.remove("is-locked");
      clearError(); renderBar();
    });
  }

  /* ---------- review ---------- */
  function renderReview() {
    const p = pricing();
    const list = signers();
    $("#rv-dates").textContent = datesLong();
    $("#rv-gear").textContent = `${cfg.items.filter((i) => state.qty[i.id]).map((i) => `${state.qty[i.id]} ${i.name.toLowerCase()}`).join(", ")} · ${climberCount()} climber${climberCount() === 1 ? "" : "s"}`;
    $("#review").innerHTML = p.lines.map(([l, a]) => `<div class="cell"><span class="lbl">${esc(l)}</span><span class="num">${money(a)}</span></div>`).join("") +
      `<div class="cell"><span class="lbl">Agreements</span><span class="ok-text">${list.filter((s) => state.signatures[sigKey(s)]).length} of ${list.length} signed</span></div>` +
      `<div class="cell"><span class="lbl">Safety video</span><span class="ok-text">Watched</span></div>` +
      `<div class="cell"><span class="lbl">Return</span><span class="val">Within ${state.days * 24} hours</span></div>`;
    $("#rv-total").textContent = money(p.total);
    $("#rv-hold").textContent = p.hold ? `Plus a refundable ${money(p.hold)} card hold, released when your gear is back.` : "";
  }

  /* ---------- confirm ---------- */
  async function confirmBooking() {
    state.ref = "TR-" + Math.random().toString(36).slice(2, 8).toUpperCase();
    const booking = { ref: state.ref, dates: rangeKeys(), days: state.days, qty: { ...state.qty } };
    const L = window.TrailsideLocker;
    const startDay = parse(rangeKeys()[0]);
    const validFrom = startDay;
    const validTo = new Date(addDays(startDay, state.days + 1).getTime() - 60000);
    const doors = await L.assignDoors(booking);
    const access = await L.createAccessCode(booking, doors, validFrom, validTo);
    state.pass = { ref: state.ref, doors, code: access.code, validFrom, validTo, days: state.days };
    const record = { ...booking, createdAt: new Date().toISOString(), protection: state.protection, total: pricing().total, lead: state.lead, climbers: state.climbers, doors, signatures: Object.values(state.signatures).map(({ agreementHtml, ...r }) => r) };
    try { const all = JSON.parse(localStorage.getItem("trailside_demo_bookings") || "[]"); all.push(record); localStorage.setItem("trailside_demo_bookings", JSON.stringify(all)); } catch (e) { /* storage unavailable */ }
    $("#pass").innerHTML = passHtml(state.pass);
  }
  const LOGO = '<svg viewBox="0 0 220 52" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 46 L24 31 L32 35 L48 19 L56 24 L72 9 L81 13"/><path d="M81 13 H111 M81 18 H111"/><path d="M111 13 L118 6 L132 20 L142 16 L160 30 L170 26 L189 40 L198 37 L217 46"/></svg>';
  function qrSvg(seedStr) {
    // Placeholder pattern only. The real pass will carry a scannable code from the locker system.
    let seed = 0; for (const ch of seedStr) seed = (seed * 31 + ch.charCodeAt(0)) % 233280;
    const r = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
    const finder = (x, y) => `<rect x="${x}" y="${y}" width="7" height="7"/><rect x="${x + 1}" y="${y + 1}" width="5" height="5" fill="#fff"/><rect x="${x + 2}" y="${y + 2}" width="3" height="3"/>`;
    let s = '<svg viewBox="0 0 25 25" width="100%" height="100%" shape-rendering="crispEdges" aria-hidden="true"><g fill="#000">';
    for (let y = 0; y < 25; y++) for (let x = 0; x < 25; x++) {
      const inF = (x < 8 && y < 8) || (x > 16 && y < 8) || (x < 8 && y > 16);
      if (!inF && r() > 0.52) s += `<rect x="${x}" y="${y}" width="1" height="1"/>`;
    }
    return s + finder(0, 0) + finder(18, 0) + finder(0, 18) + "</g></svg>";
  }
  function passHtml(p) {
    const d = (x) => x.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    return `<div class="top"><b>${LOGO}Trailside</b><span>${esc(p.ref)}</span></div>
      <span class="lab" style="margin-top:18px">Locker code</span>
      <p class="code">${esc(p.code.slice(0, 3))} ${esc(p.code.slice(3))}</p>
      <div class="grid"><div><span class="lab">Pickup</span><b>${d(p.validFrom)}</b></div><div><span class="lab">Return within</span><b>${p.days * 24} hours</b></div><div><span class="lab">Doors</span><b>${p.doors.map((x) => x.unit + x.door).join(" · ")}</b></div></div>
      <div class="qr">${qrSvg(p.code)}</div>
      <p class="note">Ashley Gorge trailhead lockers · works with no signal</p>`;
  }
  function download(name, html) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  function downloadPass() {
    const css = "body{margin:0;background:#F3F3F1;font-family:-apple-system,system-ui,sans-serif;padding:24px}.wpass{max-width:380px;margin:0 auto;border-radius:20px;background:linear-gradient(180deg,#1C2B36,#121A20);color:#fff;padding:18px 20px 22px}.top{display:flex;justify-content:space-between;align-items:center;font-size:14px}.top b{display:inline-flex;gap:8px;align-items:center}.top svg{width:30px;height:12px}.lab{display:block;font-size:11px;color:rgba(255,255,255,.6)}.code{font-size:40px;font-weight:600;letter-spacing:.06em;margin:2px 0 0}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:14px}.grid b{display:block;font-size:15px}.qr{margin:18px auto 0;width:136px;height:136px;background:#fff;border-radius:10px;padding:10px}.note{font-size:12px;opacity:.7;text-align:center}";
    download(`Trailside-pass-${state.pass.ref}.html`, `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Trailside pass ${state.pass.ref}</title><style>${css}</style><div class="wpass">${passHtml(state.pass)}</div>`);
  }
  function downloadSigned() {
    const docs = Object.values(state.signatures).map((r) => `<section style="page-break-after:always">${r.agreementHtml}
      <h3>Signature</h3><p>Typed name: <strong>${esc(r.typedName)}</strong> (${esc(r.signatureMethod)})${r.minors.length ? `<br>Signing for minors: ${esc(r.minors.join(", "))}` : ""}</p>
      <img src="${r.signature}" style="max-width:360px;border-bottom:1px solid #000"><p>Signed ${esc(r.signedAt)} (${esc(r.timeZone)})<br>Agreement version ${esc(r.agreementVersion)} · SHA-256 ${esc(r.agreementSha256)}<br>Safety video watched: ${r.videoWatched ? "yes" : "no"}</p>
      <h3>Statements confirmed</h3><ul>${r.acknowledgments.map((a) => `<li>${esc(a)}</li>`).join("")}</ul><p><em>${esc(r.consent)}</em></p></section>`).join("");
    download(`Trailside-signed-agreements-${state.ref}.html`, `<!doctype html><meta charset="utf-8"><title>Trailside Rentals signed agreements ${state.ref}</title><style>body{font-family:'Times New Roman',Times,serif;max-width:800px;margin:40px auto;padding:0 20px;line-height:1.5}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:6px;text-align:left}</style><h1>Booking ${state.ref}</h1>${docs}`);
  }

  /* ---------- validation ---------- */
  function setErr(input, msg) {
    const f = input && input.closest(".f-cell");
    if (f) { f.classList.toggle("has-error", !!msg); const e = $(".err", f); if (e) e.textContent = msg || ""; }
    return !msg;
  }
  function validate(step) {
    if (step === 0) return state.start ? "" : "Pick a day on the calendar.";
    if (step === 1) return climberCount() >= 1 ? "" : "Add at least one full kit or lanyard. Each climber needs one.";
    if (step === 2) {
      let ok = true;
      ok = setErr($("#lead-name"), state.lead.name.trim().split(/\s+/).length < 2 ? "Enter your first and last name." : "") && ok;
      ok = setErr($("#lead-email"), /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.lead.email) ? "" : "Enter a valid email.") && ok;
      ok = setErr($("#lead-phone"), state.lead.phone.replace(/\D/g, "").length >= 10 ? "" : "Enter a 10-digit phone number.") && ok;
      state.climbers.forEach((c, i) => { if (i) ok = setErr($(`#c-name-${i}`), c.name.trim().split(/\s+/).length < 2 ? "Enter first and last name." : "") && ok; });
      if (!ok) return "Check the highlighted fields.";
      if (state.climbers.some((c) => !c.weightOk)) return "Confirm weight and reach for every climber.";
      return "";
    }
    if (step === 3) {
      if (!state.videoDone) return "Watch the safety video to the end.";
      const left = signers().filter((s) => !state.signatures[sigKey(s)]);
      return left.length ? `Waiting on ${left.map((s) => s.name.split(" ")[0]).join(", ")} to sign.` : "";
    }
    return "";
  }
  function showError(msg) {
    const box = $(`.a-step[data-step="${state.step}"] .a-error`);
    if (!box) return;
    box.textContent = msg; box.hidden = false;
    box.classList.remove("shake"); void box.offsetWidth; box.classList.add("shake");
    box.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
  }
  function clearError() { $$(".a-error").forEach((b) => (b.hidden = true)); }

  /* ---------- navigation ---------- */
  function go(step, opts = {}) {
    const back = step < state.step;
    state.step = step;
    $$(".a-step").forEach((p) => { const on = Number(p.dataset.step) === step; p.classList.toggle("is-on", on); p.classList.toggle("is-back", on && back); });
    $("#a-steps").innerHTML = step < PROGRESS ? Array.from({ length: PROGRESS }, (_, i) => `<i class="${i <= step ? "on" : ""}"></i>`).join("") : "";
    $("#a-back-label").textContent = step === 0 || step === 5 ? "Home" : NAMES[step - 1];
    $("#a-title").textContent = step === 5 ? "Confirmed" : step === 3 ? "Agreement" : step === 4 ? "Review" : "Book";
    $("#a-bar").classList.toggle("hide", step >= 4);
    clearError();
    if (step === 0) { renderCalendar(); renderLength(); }
    if (step === 1) renderItems();
    if (step === 2) renderClimbers();
    if (step === 3) renderSigners();
    if (step === 4) renderReview();
    renderBar();
    if (!opts.initial) window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  }
  async function next() {
    const msg = validate(state.step);
    if (msg) { showError(msg); return; }
    go(state.step + 1);
  }

  /* ---------- events ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    $("#cal").addEventListener("click", (e) => {
      const b = e.target.closest("[data-day]"); if (!b || b.disabled) return;
      state.start = b.dataset.day;
      if (nextDayOk(state.start) !== true) state.days = 1;
      clampQty(); clearError(); renderCalendar(); renderLength(); renderBar();
    });
    $("#cal-prev").onclick = () => { state.view = new Date(state.view.getFullYear(), state.view.getMonth() - 1, 1); renderCalendar(); };
    $("#cal-next").onclick = () => { state.view = new Date(state.view.getFullYear(), state.view.getMonth() + 1, 1); renderCalendar(); };
    $("#len").addEventListener("click", (e) => { const b = e.target.closest("[data-days]"); if (b && !b.disabled) { state.days = Number(b.dataset.days); clampQty(); renderCalendar(); renderLength(); renderBar(); } });
    $("#items").addEventListener("click", (e) => {
      const inc = e.target.closest("[data-inc]"), dec = e.target.closest("[data-dec]");
      if (inc) state.qty[inc.dataset.inc]++;
      if (dec) state.qty[dec.dataset.dec]--;
      if (inc || dec) { clampQty(); renderItems(); renderBar(); clearError(); }
    });
    $("#protection").addEventListener("change", (e) => { state.protection = e.target.value; renderBar(); });
    ["name", "email", "phone"].forEach((f) => $(`#lead-${f}`).addEventListener("input", (e) => {
      state.lead[f] = e.target.value;
      if (f === "name" && state.climbers[0]) { state.climbers[0].name = e.target.value; const c0 = $("#c-name-0"); if (c0) c0.textContent = e.target.value || "Your name"; refreshGuardianLabels(); }
    }));
    $("#climbers").addEventListener("input", (e) => {
      const g = e.target.closest("[data-i]"); if (!g) return;
      const c = state.climbers[Number(g.dataset.i)];
      if (e.target.dataset.f === "name") { c.name = e.target.value; refreshGuardianLabels(); }
    });
    $("#climbers").addEventListener("change", (e) => {
      const g = e.target.closest("[data-i]"); if (!g) return;
      const c = state.climbers[Number(g.dataset.i)], f = e.target.dataset.f;
      if (f === "guardian") c.guardian = Number(e.target.value);
      if (f === "weightOk") c.weightOk = e.target.checked;
    });
    $("#climbers").addEventListener("click", (e) => {
      const b = e.target.closest("[data-age]"); if (!b) return;
      const c = state.climbers[Number(b.closest("[data-i]").dataset.i)];
      c.age = b.dataset.age; c.guardian = 0; renderClimbers();
    });
    $("#signers").addEventListener("click", (e) => { const b = e.target.closest("[data-signer]"); if (b) { state.signerIdx = Number(b.dataset.signer); renderSigners(); } });
    $("#a-next").addEventListener("click", next);
    $("#a-back").addEventListener("click", () => { if (state.step === 0 || state.step === 5) location.href = "index.html"; else go(state.step - 1); });
    $$("[data-pay]").forEach((b) => b.addEventListener("click", async () => { await confirmBooking(); go(5); }));
    $("#dl-signed").addEventListener("click", downloadSigned);
    $("#dl-pass").addEventListener("click", downloadPass);
    setupVideo();
    go(0, { initial: true });
  });
})();
