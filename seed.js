// Adds 3 demo companies and 1 demo customer, so the site isn't empty.
// Run it once with:  npm run seed
// (Online: run it on your computer with DATABASE_URL set to your online database.)
// The demo companies are marked as paid, so customers can see them straight away.
const { query, queryOne } = require('./db');
const { hashPassword } = require('./auth');
const { DEFAULT_PRICES } = require('./prices');

const DEMO_PASSWORD = 'demo-password';

const companies = [
  {
    owner: 'Sparkle Owner', email: 'sparkle@demo.quickquote', name: 'Sparkle Home Cleaning', slug: 'sparkle-home-cleaning',
    city: 'Skopje', description: 'Friendly, reliable home cleaning with eco-friendly products.',
    prices: DEFAULT_PRICES
  },
  {
    owner: 'Fresh Owner', email: 'fresh@demo.quickquote', name: 'Fresh Start Cleaners', slug: 'fresh-start-cleaners',
    city: 'Tetovo', description: 'Move-out and deep cleaning specialists. Same-week appointments.',
    prices: {
      ...DEFAULT_PRICES,
      services: [
        { id: 's1', name: 'Standard clean', basePrice: 35, pricePerRoom: 14 },
        { id: 's2', name: 'Deep clean', basePrice: 65, pricePerRoom: 22 },
        { id: 's3', name: 'Move-out clean', basePrice: 90, pricePerRoom: 28 }
      ]
    }
  },
  {
    owner: 'Shine Owner', email: 'shine@demo.quickquote', name: 'Shine & Co. Office Cleaning', slug: 'shine-and-co',
    city: 'Bitola', description: 'Offices and shops cleaned after hours, weekly or monthly.',
    prices: {
      ...DEFAULT_PRICES,
      services: [
        { id: 's1', name: 'Office clean', basePrice: 60, pricePerRoom: 12 },
        { id: 's2', name: 'Shop clean', basePrice: 50, pricePerRoom: 18 }
      ],
      extras: [
        { id: 'e1', name: 'Carpet shampoo', price: 30 },
        { id: 'e2', name: 'Kitchen area', price: 20 }
      ]
    }
  }
];

async function addUser(role, name, email) {
  const existing = await queryOne('SELECT id FROM users WHERE email = $1', [email]);
  if (existing) {
    return null; // already added on an earlier run
  }
  return queryOne(
    'INSERT INTO users (role, name, email, password_hash, created_at) VALUES ($1, $2, $3, $4, $5) RETURNING id',
    [role, name, email, hashPassword(DEMO_PASSWORD), new Date().toISOString()]
  );
}

async function seed() {
  for (const company of companies) {
    const user = await addUser('company', company.owner, company.email);
    if (user) {
      await query(
        `INSERT INTO companies (user_id, name, slug, city, description, prices, subscription_status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'active', $7)`,
        [user.id, company.name, company.slug, company.city, company.description,
          JSON.stringify(company.prices), new Date().toISOString()]
      );
      console.log(`Added company: ${company.name}`);
    }
  }
  if (await addUser('customer', 'Demo Customer', 'customer@demo.quickquote')) {
    console.log('Added customer: customer@demo.quickquote');
  }
  console.log(`Done. Every demo account uses the password "${DEMO_PASSWORD}".`);
  process.exit(0);
}

seed().catch((error) => {
  console.error('Could not add the demo data:', error);
  process.exit(1);
});
