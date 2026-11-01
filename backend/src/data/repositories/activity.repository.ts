import type { NewActivity } from '../../models/dto/activity.dto';
import { pool, type Queryable } from '../db';

export async function insert(activity: NewActivity, db: Queryable = pool): Promise<void> {
  await db.query(
    `INSERT INTO activity_logs (actor_user_id, action, entity_type, entity_id, metadata)
     VALUES ($1, $2, $3, $4, $5)`,
    [activity.actorUserId, activity.action, activity.entityType, activity.entityId, activity.metadata ?? {}],
  );
}
