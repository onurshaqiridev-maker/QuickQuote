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

// Round money to 2 decimals (cents), e.g. 25.499999 -> 25.5
function roundMoney(amount) {
  return Math.round(amount * 100) / 100;
}

// Works out the price for one quote.
// "choices" looks like: { service: 'deep', rooms: 3, frequency: 'weekly', extras: ['oven'] }
// Returns every line of the bill plus the total.
function calculateQuote(choices) {
  // 1. Look up the chosen items in the price list by their id
  const service = PRICES.services.find((s) => s.id === choices.service);
  const frequency = PRICES.frequencies.find((f) => f.id === choices.frequency);
  const rooms = Number(choices.rooms);
  const chosenExtras = PRICES.extras.filter((e) => (choices.extras || []).includes(e.id));

  // 2. Build the bill, one line at a time
  const lines = [];
  lines.push({ label: `${service.name} (base price)`, amount: service.basePrice });
  const roomWord = rooms === 1 ? 'room' : 'rooms';
  lines.push({ label: `${rooms} ${roomWord} × €${service.pricePerRoom}`, amount: rooms * service.pricePerRoom });
  chosenExtras.forEach((extra) => {
    lines.push({ label: extra.name, amount: extra.price });
  });

  // 3. Add up the lines
  let subtotal = 0;
  lines.forEach((line) => {
    subtotal += line.amount;
  });

  // 4. Take off the frequency discount (on the whole subtotal)
  const discount = roundMoney(subtotal * frequency.discount);
  const total = roundMoney(subtotal - discount);

  return {
    currency: PRICES.currency,
    service: service.name,
    rooms: rooms,
    frequency: frequency.name,
    lines: lines,
    subtotal: roundMoney(subtotal),
    discountPercent: frequency.discount * 100,
    discount: discount,
    total: total
  };
}

// "module.exports" lets other files (like server.js) use these with require()
module.exports = { PRICES, calculateQuote };
