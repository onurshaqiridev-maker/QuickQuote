/** One row of the `working_hours` table. Times are local to the business, "HH:MM". */
export interface WorkingHoursRange {
  id: string;
  businessId: string;
  /** 1 = Monday ... 7 = Sunday */
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

/** One row of the `blocked_times` table. */
export interface BlockedTime {
  id: string;
  businessId: string;
  startsAt: Date;
  endsAt: Date;
  reason: string | null;
  createdAt: Date;
}
