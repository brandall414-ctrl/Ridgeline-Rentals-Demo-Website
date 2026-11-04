/* ==========================================================================
   Trailside Rentals — business settings
   Edit prices, stock, season dates and closures here. Every page reads
   from this one file, so the rates page, booking page and agreement stay
   in sync.
   ========================================================================== */
window.TRAILSIDE = {
  brand: "Trailside Rentals",
  legalEntity: "Randall Ventures LLC",
  contact: {
    phone: "(208) 473-1751",
    phoneHref: "tel:+12084731751",
    email: "trailsiderentalsvernal@gmail.com",
    location: "Ashley Gorge Via Ferrata trailhead, about 12 miles north of Vernal, Utah",
  },

  // Season and booking rules
  seasonStart: "2027-03-01",   // first bookable day (YYYY-MM-DD)
  seasonEnd: "2027-11-30",     // last bookable day
  maxDays: 2,                  // longest rental a customer can book
  lowStockAt: 4,               // show "only X left" at or below this

  // price = 1-day rental. extraDay = added for each day after the first,
  // so a 2-day kit is 45 + 15 = $60.
  items: [
    {
      id: "kit",
      name: "Full kit",
      detail: "Helmet, harness and via ferrata lanyard",
      price: 45,
      extraDay: 15,
      stock: 16,
      perClimber: true,
      protection: 8,   // Gear Protection fee, per rental
      deposit: 150,    // refundable card hold if no Gear Protection
      img: "assets/gear/full-kit.png",
    },
    {
      id: "lanyard",
      name: "Lanyard only",
      detail: "Energy-absorbing via ferrata lanyard. Bring your own helmet and harness.",
      price: 30,
      extraDay: 10,
      stock: 8,
      perClimber: true,
      protection: 5,
      deposit: 80,
      img: "assets/gear/lanyard.png",
    },
    {
      id: "helmet",
      name: "Helmet only",
      detail: "UIAA / EN 12492 certified climbing helmet",
      price: 12,
      extraDay: 5,
      stock: 4,
      perClimber: false,
      protection: 0,
      deposit: 0,
      img: "assets/gear/helmet.png",
    },
    {
      id: "harness",
      name: "Harness only",
      detail: "UIAA / EN 12277 certified harness",
      price: 12,
      extraDay: 5,
      stock: 4,
      perClimber: false,
      protection: 0,
      deposit: 0,
      img: "assets/gear/harness.png",
    },
  ],

  // Dates the route or lockers are closed. Booking is blocked on these days.
  // In the live version, adding a closure will also refund affected bookings.
  closures: {
    "2027-04-10": "Route closed for county maintenance",
    "2027-04-11": "Route closed for county maintenance",
    "2027-07-04": "Lockers closed for the holiday",
  },

  // Safety video every renter must watch to the end before signing.
  // Placeholder clip until the real video is filmed.
  safetyVideo: {
    src: "assets/video/safety-video-placeholder.mp4",
    webm: "assets/video/safety-video-placeholder.webm",
    poster: "assets/video/safety-video-poster.jpg",
  },

  // Demo only: fake existing bookings so the calendar shows real-looking
  // availability. Remove once the booking backend is connected.
  demoBookings: true,
};

// Price for one item for a rental of `days` days.
window.TRAILSIDE.priceFor = function (item, days) {
  return item.price + item.extraDay * Math.max(0, days - 1);
};
