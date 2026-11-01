/** Demo businesses and customers for development (npm run seed:demo). Fictional data. */
import type { DemoBusinessSpec, DemoCustomerSpec } from '../../src/models/dto/demo.dto';
import { gradientPng } from '../demo-images';

const WEEKDAYS = [1, 2, 3, 4, 5];
const logo = (a: [number, number, number], b: [number, number, number]) => gradientPng(240, 240, a, b);
const photo = (a: [number, number, number], b: [number, number, number]) => gradientPng(800, 600, a, b);

export const DEMO_PASSWORD = 'QuickQuote2026';

export const demoCustomers: DemoCustomerSpec[] = [
  { fullName: 'Sara Miller', email: 'sara.demo@example.com' },
  { fullName: 'Jonas Weber', email: 'jonas.demo@example.com' },
  { fullName: 'Elena Rossi', email: 'elena.demo@example.com' },
];

export const demoBusinesses: DemoBusinessSpec[] = [
  {
    ownerName: 'Lena Novak', ownerEmail: 'bella.demo@example.com', name: 'Bella Hair Studio',
    description: 'Modern cuts, colouring and styling in the heart of Berlin. Our friendly team takes time for a proper consultation, uses gentle products and always has good coffee ready.',
    city: 'Berlin', addressLine: 'Torstrasse 112', postalCode: '10119', country: 'DE', phone: '+49 30 5550101', website: 'https://bellahair.example',
    categorySlugs: ['beauty-wellness'], approved: true,
    services: [
      { name: "Women's haircut", description: 'Wash, cut and styling', priceType: 'fixed', priceCents: 4500, durationMinutes: 60, isBookable: true },
      { name: "Men's haircut", description: 'Cut and wash', priceType: 'fixed', priceCents: 2500, durationMinutes: 30, isBookable: true },
      { name: 'Balayage colouring', description: 'Natural, hand-painted highlights', priceType: 'starting_from', priceCents: 8950, durationMinutes: 150, isBookable: true },
      { name: 'Bridal hair', description: 'Trial and wedding-day styling', priceType: 'on_request', priceCents: null, durationMinutes: null, isBookable: false },
    ],
    hours: [{ days: [2, 3, 4, 5], startTime: '09:00', endTime: '18:00' }, { days: [6], startTime: '10:00', endTime: '15:00' }],
    logo: logo([236, 72, 153], [147, 51, 234]),
    photos: [{ image: photo([251, 191, 36], [236, 72, 153]), caption: 'Our salon' }, { image: photo([244, 114, 182], [168, 85, 247]), caption: 'Colour work' }],
  },
  {
    ownerName: 'Markus Brandt', ownerEmail: 'plumbing.demo@example.com', name: 'Quick Fix Plumbing',
    description: 'Fast and reliable plumbing for homes and offices in Munich: leaks, boilers, bathrooms and emergencies. Fixed prices for standard jobs, free quotes for bigger projects.',
    city: 'Munich', addressLine: 'Landsberger Strasse 45', postalCode: '80339', country: 'DE', phone: '+49 89 5550202', website: null,
    categorySlugs: ['home-services', 'construction-renovation'], approved: true,
    services: [
      { name: 'Leak repair', priceType: 'fixed', priceCents: 6000, durationMinutes: 60, isBookable: true },
      { name: 'Boiler service', priceType: 'fixed', priceCents: 9500, durationMinutes: 90, isBookable: true },
      { name: 'New bathroom installation', description: 'Planning and full installation', priceType: 'on_request', priceCents: null, durationMinutes: null, isBookable: false },
    ],
    hours: [{ days: WEEKDAYS, startTime: '07:30', endTime: '17:00' }],
    logo: logo([14, 165, 233], [37, 99, 235]),
    photos: [{ image: photo([56, 189, 248], [30, 64, 175]), caption: 'Our van is ready' }],
  },
  {
    ownerName: 'Aylin Kaya', ownerEmail: 'sparkle.demo@example.com', name: 'Sparkle Home Cleaning',
    description: 'Spotless homes without the stress. Regular cleaning, deep cleaning before you move, and windows that shine. All cleaners are trained and insured.',
    city: 'Berlin', addressLine: 'Karl-Marx-Strasse 80', postalCode: '12043', country: 'DE', phone: '+49 30 5550303', website: 'https://sparkle.example',
    categorySlugs: ['cleaning'], approved: true,
    services: [
      { name: 'Standard cleaning (3 hours)', priceType: 'fixed', priceCents: 7500, durationMinutes: 180, isBookable: true },
      { name: 'Deep cleaning', priceType: 'starting_from', priceCents: 14000, durationMinutes: 240, isBookable: true },
      { name: 'Window cleaning', priceType: 'fixed', priceCents: 4500, durationMinutes: 60, isBookable: true },
    ],
    hours: [{ days: [1, 2, 3, 4, 5, 6], startTime: '08:00', endTime: '19:00' }],
    logo: logo([16, 185, 129], [20, 184, 166]),
    photos: [{ image: photo([110, 231, 183], [14, 165, 233]), caption: 'Fresh and clean' }, { image: photo([167, 243, 208], [45, 212, 191]), caption: 'Kitchen deep clean' }],
  },
  {
    ownerName: 'Tom Fischer', ownerEmail: 'lens.demo@example.com', name: 'Lens and Light Photography',
    description: 'Portraits, weddings and product photos with a natural, warm style. Studio sessions in Hamburg or on location wherever you like.',
    city: 'Hamburg', addressLine: 'Schanzenstrasse 21', postalCode: '20357', country: 'DE', phone: '+49 40 5550404', website: 'https://lensandlight.example',
    categorySlugs: ['photography-video', 'events-catering'], approved: true,
    services: [
      { name: 'Portrait session', description: '1 hour, 10 edited photos', priceType: 'fixed', priceCents: 12000, durationMinutes: 60, isBookable: true },
      { name: 'Wedding photography', priceType: 'on_request', priceCents: null, durationMinutes: null, isBookable: false },
      { name: 'Product photos', priceType: 'starting_from', priceCents: 20000, durationMinutes: null, isBookable: false },
    ],
    hours: [{ days: [2, 3, 4, 5, 6], startTime: '10:00', endTime: '18:00' }],
    logo: logo([249, 115, 22], [234, 179, 8]),
    photos: [{ image: photo([253, 186, 116], [244, 63, 94]), caption: 'Golden hour portrait' }, { image: photo([252, 211, 77], [249, 115, 22]), caption: 'In the studio' }],
  },
  {
    ownerName: 'Nina Schulz', ownerEmail: 'fitlab.demo@example.com', name: 'FitLab Personal Training',
    description: 'One-to-one training that fits your life. Strength, mobility and weight-loss programmes, in our small studio or outdoors in the park.',
    city: 'Berlin', addressLine: 'Kastanienallee 5', postalCode: '10435', country: 'DE', phone: '+49 30 5550505', website: null,
    categorySlugs: ['fitness-sports'], approved: true,
    services: [
      { name: 'Personal training session', priceType: 'fixed', priceCents: 5500, durationMinutes: 60, isBookable: true },
      { name: 'Free intro session', description: 'Get to know us, no obligation', priceType: 'fixed', priceCents: 0, durationMinutes: 30, isBookable: true },
    ],
    hours: [{ days: WEEKDAYS, startTime: '06:30', endTime: '11:00' }, { days: WEEKDAYS, startTime: '16:00', endTime: '21:00' }],
    logo: logo([239, 68, 68], [249, 115, 22]),
    photos: [{ image: photo([248, 113, 113], [251, 146, 60]), caption: 'Our studio' }],
  },
  {
    ownerName: 'Stefan Wolf', ownerEmail: 'autocare.demo@example.com', name: 'AutoCare Werkstatt',
    description: 'Honest car repairs and servicing for all makes. Clear prices before we start, and your car back the same day for most jobs.',
    city: 'Munich', addressLine: 'Rosenheimer Strasse 140', postalCode: '81669', country: 'DE', phone: '+49 89 5550606', website: 'https://autocare.example',
    categorySlugs: ['automotive'], approved: true,
    services: [
      { name: 'Oil change', priceType: 'fixed', priceCents: 7900, durationMinutes: 45, isBookable: true },
      { name: 'Brake check', priceType: 'fixed', priceCents: 4900, durationMinutes: 30, isBookable: true },
      { name: 'Tyre change', priceType: 'fixed', priceCents: 4000, durationMinutes: 45, isBookable: true },
    ],
    hours: [{ days: WEEKDAYS, startTime: '08:00', endTime: '17:30' }],
    logo: logo([71, 85, 105], [15, 23, 42]),
    photos: [{ image: photo([148, 163, 184], [51, 65, 85]), caption: 'The workshop' }],
  },
  {
    ownerName: 'Anna Berger', ownerEmail: 'tutoring.demo@example.com', name: 'Bright Minds Tutoring',
    description: 'Patient, experienced tutors for school pupils and adults. Maths, English and German, online or at our learning centre in Hamburg.',
    city: 'Hamburg', addressLine: 'Grindelallee 33', postalCode: '20146', country: 'DE', phone: '+49 40 5550707', website: null,
    categorySlugs: ['education-tutoring'], approved: true,
    services: [
      { name: 'Maths tutoring', priceType: 'fixed', priceCents: 3500, durationMinutes: 60, isBookable: true },
      { name: 'English lesson', priceType: 'fixed', priceCents: 3000, durationMinutes: 60, isBookable: true },
      { name: 'Exam preparation', priceType: 'starting_from', priceCents: 4000, durationMinutes: 90, isBookable: true },
    ],
    hours: [{ days: WEEKDAYS, startTime: '14:00', endTime: '20:00' }, { days: [6], startTime: '09:00', endTime: '13:00' }],
    logo: logo([99, 102, 241], [59, 130, 246]),
    photos: [{ image: photo([165, 180, 252], [99, 102, 241]), caption: 'Learning centre' }],
  },
  {
    ownerName: 'David Klein', ownerEmail: 'pixel.demo@example.com', name: 'Pixel Studio Web Design',
    description: 'Websites and logos for small businesses: clear, fast and easy to update yourself. Tell us about your project and get a fixed-price quote.',
    city: 'Cologne', addressLine: 'Ehrenstrasse 50', postalCode: '50672', country: 'DE', phone: '+49 221 5550808', website: 'https://pixelstudio.example',
    categorySlugs: ['it-digital-services'], approved: true,
    services: [
      { name: 'Website check-up call', priceType: 'fixed', priceCents: 9000, durationMinutes: 60, isBookable: true },
      { name: 'Small business website', priceType: 'starting_from', priceCents: 90000, durationMinutes: null, isBookable: false },
      { name: 'Logo design', priceType: 'starting_from', priceCents: 25000, durationMinutes: null, isBookable: false },
    ],
    hours: [{ days: WEEKDAYS, startTime: '09:00', endTime: '17:00' }],
    logo: logo([168, 85, 247], [59, 130, 246]),
    photos: [{ image: photo([196, 181, 253], [96, 165, 250]), caption: 'Recent projects' }],
  },
  {
    ownerName: 'Jan Hofmann', ownerEmail: 'garden.demo@example.com', name: 'Green Garden Services',
    description: 'Garden care, hedge trimming and new garden design. (Demo: this business waits for admin approval.)',
    city: 'Hamburg', addressLine: 'Elbchaussee 200', postalCode: '22605', country: 'DE', phone: '+49 40 5550909', website: null,
    categorySlugs: ['home-services'], approved: false,
    services: [{ name: 'Hedge trimming', priceType: 'starting_from', priceCents: 6000, durationMinutes: 120, isBookable: true }],
    hours: [{ days: WEEKDAYS, startTime: '08:00', endTime: '16:00' }],
    logo: logo([34, 197, 94], [21, 128, 61]),
    photos: [],
  },
];
