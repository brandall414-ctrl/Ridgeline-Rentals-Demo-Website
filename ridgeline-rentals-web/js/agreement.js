/* ==========================================================================
   Trailside Rentals — Gear Rental Agreement and Liability Release
   Source: Ridgeline_Rentals_Rental_Agreement.docx, with the business name
   changed to Trailside Rentals. Any change to this wording must bump
   AGREEMENT_VERSION so signed records show which text was agreed to.
   ========================================================================== */
(function () {
  "use strict";

  const VERSION = "2026-11-03.1";
  const B = "Trailside Rentals";

  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const money = (n) => "$" + Number(n).toFixed(2);

  function table(head, rows) {
    return `<table>${head ? `<thead><tr>${head.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead>` : ""}<tbody>${rows
      .map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`)
      .join("")}</tbody></table>`;
  }
  const ul = (items) => `<ul>${items.map((i) => `<li>${i}</li>`).join("")}</ul>`;
  const blank = '<span style="color:#8C8F92">To be completed at booking</span>';

  /**
   * Render the agreement as HTML.
   * fill (optional): { renterName, contact, rentalDates, returnDeadline, gear: {kit, lanyard, helmet, harness}, protection: "deposit"|"protection" }
   */
  function render(fill) {
    const f = fill || {};
    const cfg = window.TRAILSIDE;
    const item = (id) => cfg.items.find((i) => i.id === id);
    const g = f.gear || null;
    const yesNo = (included) =>
      g == null ? "☐ Yes &nbsp; ☐ No" : included ? "<strong>☒ Yes</strong> &nbsp; ☐ No" : "☐ Yes &nbsp; <strong>☒ No</strong>";
    const hasHelmet = g && (g.kit > 0 || g.helmet > 0);
    const hasHarness = g && (g.kit > 0 || g.harness > 0);
    const hasLanyard = g && (g.kit > 0 || g.lanyard > 0);
    const opt = (key) => (f.protection == null ? "☐" : f.protection === key ? "<strong>☒</strong>" : "☐");

    return `
<p><strong>${B.toUpperCase()}</strong><br>A Division of Randall Ventures LLC<br>Ashley Gorge Via Ferrata Gear Rental<br>trailsideashleygorge.com &nbsp;|&nbsp; ${esc(cfg.contact.email)}</p>
<h2>Gear Rental Agreement and Liability Release</h2>
<p class="warn">PLEASE READ CAREFULLY BEFORE SIGNING. THIS DOCUMENT CONTAINS A RELEASE OF LIABILITY AND ASSUMPTION OF RISK THAT WILL AFFECT YOUR LEGAL RIGHTS. BY SIGNING, YOU GIVE UP IMPORTANT RIGHTS, INCLUDING THE RIGHT TO SUE.</p>
<p class="small">Agreement version ${VERSION}</p>

<h2>Part I — Rental Agreement</h2>
<h3>1. Parties &amp; Rental Details</h3>
<p>This Gear Rental Agreement and Liability Release ("Agreement") is entered into between Randall Ventures LLC dba ${B} ("Company") and the renter identified below ("Renter").</p>
${table(null, [
  ["Company", `Randall Ventures LLC dba ${B}`],
  ["Renter Name", f.renterName ? esc(f.renterName) : blank],
  ["Phone / Email", f.contact ? esc(f.contact) : blank],
  ["Rental Date", f.rentalDates ? esc(f.rentalDates) : blank],
  ["Rental Location", "Ashley Gorge Via Ferrata Trailhead, Vernal, Utah"],
  ["Return Deadline", f.returnDeadline ? esc(f.returnDeadline) : "24 hours from time of gear dispensing"],
])}

<h3>2. Gear Issued</h3>
<p>The following gear is dispensed to Renter via the ${B} smart locker system. Renter acknowledges receipt of the selected items in good, functional condition at the time of dispensing.</p>
${table(["Item", "Included"], [
  ["Helmet (UIAA / EN 12492 Certified)", yesNo(hasHelmet)],
  ["Mountaineering Harness (UIAA / EN 12277 Certified)", yesNo(hasHarness)],
  ["Via Ferrata Lanyard / EAS (UIAA Certified)", yesNo(hasLanyard)],
])}

<h3>3. Renter Eligibility</h3>
<p>By signing this Agreement, Renter confirms each of the following:</p>
${ul([
  "I am 18 years of age or older. (Renters under 18 may not rent independently. A parent or legal guardian must rent the gear on the minor's behalf, must be physically present on the via ferrata course with the minor, and the minor must be at least 14 years of age.)",
  "I weigh between 90 lbs (40 kg) and 265 lbs (120 kg), as required by Ashley Gorge Via Ferrata rules.",
  "I have a minimum vertical reach of 62 inches from the ground.",
  "I am physically capable of donning a climbing harness without assistance.",
  `I have completed the ${B} safety and instructional video required prior to receiving my locker PIN code.`,
  "I have signed the Uintah County Ashley Gorge Via Ferrata liability waiver, as required by the County for use of the course.",
])}

<h3>4. Rental Terms &amp; Pricing</h3>
<p>Standard Rental Pricing (per item, per rental day)</p>
${table(["Rental Option", "Price per Day"], [
  [`Full Kit (Helmet + Harness + Lanyard)`, money(item("kit").price)],
  ["Lanyard Only", money(item("lanyard").price)],
  ["Helmet Only", money(item("helmet").price)],
  ["Harness Only", money(item("harness").price)],
])}

<h3>5. Security Deposit &amp; Damage Waiver</h3>
<p><strong>Option A — Standard Rental (Security Deposit)</strong></p>
<p>A refundable security deposit hold of ${money(item("kit").deposit)} per kit (or ${money(item("lanyard").deposit)} for lanyard-only rentals) will be placed on Renter's payment card at the time of rental via Stripe. This hold is not a charge. Upon confirmed return of all gear in acceptable condition, the hold will be released the same day. Renter acknowledges that actual posting of released funds may vary based on Renter's bank processing times.</p>
<p><strong>Option B — Damage Waiver (No Deposit Required)</strong></p>
<p>Renter may purchase a Damage Waiver at the time of rental in lieu of the security deposit hold. The Damage Waiver fee is ${money(item("kit").protection)} per full kit or ${money(item("lanyard").protection)} per lanyard-only rental. By purchasing the Damage Waiver:</p>
${ul([
  "No deposit hold will be placed on Renter's payment card.",
  "Accidental damage to gear resulting directly from a fall or normal use of the via ferrata course is covered. Renter will not be charged for such damage.",
  "The Damage Waiver does NOT cover damage resulting from abuse, negligence, improper use, or intentional misuse of equipment.",
  "The Damage Waiver does NOT cover non-return of gear under any circumstances.",
  "If gear is not returned within 24 hours, Renter's payment card will be charged the full replacement cost of all unreturned items (Helmet: $50.00 | Harness: $60.00 | Lanyard: $80.00), regardless of whether the Damage Waiver was purchased.",
  `By purchasing the Damage Waiver, Renter explicitly authorizes ${B} to charge their payment card on file for the full replacement cost of any unreturned gear without further notice.`,
])}
<p>Renter selects (check one):<br>
${opt("deposit")} Option A — Standard Rental with ${money(item("kit").deposit)} deposit hold<br>
${opt("protection")} Option B — Damage Waiver purchased (${money(item("kit").protection)} / kit or ${money(item("lanyard").protection)} / lanyard)</p>

<h3>6. Return Policy</h3>
${ul([
  `All gear must be returned to the ${B} smart locker at the Ashley Gorge Via Ferrata trailhead within 24 hours of the recorded dispensing time.`,
  "Renter will receive a return PIN code via email or SMS to complete the return process. Gear must be secured inside the locker and the return confirmed through the system.",
  `Late returns will be charged an additional rental-day fee (${money(item("kit").price)} for a full kit; ${money(item("lanyard").price)} for lanyard-only) for each 24-hour period past the return deadline.`,
  "No refunds will be issued once gear has been dispensed from the locker.",
])}

<h3>7. Damage &amp; Replacement Fees</h3>
<p>For Renters on Option A (standard deposit), the following fee schedule applies to damaged or lost items. Charges reflect the replacement cost of the item minus a rental credit equal to the per-item rental rate. Net charges will be deducted from or assessed in addition to the security deposit hold as applicable.</p>
${table(["Item", "Replacement Cost", "Rental Credit", "Net Charge"], [
  ["Helmet", "$50.00", "$12.00", "$38.00"],
  ["Harness", "$60.00", "$12.00", "$48.00"],
  ["Via Ferrata Lanyard", "$80.00", "$30.00", "$50.00"],
  ["Lanyard Recoil Fee (untangled, not broken)", "—", "—", "$15.00"],
  ["Full Kit (all three items)", "$190.00", "$45.00", "$145.00"],
])}
<p>Damage resulting from abuse, improper use, or negligence is chargeable regardless of whether the Damage Waiver was purchased. ${B} will assess damage in good faith based on visible condition, manufacturer guidelines, and standard industry practice for retired climbing equipment.</p>
<p>Lanyard Recoil Fee: If a lanyard is returned with the coil untied or severely tangled but otherwise undamaged, a $15.00 recoil and preparation fee will be charged to cover restocking labor.</p>

<h3>8. Gear Condition Acknowledgment</h3>
<p>All gear dispensed by ${B} has been inspected prior to rental and is represented to meet applicable UIAA and/or CE safety certification standards at the time of dispensing. Renter accepts the gear in good condition and agrees to inspect each item upon receipt. If Renter identifies a defect or concern with any item, Renter must contact ${B} immediately at the contact information provided and must not use the gear until the concern is resolved.</p>
<p>Renter further acknowledges that all gear is safety-critical equipment and must be used only for its intended purpose, in accordance with manufacturer guidelines and standard via ferrata practices. Renter assumes full responsibility for the proper fitting, donning, and use of all rented equipment.</p>

<h2>Part II — Release of Liability, Waiver of Claims, and Assumption of Risk</h2>
<p class="warn">READ EVERY WORD. THIS IS A LEGAL DOCUMENT THAT GIVES UP IMPORTANT LEGAL RIGHTS, INCLUDING YOUR RIGHT TO SUE AND RECOVER DAMAGES FOR INJURY, DEATH, OR LOSS, EVEN IF CAUSED BY THE NEGLIGENCE OF ${B.toUpperCase()}.</p>

<h3>9. Assumption of Risk</h3>
<p>Renter understands and acknowledges that via ferrata is an inherently dangerous activity that involves significant risk of serious bodily injury, paralysis, permanent disability, and death. Renter voluntarily and knowingly chooses to participate in this activity using equipment rented from ${B} and accepts and assumes full responsibility for all risks associated with the activity, including but not limited to:</p>
${ul([
  "Falls from height, including falls resulting in serious injury, paralysis, or death;",
  "Failure, malfunction, or improper use of rental equipment, including helmets, harnesses, and via ferrata lanyards;",
  "Renter's own improper fitting, donning, adjustment, or use of rented gear;",
  "Collision with or impact from other climbers, falling rock, debris, or fixed equipment on the course;",
  "Adverse weather conditions, including lightning, extreme heat, cold, wind, and flash flooding;",
  "Wildlife encounters;",
  "Difficult, exposed, loose, or unstable terrain;",
  "Becoming fatigued, stranded, lost, or unable to complete the course;",
  "The necessity of rescue, including any and all costs associated with search-and-rescue operations, evacuation, and medical transport;",
  "Pre-existing medical conditions of Renter that may be aggravated by physical exertion, exposure, or stress;",
  "Any other risks that are inherent to via ferrata, mountaineering, climbing, and outdoor recreation in remote terrain, whether or not specifically listed here.",
])}
<p>Renter understands that the above list is not exhaustive and that other unknown or unanticipated risks may exist. Renter accepts and assumes responsibility for those risks as well.</p>

<h3>10. Release of Liability</h3>
<p>In consideration of being permitted to rent equipment from ${B} and to participate in via ferrata activity using that equipment, Renter, on behalf of themselves, their heirs, executors, administrators, personal representatives, and assigns, hereby RELEASES, WAIVES, DISCHARGES, AND COVENANTS NOT TO SUE the following parties (collectively, the "Released Parties"):</p>
${ul([
  `Randall Ventures LLC, doing business as ${B};`,
  "Benjamin Randall, individually and in any capacity;",
  "Any and all officers, members, owners, employees, agents, contractors, volunteers, and representatives of Randall Ventures LLC, both current and future.",
])}
<p>Renter releases the Released Parties from any and all liability, claims, demands, actions, and causes of action whatsoever arising out of or related to any loss, damage, injury (including death) that may be sustained by Renter, or to any property belonging to Renter, while participating in any activity involving rented equipment, while on or near the Ashley Gorge Via Ferrata course, or while in, on, or about the rental locker premises and surrounding areas — WHETHER CAUSED BY THE NEGLIGENCE OF THE RELEASED PARTIES OR OTHERWISE.</p>
<p>This release specifically includes, but is not limited to, claims arising from:</p>
${ul([
  "Negligent inspection, maintenance, or selection of rental equipment;",
  "Negligent operation of the rental locker, PIN system, or related rental infrastructure;",
  `Any negligent act or omission of ${B}, its employees, agents, or representatives;`,
  "Any defect or alleged defect in the design, condition, sizing, or functioning of rented gear.",
])}
<p><strong>IMPORTANT:</strong> This release does not waive claims arising from gross negligence, willful or wanton misconduct, or intentional acts by the Released Parties. Renter retains all rights they may have under Utah law with respect to such conduct.</p>

<h3>11. Gear-Only Service — No Instruction or Supervision</h3>
<p>Renter expressly acknowledges and agrees that ${B} is solely a rental provider of climbing and via ferrata equipment. ${B} is NOT a guide service, climbing school, or instructional outfitter. ${B} does not provide:</p>
${ul([
  "On-site instruction, supervision, guiding, or coaching;",
  "Route advice, real-time conditions reporting, or weather monitoring;",
  "Rescue services, emergency response, or on-course assistance;",
  "Personalized fitting, sizing, or technique assessment beyond what is provided in the safety video.",
])}
<p>Renter acknowledges that ${B} provides a pre-recorded safety and instructional video as a convenience and as part of the rental process. The video covers proper gear fitting, basic via ferrata technique, and known course hazards. Renter agrees that:</p>
${ul([
  "The video is a general informational resource only and does NOT constitute professional instruction, certification, or guiding;",
  "Renter remains solely responsible for their own knowledge, skill, technique, judgment, and decision-making on the via ferrata course;",
  "Renter has had the opportunity to ask questions and seek clarification before proceeding with the rental and using the gear;",
  "Renter is responsible for seeking additional professional instruction if they are not confident in their ability to safely use the rented gear or complete the via ferrata course.",
])}

<h3>12. Medical Fitness</h3>
<p>Renter represents and warrants that they are in good physical condition and have no medical condition, injury, illness, disability, or impairment that would make participation in via ferrata activity unsafe for themselves or others. Renter acknowledges that they have not been advised by a physician against participating in strenuous outdoor recreational activity. Renter accepts full responsibility for their own self-assessment of physical and medical fitness for this activity.</p>

<h3>13. Indemnification</h3>
<p>Renter agrees to INDEMNIFY, DEFEND, AND HOLD HARMLESS the Released Parties from any and all claims, demands, suits, damages, costs, and expenses (including reasonable attorneys' fees) brought by any third party arising out of or related to Renter's use of rented equipment, Renter's actions or inactions on or near the via ferrata course, or Renter's breach of this Agreement. This includes, without limitation, claims brought by other climbers, bystanders, landowners, rescue personnel, or any other party affected by Renter's conduct.</p>

<h3>14. Uintah County Waiver</h3>
<p>Renter acknowledges that the Ashley Gorge Via Ferrata is operated by Uintah County, Utah, and that Uintah County requires all users of the course to sign a separate liability waiver issued by the County. Renter confirms they have signed the County waiver and will comply with all County rules governing use of the course. This Agreement is in addition to, and does not replace or modify, the Uintah County waiver.</p>

<h3>15. General Provisions</h3>
<p><strong>Governing Law and Venue.</strong> This Agreement shall be governed by and construed in accordance with the laws of the State of Utah, without regard to its conflict-of-law provisions. Renter agrees that any legal action arising out of or related to this Agreement shall be brought exclusively in the state or federal courts located in Uintah County, Utah, and Renter consents to the personal jurisdiction of those courts.</p>
<p><strong>Severability.</strong> If any provision of this Agreement is held to be invalid, illegal, or unenforceable by a court of competent jurisdiction, the remaining provisions shall remain in full force and effect, and the unenforceable provision shall be reformed only to the extent necessary to make it enforceable while preserving its intent.</p>
<p><strong>Entire Agreement.</strong> This Agreement constitutes the entire understanding between the parties regarding the gear rental transaction and the activities contemplated, and it supersedes all prior or contemporaneous discussions, representations, or agreements, whether oral or written.</p>
<p><strong>Voluntary Execution.</strong> Renter affirms that they have read this entire Agreement, understand its contents, have had the opportunity to ask questions or consult an attorney, and sign it freely and voluntarily.</p>

<h3>Renter Acknowledgment &amp; Signature</h3>
<p class="warn">BY SIGNING BELOW, I CONFIRM THAT I HAVE READ THIS ENTIRE AGREEMENT, INCLUDING THE RELEASE OF LIABILITY AND ASSUMPTION OF RISK. I UNDERSTAND THAT I AM GIVING UP IMPORTANT LEGAL RIGHTS, INCLUDING THE RIGHT TO SUE FOR INJURY OR DEATH ARISING FROM THE NEGLIGENCE OF ${B.toUpperCase()}. I SIGN THIS AGREEMENT FREELY AND VOLUNTARILY.</p>

<h3>For Rentals Involving Minors (Ages 14–17)</h3>
<p>Minors under 18 may not rent gear independently. A parent or legal guardian must (1) rent the gear in their own name and sign this Agreement as the primary Renter, (2) be physically present on the Ashley Gorge Via Ferrata course with the minor at all times during use of the rented gear, and (3) accept full responsibility for the minor's use of the gear and conduct on the course. The minor must be at least 14 years of age and must independently meet all eligibility requirements in Section 3 (weight, reach, harness donning, video completion). By signing below, the parent or legal guardian acknowledges and agrees to these additional terms and represents that they have the legal authority to do so.</p>
`;
  }

  // Statements each signer checks one by one (mirrors Section 3 and key terms).
  const ACKS = [
    "I am 18 or older. If I'm signing for a climber aged 14–17, I am their parent or legal guardian and will be on the course with them the whole time.",
    "Each climber weighs between 90 and 265 lbs (40–120 kg) and has a vertical reach of at least 62 inches.",
    "Each climber can put on a climbing harness without help.",
    "Each climber has watched the Trailside safety video, or will before the locker PIN is released.",
    "Each climber has signed, or will sign, the Uintah County Ashley Gorge Via Ferrata waiver.",
    "I understand via ferrata can cause serious injury or death, and I accept those risks (Section 9).",
    "I release Trailside Rentals and Randall Ventures LLC from claims, including for negligence, as described in Section 10.",
    "I understand Trailside rents gear only and provides no guiding, instruction or rescue (Section 11).",
    "I agree to the return deadline, late fees and damage fees in Sections 5–7.",
  ];

  const CONSENT =
    "I agree to sign this Agreement electronically. My electronic signature has the same legal effect as a handwritten signature under the Utah Uniform Electronic Transactions Act and the federal E-SIGN Act. I can keep a copy of this Agreement and can ask for a paper copy at " +
    "trailsiderentalsvernal@gmail.com.";

  async function hash(text) {
    try {
      const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
      return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
    } catch (e) {
      return "unavailable";
    }
  }

  window.TrailsideAgreement = { VERSION, render, ACKS, CONSENT, hash };
})();
