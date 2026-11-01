import { env } from '../../../config/env';
import { logger } from '../../../config/logger';
import type { OutgoingEmail, SendResult } from '../../../models/dto/email.dto';
import type { EmailSender } from './email-sender';

/**
 * Development sender: prints the email in the worker's terminal instead of sending it.
 *
 * Testing retries: any recipient ending in "@fail.test" always fails (not in production),
 * so you can watch a job go through all its attempts and end up "failed".
 */
export const consoleSender: EmailSender = {
  name: 'console',
  async send(email: OutgoingEmail): Promise<SendResult> {
    if (env.NODE_ENV !== 'production' && email.to.endsWith('@fail.test')) {
      throw new Error(`Simulated failure: "${email.to}" ends with @fail.test`);
    }
    logger.info(
      { to: email.to, subject: email.subject },
      `\n----- EMAIL (console driver, not really sent) -----\nTo: ${email.to}\nSubject: ${email.subject}\n\n${email.text}\n---------------------------------------------------`,
    );
    return { providerMessageId: null };
  },
};
