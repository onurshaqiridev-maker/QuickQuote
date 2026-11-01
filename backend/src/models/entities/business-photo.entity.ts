/** One row of the `business_photos` table. */
export interface BusinessPhoto {
  id: string;
  businessId: string;
  imageUrl: string;
  caption: string | null;
  sortOrder: number;
  createdAt: Date;
}
