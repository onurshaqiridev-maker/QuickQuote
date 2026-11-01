/** Data needed to create a business together with its (unpublished) profile. */
export interface NewBusiness {
  ownerUserId: string;
  timezone: string;
}

export interface NewBusinessProfile {
  businessId: string;
  slug: string;
  displayName: string;
  city: string;
}
