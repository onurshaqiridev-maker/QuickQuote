/**
 * Hourly housekeeping, run by the worker (docs/ARCHITECTURE.md section 7).
 *  - Confirmed appointments that ended more than 12 hours ago become "completed".
 *  - Pending requests nobody answered before the start time are cancelled, and the customer is told.
 */
import { env } from '../config/env';
import { logger } from '../config/logger';
import { withTransaction } from '../data/db';
import * as reservationRepository from '../data/repositories/reservation.repository';
import { logActivity } from './activity.service';
import { enqueueEmail } from './email/email-queue.service';
import { formatWhen } from './reservation.service';

const COMPLETE_AFTER_HOURS = 12;

export async function runReservationMaintenance(): Promise<{ completed: number; expired: number }> {
  const completed = await reservationRepository.completeFinished(COMPLETE_AFTER_HOURS);

  let expired = 0;
  for (const id of await reservationRepository.findUnansweredPast()) {
    const details = await reservationRepository.findDetailsById(id);
    if (!details) continue;
    await withTransaction(async (tx) => {
      const message = 'The business did not answer before the appointment time.';
      const updated = await reservationRepository.changeStatus(id, { to: 'cancelled', from: ['pending'], message, cancelledBy: 'system' }, tx);
      if (!updated) return; // answered in the meantime
      await enqueueEmail(
        {
          to: details.customerEmail,
          template: 'reservation_cancelled_customer',
          payload: {
            businessName: details.businessName,
            serviceName: details.serviceName,
            when: formatWhen(details.startsAt, details.businessTimezone),
            price: '',
            customerName: details.customerName,
            message,
            cancelledBy: 'system',
            profileUrl: new URL(`/businesses/${details.businessSlug}`, env.FRONTEND_URL).toString(),
          },
        },
        tx,
      );
      await logActivity({ actorUserId: null, action: 'reservation.expired', entityType: 'reservation', entityId: id }, tx);
      expired += 1;
    });
  }
  return { completed, expired };
}

/** Starts the hourly maintenance loop (and runs once right away). */
export function startMaintenance(intervalMs = 60 * 60 * 1000) {
  let running: Promise<void> | null = null;
  const tick = () => {
    if (running) return;
    running = runReservationMaintenance()
      .then((result) => {
        if (result.completed || result.expired) logger.info(result, 'Reservation maintenance finished');
      })
      .catch((error: unknown) => logger.error({ err: error }, 'Reservation maintenance failed'))
      .finally(() => {
        running = null;
      });
  };
  const timer = setInterval(tick, intervalMs);
  tick();
  return {
    async stop() {
      clearInterval(timer);
      if (running) await running;
    },
  };
}
