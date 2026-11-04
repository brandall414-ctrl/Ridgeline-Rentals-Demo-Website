/* ==========================================================================
   Trailside Rentals — locker adapter
   The booking flow only ever calls these three functions. Today they're
   backed by a mock. When the real lockers arrive, write a new adapter with
   the same three functions that calls the supplier's API (from the server,
   never from the browser, so the API key stays secret) and swap it in at
   the bottom of this file. Nothing else in the site has to change.

     assignDoors(booking)          -> [{ unit, door, items }]
     createAccessCode(booking, doors, validFrom, validTo) -> { code, validFrom, validTo }
     revokeCode(code)              -> true

   Backup plan if the API ever fails: an admin page that hands out codes
   from a pre-loaded list, using the same three functions.
   ========================================================================== */
(function () {
  "use strict";

  // Locker layout approved by BLM: 3 units. Door counts are placeholders
  // until the hardware is chosen.
  const UNITS = [
    { unit: "A", doors: 12 },
    { unit: "B", doors: 12 },
    { unit: "C", doors: 12 },
  ];

  function seeded(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  const MockLockerAdapter = {
    name: "mock",
    // One door per climber for now (kit or lanyard, plus any extra helmet/harness in the first door).
    async assignDoors(booking) {
      const climbers = booking.qty.kit + booking.qty.lanyard;
      const doors = [];
      let n = seeded(booking.ref);
      for (let i = 0; i < climbers; i++) {
        const u = UNITS[(n + i) % UNITS.length];
        doors.push({ unit: u.unit, door: ((n >> 3) + i) % u.doors + 1, items: i < booking.qty.kit ? "Full kit" : "Lanyard" });
      }
      const extras = [];
      if (booking.qty.helmet) extras.push(`${booking.qty.helmet} helmet${booking.qty.helmet > 1 ? "s" : ""}`);
      if (booking.qty.harness) extras.push(`${booking.qty.harness} harness${booking.qty.harness > 1 ? "es" : ""}`);
      if (extras.length && doors[0]) doors[0].items += " + " + extras.join(", ");
      return doors;
    },
    async createAccessCode(booking, doors, validFrom, validTo) {
      const code = String(100000 + (seeded(booking.ref + "code") % 900000));
      return { code, validFrom, validTo };
    },
    async revokeCode() { return true; },
  };

  // Swap this line when the real adapter exists.
  window.TrailsideLocker = MockLockerAdapter;
})();
