/** One row of the `activity_logs` table. */
export interface ActivityLog {
  id: string;
  /** null = done by the system (worker) */
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
}
