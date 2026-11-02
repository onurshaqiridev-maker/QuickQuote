/** Everything an admin can set on a category (the slug is already worked out). */
export interface CategoryFields {
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  sortOrder: number;
  isActive: boolean;
}
