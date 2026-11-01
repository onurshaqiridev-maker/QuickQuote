/** Starting data used by the seed script. */
export interface CategorySeed {
  name: string;
  slug: string;
  description: string;
  icon: string;
  sortOrder: number;
}

export interface PlanSeed {
  code: string;
  name: string;
  description: string;
  priceCents: number;
  maxServices: number | null;
  maxPhotos: number;
  isFeatured: boolean;
  sortOrder: number;
}

export interface SeedAdmin {
  email: string;
  password: string;
  fullName: string;
}

export interface SeedSummary {
  categoriesCreated: number;
  plansCreated: number;
  adminCreated: boolean;
}
