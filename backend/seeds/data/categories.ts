import type { CategorySeed } from '../../src/models/dto/seed.dto';

// `icon` is an icon name; the website draws it with the lucide icon set (see CategoryIcon.tsx).

export const categories: CategorySeed[] = [
  { name: 'Beauty & Wellness', slug: 'beauty-wellness', description: 'Hair, nails, massage, spa and cosmetics', icon: 'scissors', sortOrder: 1 },
  { name: 'Health & Medical', slug: 'health-medical', description: 'Doctors, dentists, physiotherapy and therapy', icon: 'stethoscope', sortOrder: 2 },
  { name: 'Home Services', slug: 'home-services', description: 'Plumbing, electrical work, repairs and handymen', icon: 'wrench', sortOrder: 3 },
  { name: 'Cleaning', slug: 'cleaning', description: 'Home, office and window cleaning', icon: 'sparkles', sortOrder: 4 },
  { name: 'Construction & Renovation', slug: 'construction-renovation', description: 'Building, renovation, painting and flooring', icon: 'hammer', sortOrder: 5 },
  { name: 'Automotive', slug: 'automotive', description: 'Car repair, service, tyres and detailing', icon: 'car', sortOrder: 6 },
  { name: 'Events & Catering', slug: 'events-catering', description: 'Event planning, catering, venues and music', icon: 'party-popper', sortOrder: 7 },
  { name: 'Photography & Video', slug: 'photography-video', description: 'Photographers and videographers', icon: 'camera', sortOrder: 8 },
  { name: 'Education & Tutoring', slug: 'education-tutoring', description: 'Tutoring, language lessons and courses', icon: 'book-open', sortOrder: 9 },
  { name: 'IT & Digital Services', slug: 'it-digital-services', description: 'Web design, IT support and marketing', icon: 'laptop', sortOrder: 10 },
  { name: 'Fitness & Sports', slug: 'fitness-sports', description: 'Personal trainers, gyms and sports classes', icon: 'dumbbell', sortOrder: 11 },
  { name: 'Legal & Financial', slug: 'legal-financial', description: 'Lawyers, accountants and financial advisors', icon: 'scale', sortOrder: 12 },
];
