import { z } from 'zod';
import { emailField, fullNameField } from './common.requests';

export const contactMessageSchema = z.object({
  name: fullNameField,
  email: emailField,
  subject: z
    .string({ error: 'Subject is required.' })
    .trim()
    .min(3, 'Subject must be at least 3 characters.')
    .max(150, 'Subject must be at most 150 characters.'),
  message: z
    .string({ error: 'Message is required.' })
    .trim()
    .min(10, 'Message must be at least 10 characters.')
    .max(5000, 'Message must be at most 5000 characters.'),
});
export type ContactMessageRequest = z.infer<typeof contactMessageSchema>;
