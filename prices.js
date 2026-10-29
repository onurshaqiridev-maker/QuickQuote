// QuickQuote prices
// Every company has its own price list, saved in the database. This file has:
// - DEFAULT_PRICES: the starting price list a new company gets
// - validatePriceList(): checks a price list a company wants to save
// - validateChoices() and calculateQuote(): the same price maths as before,
//   but now they take the company's price list as a second input.

const ROOM_LIMITS = { min: 1, max: 10 };

// The 4 frequencies are the same for every company, but each company
// chooses its own discount (0.05 = 5%).
const FREQUENCY_NAMES = [
  { id: 'one-time', name: 'One-time' },
  { id: 'monthly', name: 'Monthly' },
  { id: 'bi-weekly', name: 'Bi-weekly' },
  { id: 'weekly', name: 'Weekly' }
];

const DEFAULT_PRICES = {
  currency: 'EUR',
  rooms: ROOM_LIMITS,
  services: [
    { id: 's1', name: 'Standard clean', basePrice: 40, pricePerRoom: 15 },
    { id: 's2', name: 'Deep clean', basePrice: 70, pricePerRoom: 25 },
    { id: 's3', name: 'Move-out clean', basePrice: 100, pricePerRoom: 30 }
  ],
  frequencies: [
    { id: 'one-time', name: 'One-time', discount: 0 },
    { id: 'monthly', name: 'Monthly', discount: 0.05 },
    { id: 'bi-weekly', name: 'Bi-weekly', discount: 0.10 },
    { id: 'weekly', name: 'Weekly', discount: 0.15 }
  ],
  extras: [
    { id: 'e1', name: 'Inside windows', price: 20 },
    { id: 'e2', name: 'Inside fridge', price: 15 },
    { id: 'e3', name: 'Inside oven', price: 25 },
    { id: 'e4', name: 'Laundry', price: 18 }
  ]
};

// Round money to 2 decimals (cents), e.g. 25.499999 -> 25.5
function roundMoney(amount) {
  return Math.round(amount * 100) / 100;
}

// True if "value" is a number from 0 to max (no text, no NaN)
function isAmount(value, max) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= max;
}

function isName(value) {
  return typeof value === 'string' && value.trim().length >= 2 && value.trim().length <= 60;
}

// Checks a price list sent by a company from its dashboard.
// Returns { error: 'message' } if something is wrong,
// or { prices: {...} } with a clean copy that is safe to save.
// The server gives the ids (s1, s2... and e1, e2...), never the browser.
function validatePriceList(input) {
  if (!input || typeof input !== 'object') {
    return { error: 'Please send a price list.' };
  }
  const { services, frequencies, extras } = input;

  if (!Array.isArray(services) || services.length < 1 || services.length > 10) {
    return { error: 'Add between 1 and 10 services.' };
  }
  for (const service of services) {
    if (!service || !isName(service.name)) {
      return { error: 'Every service needs a name (2 to 60 characters).' };
    }
    if (!isAmount(service.basePrice, 10000) || !isAmount(service.pricePerRoom, 10000)) {
      return { error: `"${service.name.trim()}": prices must be numbers from 0 to 10000.` };
    }
  }

  if (!Array.isArray(frequencies) || frequencies.length !== FREQUENCY_NAMES.length) {
    return { error: 'Please send a discount for every frequency.' };
  }
  for (const frequency of frequencies) {
    if (!frequency || !isAmount(frequency.discount, 0.5)) {
      return { error: 'Discounts must be from 0% to 50%.' };
    }
  }

  const extraList = extras === undefined ? [] : extras;
  if (!Array.isArray(extraList) || extraList.length > 10) {
    return { error: 'You can add up to 10 extras.' };
  }
  for (const extra of extraList) {
    if (!extra || !isName(extra.name)) {
      return { error: 'Every extra needs a name (2 to 60 characters).' };
    }
    if (!isAmount(extra.price, 10000)) {
      return { error: `"${extra.name.trim()}": the price must be a number from 0 to 10000.` };
    }
  }

  return {
    prices: {
      currency: 'EUR',
      rooms: ROOM_LIMITS,
      services: services.map((s, i) => ({
        id: `s${i + 1}`, name: s.name.trim(), basePrice: roundMoney(s.basePrice), pricePerRoom: roundMoney(s.pricePerRoom)
      })),
      // the order is always One-time, Monthly, Bi-weekly, Weekly
      frequencies: FREQUENCY_NAMES.map((f, i) => ({
        id: f.id, name: f.name, discount: Math.round(frequencies[i].discount * 1000) / 1000
      })),
      extras: extraList.map((e, i) => ({ id: `e${i + 1}`, name: e.name.trim(), price: roundMoney(e.price) }))
    }
  };
}

// The lowest possible price (1 room, no extras, no discount): "From €55"
function startingPrice(prices) {
  return Math.min(...prices.services.map((s) => s.basePrice + s.pricePerRoom));
}

// Checks the customer's choices BEFORE calculating.
// Returns an error message (text) if something is wrong, or null if all is fine.
function validateChoices(choices, prices) {
  if (!choices || typeof choices !== 'object') {
    return 'Please send your choices.';
  }

  const service = prices.services.find((s) => s.id === choices.service);
  if (!service) {
    return 'Please choose a type of cleaning.';
  }

  // Rooms must be a whole number inside the allowed range (1 to 10)
  const rooms = Number(choices.rooms);
  const { min, max } = prices.rooms;
  if (choices.rooms === '' || choices.rooms === null || !Number.isInteger(rooms) || rooms < min || rooms > max) {
    return `Number of rooms must be a whole number from ${min} to ${max}.`;
  }

  const frequency = prices.frequencies.find((f) => f.id === choices.frequency);
  if (!frequency) {
    return 'Please choose how often you want the cleaning.';
  }

  // Extras are optional, but if they are sent they must be a list of known ids
  if (choices.extras !== undefined) {
    if (!Array.isArray(choices.extras)) {
      return 'Extras must be a list.';
    }
    const unknown = choices.extras.find((id) => !prices.extras.some((e) => e.id === id));
    if (unknown !== undefined) {
      return `Unknown extra: ${unknown}.`;
    }
  }

  return null; // no problems found
}

// Works out the price for one quote, using one company's price list.
// Always call validateChoices() first, so the choices are known to be correct.
// "choices" looks like: { service: 's2', rooms: 3, frequency: 'weekly', extras: ['e3'] }
function calculateQuote(choices, prices) {
  // 1. Look up the chosen items in the price list by their id
  const service = prices.services.find((s) => s.id === choices.service);
  const frequency = prices.frequencies.find((f) => f.id === choices.frequency);
  const rooms = Number(choices.rooms);
  const chosenExtras = prices.extras.filter((e) => (choices.extras || []).includes(e.id));

  // 2. Build the bill, one line at a time
  const lines = [];
  lines.push({ label: `${service.name} (base price)`, amount: service.basePrice });
  const roomWord = rooms === 1 ? 'room' : 'rooms';
  lines.push({ label: `${rooms} ${roomWord} × €${service.pricePerRoom}`, amount: roundMoney(rooms * service.pricePerRoom) });
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
    currency: prices.currency,
    service: service.name,
    rooms: rooms,
    frequency: frequency.name,
    extras: chosenExtras.map((e) => e.name),
    lines: lines,
    subtotal: roundMoney(subtotal),
    discountPercent: roundMoney(frequency.discount * 100),
    discount: discount,
    total: total
  };
}

module.exports = { DEFAULT_PRICES, validatePriceList, startingPrice, validateChoices, calculateQuote };
