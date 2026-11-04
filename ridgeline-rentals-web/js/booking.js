/* ==========================================================================
   Trailside Rentals — booking flow (demo)
   Steps: dates & gear -> climbers -> video & agreement -> review -> done.
   Availability is simulated (see demoBooked). Payment is not connected.
   When the backend exists, replace:
     - demoBooked()          -> GET /api/availability
     - confirmBooking()      -> POST /api/bookings (then Stripe Checkout)
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

  /* ---------- availability ---------- */
  function seeded(str) { // deterministic 0..1 from a string
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return ((h >>> 0) % 10000) / 10000;
  }
  function demoBooked(dayKey, item) {
    if (!cfg.demoBookings) return 0;
    const d = parse(dayKey), dow = d.getDay();
    const weekend = dow === 5 || dow === 6 || dow === 0;
    const r = seeded(dayKey + item.id);
    if (dow === 6 && seeded(dayKey) > 0.86) return item.stock; // some sold-out Saturdays
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
    signatures: {}, // keyed by climber index of the adult signer
    signerIdx: null,
    ref: null,
  };
  const STEPS = ["Dates & gear", "Climbers", "Video & agreement", "Review"];

  /* ---------- calendar ---------- */
  function renderCalendar() {
    const cal = $("#cal");
    const y = state.view.getFullYear(), m = state.view.getMonth();
    $("#cal-month").textContent = state.view.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    $("#cal-prev").disabled = new Date(y, m, 1) <= new Date(firstDay.getFullYear(), firstDay.getMonth(), 1);
    $("#cal-next").disabled = new Date(y, m + 1, 1) > seasonEnd;
    const sel = new Set(rangeKeys());
    let html = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => `<div class="dow" aria-hidden="true">${d.slice(0, 2)}</div>`).join("");
    const lead = new Date(y, m, 1).getDay();
    for (let i = 0; i < lead; i++) html += `<div class="day is-blank" aria-hidden="true"></div>`;
    const n = new Date(y, m + 1, 0).getDate();
    for (let d = 1; d <= n; d++) {
      const k = key(new Date(y, m, d));
      const s = dayStatus(k);
      const cls = ["day"]; let q = ""; let dis = false; let label = fmt(parse(k), { weekday: "long", month: "long", day: "numeric" });
      if (s.state === "off") { dis = true; label += ", not available"; }
      else if (s.state === "closed") { cls.push("is-closed"); dis = true; q = "Closed"; label += ", closed: " + s.reason; }
      else if (s.state === "soldout") { cls.push("is-soldout"); dis = true; q = "Full"; label += ", sold out"; }
      else {
        const left = s.left.kit;
        if (left <= cfg.lowStockAt) cls.push("is-low");
        q = left > 0 ? `<b>${left}</b><span class="long"> ${left <= cfg.lowStockAt ? "left" : "kits"}</span>` : `<span>Lanyards</span>`;
        label += `, ${left} full kits and ${s.left.lanyard} lanyards available`;
      }
      if (sel.has(k)) cls.push(k === state.start ? "is-start" : (k === rangeKeys().slice(-1)[0] ? "is-end" : "is-in"));
      html += `<button type="button" class="${cls.join(" ")}" data-day="${k}" ${dis ? "disabled" : ""} aria-label="${esc(label)}" aria-pressed="${sel.has(k)}"><span class="n">${d}</span><span class="q">${q}</span></button>`;
    }
    cal.innerHTML = html;
  }

  function nextDayOk(startKey) {
    const nk = key(addDays(parse(startKey), 1));
    const s = dayStatus(nk);
    return s.state === "open" ? true : s.state === "closed" ? "The next day is closed" : s.state === "soldout" ? "The next day is sold out" : "The next day is outside the season";
  }

  function selectDay(k) {
    state.start = k;
    const ok = nextDayOk(k);
    if (ok !== true) state.days = 1;
    clampQty();
    renderAll();
  }

  function renderLength() {
    const row = $("#length-row");
    if (!state.start) { row.hidden = true; return; }
    row.hidden = false;
    const ks = rangeKeys();
    const s = parse(ks[0]), e = parse(ks[ks.length - 1]);
    $("#sel-date").textContent = state.days === 1 ? fmt(s, { weekday: "long", month: "long", day: "numeric" }) : `${fmt(s)} to ${fmt(e)}`;
    const ok = nextDayOk(state.start);
    $$("#length-row .seg button").forEach((b) => {
      const d = Number(b.dataset.days);
      b.setAttribute("aria-pressed", String(d === state.days));
      b.disabled = d === 2 && ok !== true;
    });
    $("#len-note").textContent = ok !== true ? ok + ", so this is a 1-day rental." : `Rentals are ${cfg.maxDays} days max.`;
  }

  /* ---------- items ---------- */
  function clampQty() {
    cfg.items.forEach((it) => { state.qty[it.id] = Math.max(0, Math.min(state.qty[it.id], rangeLeft(it.id))); });
  }
  function renderItems() {
    $("#items").innerHTML = cfg.items.map((it) => {
      const left = state.start ? rangeLeft(it.id) : null;
      const q = state.qty[it.id];
      const meta = left == null ? "Pick a date to see availability" : left === 0 ? "None left for these dates" : `${left} available`;
      return `<div class="item-row"><img src="${it.img}" alt=""><div><strong>${it.name}</strong><span class="meta">${money(it.price)} per day · ${meta}</span></div>
        <div class="stepper" role="group" aria-label="${it.name} quantity"><button type="button" data-dec="${it.id}" aria-label="Remove one ${it.name}" ${q <= 0 || left == null ? "disabled" : ""}>−</button><output aria-live="polite">${q}</output><button type="button" data-inc="${it.id}" aria-label="Add one ${it.name}" ${left == null || q >= left ? "disabled" : ""}>+</button></div></div>`;
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
      const amt = q * it.price * state.days;
      total += amt;
      lines.push([`${q} × ${it.name}${state.days > 1 ? `, ${state.days} days` : ""}`, amt]);
    });
    const prot = state.qty.kit * itemById("kit").protection + state.qty.lanyard * itemById("lanyard").protection;
    const dep = state.qty.kit * itemById("kit").deposit + state.qty.lanyard * itemById("lanyard").deposit;
    if (state.protection === "protection" && prot) { lines.push(["Gear Protection", prot]); total += prot; }
    else hold = dep;
    return { lines, total, hold, prot, dep };
  }
  function renderSummary() {
    const p = pricing();
    const ks = rangeKeys();
    const dates = ks.length ? (ks.length === 1 ? fmt(parse(ks[0]), { weekday: "long", month: "long", day: "numeric", year: "numeric" }) : `${fmt(parse(ks[0]))} to ${fmt(parse(ks[1]), { weekday: "short", month: "short", day: "numeric", year: "numeric" })}`) : "No dates picked yet";
    $("#sum-dates").textContent = dates;
    $("#sum-lines").innerHTML = p.lines.length ? p.lines.map(([l, a]) => `<li><span>${esc(l)}</span><span>${money(a)}</span></li>`).join("") : `<li class="empty">Add gear to see your total.</li>`;
    $("#sum-total").textContent = money(p.total);
    $("#sum-hold").textContent = p.hold ? `Plus a refundable ${money(p.hold)} hold on your card, released when the gear is back.` : (p.lines.length ? "No card hold with Gear Protection." : "");
    $("#hold-amt").textContent = p.dep ? money(p.dep) + " hold" : "";
    $("#prot-amt").textContent = p.prot ? "+" + money(p.prot) : "";
    $("#mb-total").textContent = money(p.total);
    const short = (k) => fmt(parse(k), { month: "short", day: "numeric" });
    $("#mb-dates").textContent = ks.length ? (ks.length === 1 ? short(ks[0]) : `${short(ks[0])} to ${short(ks[1])}`) : "Pick a date";
  }

  /* ---------- climbers ---------- */
  function syncClimbers() {
    const n = climberCount();
    while (state.climbers.length < n) state.climbers.push({ name: "", age: "adult", guardian: 0, weightOk: false });
    state.climbers.length = n;
    if (state.climbers[0]) { state.climbers[0].name = state.lead.name; state.climbers[0].age = "adult"; }
  }
  function renderClimbers() {
    syncClimbers();
    const adults = state.climbers.map((c, i) => ({ c, i })).filter(({ c }) => c.age === "adult");
    $("#climbers").innerHTML = state.climbers.map((c, i) => {
      const lead = i === 0;
      return `<div class="climber" data-i="${i}">
        <h3>Climber ${i + 1}${lead ? ' <span class="tag">You</span>' : ""}</h3>
        <div class="grid-2">
          <div class="field"><label for="c-name-${i}">Full legal name</label><input id="c-name-${i}" data-f="name" value="${esc(c.name)}" ${lead ? 'readonly aria-describedby="lead-note"' : ""} autocomplete="off"><span class="err"></span>${lead ? '<span class="small" id="lead-note">From your details above.</span>' : ""}</div>
          <div class="field"><label for="c-age-${i}">Age</label><select id="c-age-${i}" data-f="age" ${lead ? "disabled" : ""}><option value="adult" ${c.age === "adult" ? "selected" : ""}>18 or older</option><option value="minor" ${c.age === "minor" ? "selected" : ""}>14 to 17</option></select></div>
        </div>
        ${c.age === "minor" ? `<div class="field" style="margin-top:16px"><label for="c-guard-${i}">Parent or guardian on the route</label><select id="c-guard-${i}" data-f="guardian">${adults.map(({ c: a, i: ai }) => `<option value="${ai}" ${Number(c.guardian) === ai ? "selected" : ""}>${esc(a.name || "Climber " + (ai + 1))}</option>`).join("")}</select><span class="small">They'll sign the agreement for this climber and must climb with them.</span></div>` : ""}
        <div class="ack" style="margin-top:12px"><label><input type="checkbox" data-f="weightOk" ${c.weightOk ? "checked" : ""}><span>Weighs 90–265 lbs and has a 62" vertical reach.</span></label></div>
      </div>`;
    }).join("");
  }

  // update parent/guardian dropdown labels without re-rendering (keeps focus)
  function refreshGuardianLabels() {
    $$("#climbers select[data-f=guardian] option").forEach((o) => {
      const a = state.climbers[Number(o.value)];
      if (a) o.textContent = a.name || "Climber " + (Number(o.value) + 1);
    });
  }

  /* ---------- signing ---------- */
  function signers() {
    return state.climbers.map((c, i) => ({ c, i })).filter(({ c }) => c.age === "adult").map(({ c, i }) => ({
      i, name: c.name, minors: state.climbers.map((m, mi) => ({ m, mi })).filter(({ m }) => m.age === "minor" && Number(m.guardian) === i).map(({ m }) => m.name),
    }));
  }
  function sigKey(s) { return `${s.i}|${s.name.trim().toLowerCase()}|${s.minors.join(",")}`; }
  function pruneSignatures() {
    const valid = new Set(signers().map(sigKey));
    Object.keys(state.signatures).forEach((k) => { if (!valid.has(k)) delete state.signatures[k]; });
  }
  function fillFor(s) {
    const ks = rangeKeys();
    return {
      renterName: s.name,
      contact: s.i === 0 ? `${state.lead.phone} / ${state.lead.email}` : `Booked by ${state.lead.name} (${state.lead.email})`,
      rentalDates: ks.map((k) => fmt(parse(k), { weekday: "long", month: "long", day: "numeric", year: "numeric" })).join(" and "),
      gear: { ...state.qty },
      protection: state.protection,
    };
  }
  function renderSigners() {
    pruneSignatures();
    const list = signers();
    if (state.signerIdx == null || !list.some((s) => s.i === state.signerIdx)) {
      const firstOpen = list.find((s) => !state.signatures[sigKey(s)]);
      state.signerIdx = (firstOpen || list[0]).i;
    }
    const done = list.filter((s) => state.signatures[sigKey(s)]).length;
    $("#sign-hint").textContent = `${done} of ${list.length} adult${list.length > 1 ? "s" : ""} signed. Each adult signs on this device or their own.`;
    $("#signers").innerHTML = list.map((s) => `<button type="button" class="signer-chip" data-signer="${s.i}" aria-current="${s.i === state.signerIdx}">${esc(s.name)}${state.signatures[sigKey(s)] ? ' <span class="ok" aria-label="signed">✓ Signed</span>' : ""}</button>`).join("");
    renderSignArea();
  }
  function renderSignArea() {
    const s = signers().find((x) => x.i === state.signerIdx);
    const rec = state.signatures[sigKey(s)];
    const area = $("#sign-area");
    if (rec) {
      area.innerHTML = `<div class="panel" style="background:var(--juniper-soft)"><p style="margin:0 0 8px"><strong style="color:#000">${esc(s.name)} signed</strong> on ${new Date(rec.signedAt).toLocaleString("en-US")}.</p><img src="${rec.signature}" alt="Signature of ${esc(s.name)}" style="max-height:80px;background:#fff;border-radius:8px"><p class="small" style="margin:8px 0 0">Agreement version ${rec.agreementVersion}</p><button type="button" class="link-btn" id="resign">Clear and sign again</button></div>`;
      $("#resign").onclick = () => { delete state.signatures[sigKey(s)]; renderSigners(); };
      return;
    }
    const minorAck = s.minors.length ? [`I am the parent or legal guardian of ${s.minors.join(" and ")}, I have authority to sign for them, and I will be on the course with them at all times.`] : [];
    const acks = AG.ACKS.concat(minorAck);
    area.innerHTML = `
      <p class="small" style="margin-top:0">Signing as <strong style="color:#000">${esc(s.name)}</strong>${s.minors.length ? ` and for ${esc(s.minors.join(", "))}` : ""}. Scroll to the end of the agreement to continue.</p>
      <div class="doc-scroll" id="doc-scroll" tabindex="0" aria-label="Rental agreement text"><div class="doc">${AG.render(fillFor(s))}</div></div>
      <p class="scroll-status" id="scroll-status">Scroll to the end to unlock signing.</p>
      <fieldset id="sign-fields" disabled style="border:0;padding:0;margin:0">
        <div class="ack"><p class="ack-count" id="ack-count" style="margin:12px 0 0"></p>${acks.map((a, n) => `<label><input type="checkbox" data-ack="${n}"><span>${esc(a)}</span></label>`).join("")}</div>
        <div class="grid-2" style="margin-top:20px">
          <div class="field"><label for="typed-name">Type your full legal name</label><input id="typed-name" autocomplete="off" placeholder="${esc(s.name)}"><span class="err" id="typed-err"></span></div>
          <div class="field"><span class="lab">Date</span><input value="${fmt(today, { month: "long", day: "numeric", year: "numeric" })}" readonly></div>
        </div>
        <div class="field" style="margin-top:16px"><span class="lab" id="sig-lab">Draw your signature</span>
          <div class="sig-pad" id="sig-pad"><canvas id="sig-canvas" aria-labelledby="sig-lab"></canvas><span class="placeholder">Sign here with your finger or mouse</span></div>
          <div class="sig-line"><span class="small">Electronic signature</span><button type="button" class="link-btn" id="sig-clear">Clear</button></div>
        </div>
        <div class="ack"><label><input type="checkbox" id="consent"><span>${esc(AG.CONSENT)}</span></label></div>
        <button type="button" class="btn btn--ink" id="sign-btn" style="margin-top:16px" disabled>Sign agreement</button>
      </fieldset>`;
    const sc = $("#doc-scroll");
    const unlock = () => {
      if (sc.scrollTop + sc.clientHeight >= sc.scrollHeight - 24) {
        $("#sign-fields").disabled = false;
        const st = $("#scroll-status"); st.textContent = "You've reached the end. Confirm each statement below."; st.classList.add("is-done");
        sc.removeEventListener("scroll", unlock);
        setupPad();
      }
    };
    sc.addEventListener("scroll", unlock, { passive: true });
    const pad = { hasInk: false };
    const check = () => {
      const boxes = $$("[data-ack]", area);
      const n = boxes.filter((b) => b.checked).length;
      $("#ack-count").textContent = `${n} of ${boxes.length} confirmed`;
      const typed = $("#typed-name").value.trim().toLowerCase().replace(/\s+/g, " ");
      const nameOk = typed && typed === s.name.trim().toLowerCase().replace(/\s+/g, " ");
      $("#typed-err").textContent = typed && !nameOk ? "Type your name exactly as it appears above." : "";
      $("#sign-btn").disabled = !(n === boxes.length && nameOk && pad.hasInk && $("#consent").checked);
    };
    area.oninput = check; area.onchange = check;
    check();
    $("#sign-btn").onclick = async () => {
      const text = sc.innerText;
      state.signatures[sigKey(s)] = {
        signer: s.name, minors: s.minors, email: s.i === 0 ? state.lead.email : null,
        acknowledgments: acks, consent: AG.CONSENT, typedName: $("#typed-name").value.trim(),
        signature: $("#sig-canvas").toDataURL("image/png"),
        signedAt: new Date().toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        agreementVersion: AG.VERSION, agreementSha256: await AG.hash(text), agreementHtml: AG.render(fillFor(s)),
        userAgent: navigator.userAgent,
      };
      state.signerIdx = null;
      renderSigners();
      $("#signers").scrollIntoView({ behavior: "smooth", block: "center" });
    };
    function setupPad() {
      const wrap = $("#sig-pad"), cv = $("#sig-canvas");
      const ratio = window.devicePixelRatio || 1;
      cv.width = wrap.clientWidth * ratio; cv.height = wrap.clientHeight * ratio;
      const ctx = cv.getContext("2d");
      ctx.scale(ratio, ratio); ctx.lineWidth = 2.2; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = "#000";
      let drawing = false, last = null;
      const pos = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
      cv.onpointerdown = (e) => { drawing = true; last = pos(e); cv.setPointerCapture(e.pointerId); };
      cv.onpointermove = (e) => {
        if (!drawing) return;
        const p = pos(e); ctx.beginPath(); ctx.moveTo(last[0], last[1]); ctx.lineTo(p[0], p[1]); ctx.stroke(); last = p;
        if (!pad.hasInk) { pad.hasInk = true; wrap.classList.add("has-ink"); check(); }
      };
      cv.onpointerup = cv.onpointercancel = () => { drawing = false; };
      $("#sig-clear").onclick = () => { ctx.clearRect(0, 0, cv.width, cv.height); pad.hasInk = false; wrap.classList.remove("has-ink"); check(); };
    }
    // short agreements on tall screens: unlock if there's nothing to scroll
    requestAnimationFrame(unlock);
  }

  /* ---------- review & confirm ---------- */
  function renderReview() {
    const p = pricing();
    const list = signers();
    $("#review").innerHTML = [
      ["Dates", $("#sum-dates").textContent],
      ["Gear", cfg.items.filter((i) => state.qty[i.id]).map((i) => `${state.qty[i.id]} × ${i.name}`).join(", ")],
      ["Climbers", state.climbers.map((c) => esc(c.name) + (c.age === "minor" ? " (14–17)" : "")).join(", ")],
      ["Agreements", `${list.filter((s) => state.signatures[sigKey(s)]).length} of ${list.length} signed`],
      ["Safety video", state.videoDone ? "Confirmed" : "Not confirmed"],
      ["Damage cover", state.protection === "protection" ? "Gear Protection" : `Card hold of ${money(p.hold)}`],
      ["Total", money(p.total)],
    ].map(([a, b]) => `<li><span>${a}</span><strong style="color:#000">${b}</strong></li>`).join("");
  }
  function confirmBooking() {
    state.ref = "TR-" + Math.random().toString(36).slice(2, 8).toUpperCase();
    const record = { ref: state.ref, createdAt: new Date().toISOString(), dates: rangeKeys(), qty: state.qty, protection: state.protection, total: pricing().total, lead: state.lead, climbers: state.climbers, signatures: Object.values(state.signatures).map(({ agreementHtml, ...r }) => r) };
    try { const all = JSON.parse(localStorage.getItem("trailside_demo_bookings") || "[]"); all.push(record); localStorage.setItem("trailside_demo_bookings", JSON.stringify(all)); } catch (e) { /* storage unavailable: demo still works */ }
    $("#ref").textContent = state.ref;
    $("#conf-email").textContent = state.lead.email;
    $("#conf-list").innerHTML = [
      ["Dates", $("#sum-dates").textContent], ["Total", money(pricing().total)], ["Agreements on file", Object.keys(state.signatures).length], ["Locker code", "Sent after payment, once everyone has signed"],
    ].map(([a, b]) => `<li><span>${a}</span><strong style="color:#000">${b}</strong></li>`).join("");
  }
  function downloadSigned() {
    const docs = Object.values(state.signatures).map((r) => `<section style="page-break-after:always">${r.agreementHtml}
      <h3>Signature</h3><p>Typed name: <strong>${esc(r.typedName)}</strong>${r.minors.length ? `<br>Signing for minors: ${esc(r.minors.join(", "))}` : ""}</p>
      <img src="${r.signature}" style="max-width:360px;border-bottom:1px solid #000"><p>Signed ${esc(r.signedAt)} (${esc(r.timeZone)})<br>Agreement version ${esc(r.agreementVersion)} · SHA-256 ${esc(r.agreementSha256)}</p>
      <h3>Statements confirmed</h3><ul>${r.acknowledgments.map((a) => `<li>${esc(a)}</li>`).join("")}</ul><p><em>${esc(r.consent)}</em></p></section>`).join("");
    const html = `<!doctype html><meta charset="utf-8"><title>Trailside Rentals signed agreements ${state.ref}</title><style>body{font-family:system-ui,sans-serif;max-width:800px;margin:40px auto;padding:0 20px;line-height:1.5}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:6px;text-align:left}</style><h1>Booking ${state.ref}</h1>${docs}`;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    a.download = `Trailside-signed-agreements-${state.ref}.html`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  /* ---------- validation ---------- */
  function setErr(input, msg) {
    const f = input.closest(".field");
    if (f) { f.classList.toggle("has-error", !!msg); const e = $(".err", f); if (e) e.textContent = msg || ""; }
    return !msg;
  }
  function validate(step) {
    if (step === 0) {
      if (!state.start) return "Pick a start date on the calendar.";
      if (climberCount() < 1) return "Add at least one full kit or lanyard. Each climber needs one.";
      return "";
    }
    if (step === 1) {
      let ok = true;
      ok = setErr($("#lead-name"), state.lead.name.trim().split(/\s+/).length < 2 ? "Enter your first and last name." : "") && ok;
      ok = setErr($("#lead-email"), /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.lead.email) ? "" : "Enter a valid email.") && ok;
      ok = setErr($("#lead-phone"), state.lead.phone.replace(/\D/g, "").length >= 10 ? "" : "Enter a 10-digit phone number.") && ok;
      state.climbers.forEach((c, i) => { if (i) ok = setErr($(`#c-name-${i}`), c.name.trim().split(/\s+/).length < 2 ? "Enter first and last name." : "") && ok; });
      if (!ok) return "Fix the highlighted fields.";
      if (state.climbers.some((c) => !c.weightOk)) return "Confirm the weight and reach requirement for every climber.";
      return "";
    }
    if (step === 2) {
      if (!state.videoDone) return "Confirm the safety video.";
      const list = signers();
      const left = list.filter((s) => !state.signatures[sigKey(s)]);
      if (left.length) return `Still waiting on ${left.map((s) => s.name).join(", ")} to sign.`;
      return "";
    }
    return "";
  }

  /* ---------- navigation ---------- */
  function go(step, initial) {
    state.step = step;
    $$(".step-panel").forEach((p) => p.classList.toggle("is-active", Number(p.dataset.step) === step));
    $("#progress").innerHTML = STEPS.map((s, i) => `<li class="${i < step ? "is-done" : i === step ? "is-current" : ""}" ${i === step ? 'aria-current="step"' : ""}><span class="bar"></span><span class="label">${i + 1}. ${s}</span></li>`).join("");
    const done = step === 4;
    $$("[data-act=back]").forEach((b) => (b.style.visibility = step === 0 || done ? "hidden" : "visible"));
    $$("[data-act=next]").forEach((b) => (b.textContent = step === 3 ? "Confirm booking" : step === 2 ? "Continue to review" : "Continue"));
    $(".summary .step-actions").style.display = done ? "none" : "";
    $("#mobile-bar").style.display = done ? "none" : "";
    $("#step-error").hidden = true;
    if (step === 1) renderClimbers();
    if (step === 2) renderSigners();
    if (step === 3) renderReview();
    if (done) confirmBooking();
    if (!initial) window.scrollTo({ top: $("#progress").offsetTop - 100, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }
  function next() {
    const msg = validate(state.step);
    const box = $("#step-error");
    if (msg) {
      box.textContent = msg; box.hidden = false;
      if (window.innerWidth < 1000) alertMobile(msg);
      return;
    }
    go(state.step + 1);
  }
  function alertMobile(msg) {
    // the summary panel is far down on phones, so show the message near the top of the step
    let n = $("#m-err");
    if (!n) { n = document.createElement("p"); n.id = "m-err"; n.className = "form-error"; n.setAttribute("role", "alert"); $("#progress").after(n); }
    n.textContent = msg;
    n.scrollIntoView({ block: "center" });
    setTimeout(() => n.remove(), 6000);
  }

  function clearError() {
    $("#step-error").hidden = true;
    const m = $("#m-err"); if (m) m.remove();
  }
  function renderAll() {
    clearError();
    renderCalendar(); renderLength(); renderItems(); renderSummary();
  }

  /* ---------- events ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    $("#cal").addEventListener("click", (e) => { const b = e.target.closest("[data-day]"); if (b && !b.disabled) selectDay(b.dataset.day); });
    $("#cal-prev").onclick = () => { state.view = new Date(state.view.getFullYear(), state.view.getMonth() - 1, 1); renderCalendar(); };
    $("#cal-next").onclick = () => { state.view = new Date(state.view.getFullYear(), state.view.getMonth() + 1, 1); renderCalendar(); };
    $("#length-row").addEventListener("click", (e) => { const b = e.target.closest("[data-days]"); if (b && !b.disabled) { state.days = Number(b.dataset.days); clampQty(); renderAll(); } });
    $("#items").addEventListener("click", (e) => {
      const inc = e.target.closest("[data-inc]"), dec = e.target.closest("[data-dec]");
      if (inc) state.qty[inc.dataset.inc]++;
      if (dec) state.qty[dec.dataset.dec]--;
      if (inc || dec) { clampQty(); renderItems(); renderSummary(); clearError(); }
    });
    $("#protection").addEventListener("change", (e) => { state.protection = e.target.value; renderSummary(); });
    ["name", "email", "phone"].forEach((f) => $(`#lead-${f}`).addEventListener("input", (e) => {
      state.lead[f] = e.target.value;
      if (f === "name" && state.climbers[0]) { state.climbers[0].name = e.target.value; const c0 = $("#c-name-0"); if (c0) c0.value = e.target.value; refreshGuardianLabels(); }
    }));
    $("#climbers").addEventListener("input", (e) => {
      const row = e.target.closest("[data-i]"); if (!row) return;
      const c = state.climbers[Number(row.dataset.i)], f = e.target.dataset.f;
      if (f === "name") { c.name = e.target.value; refreshGuardianLabels(); }
    });
    $("#climbers").addEventListener("change", (e) => {
      const row = e.target.closest("[data-i]"); if (!row) return;
      const c = state.climbers[Number(row.dataset.i)], f = e.target.dataset.f;
      if (f === "age") { c.age = e.target.value; c.guardian = 0; renderClimbers(); }
      if (f === "guardian") c.guardian = Number(e.target.value);
      if (f === "weightOk") c.weightOk = e.target.checked;
      if (f === "name") refreshGuardianLabels();
    });
    $("#signers").addEventListener("click", (e) => { const b = e.target.closest("[data-signer]"); if (b) { state.signerIdx = Number(b.dataset.signer); renderSigners(); } });
    $("#video-done").addEventListener("change", (e) => (state.videoDone = e.target.checked));
    $$("[data-act=next]").forEach((b) => b.addEventListener("click", next));
    $$("[data-act=back]").forEach((b) => b.addEventListener("click", () => go(Math.max(0, state.step - 1))));
    $("#dl-signed").addEventListener("click", downloadSigned);
    renderAll();
    go(0, true);
  });
})();
