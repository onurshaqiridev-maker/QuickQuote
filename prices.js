// QuickQuote price list
// Every price lives here, in ONE place. The website reads these prices from the
// server, so changing a number here changes it everywhere.

const PRICES = {
  currency: 'EUR',

  // Allowed number of rooms
  rooms: { min: 1, max: 10 },

  // Each service has a fixed starting price plus a price for every room
  services: [
    { id: 'standard', name: 'Standard clean', basePrice: 40, pricePerRoom: 15 },
    { id: 'deep', name: 'Deep clean', basePrice: 70, pricePerRoom: 25 },
    { id: 'move-out', name: 'Move-out clean', basePrice: 100, pricePerRoom: 30 }
  ],

  // Regular customers get a discount (0.05 = 5%)
  frequencies: [
    { id: 'one-time', name: 'One-time', discount: 0 },
    { id: 'monthly', name: 'Monthly', discount: 0.05 },
    { id: 'bi-weekly', name: 'Bi-weekly', discount: 0.10 },
    { id: 'weekly', name: 'Weekly', discount: 0.15 }
  ],

  // Optional extras, each with a fixed price
  extras: [
    { id: 'windows', name: 'Inside windows', price: 20 },
    { id: 'fridge', name: 'Inside fridge', price: 15 },
    { id: 'oven', name: 'Inside oven', price: 25 },
    { id: 'laundry', name: 'Laundry', price: 18 }
  ]
};

// "module.exports" lets other files (like server.js) use PRICES with require()
module.exports = { PRICES };
