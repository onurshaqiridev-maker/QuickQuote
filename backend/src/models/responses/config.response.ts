/** Public platform settings the website needs to know about. */
export interface PlatformConfigResponse {
  /** false = free launch: businesses list for free, no payment step. */
  subscriptionsRequired: boolean;
}
