import type { PlanSeed } from '../../src/models/dto/seed.dto';

/** Initial pricing (euros, monthly). The admin can change prices later. */
export const plans: PlanSeed[] = [
  {
    code: 'starter',
    name: 'Starter',
    description: 'Everything you need to get found and receive bookings.',
    priceCents: 1900,
    maxServices: 10,
    maxPhotos: 5,
    isFeatured: false,
    sortOrder: 1,
  },
  {
    code: 'professional',
    name: 'Professional',
    description: 'More services and photos for growing businesses.',
    priceCents: 3900,
    maxServices: 30,
    maxPhotos: 20,
    isFeatured: false,
    sortOrder: 2,
  },
  {
    code: 'premium',
    name: 'Premium',
    description: 'Unlimited services, featured on the homepage and first in search.',
    priceCents: 5900,
    maxServices: null,
    maxPhotos: 50,
    isFeatured: true,
    sortOrder: 3,
  },
];
