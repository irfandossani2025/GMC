import { z } from 'zod';
const singleLine = z.string().trim().max(254).regex(/^[^\r\n\0]*$/, 'Use a single line.');
export const emailSettingsSchema = z.object({
  host: singleLine.min(3).refine(value => /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(value), 'Enter the SMTP server hostname.'),
  port: z.number().int().refine(value => [465, 587, 2525].includes(value), 'Use SMTP port 465, 587 or 2525.'),
  security: z.enum(['TLS', 'STARTTLS']),
  username: singleLine.min(1),
  fromName: singleLine.min(1).max(100),
  fromEmail: singleLine.email('Enter a valid sender email address.'),
  replyTo: z.union([singleLine.email('Enter a valid reply-to email address.'), z.literal('')]).default(''),
  password: z.string().max(1024).optional(),
  removePassword: z.boolean().optional(),
  revision: z.string().nullable(),
}).superRefine((value, context) => {
  if ((value.port === 465) !== (value.security === 'TLS')) context.addIssue({code: 'custom', path: ['security'], message: 'Use TLS for port 465, or STARTTLS for ports 587 and 2525.'});
});
export type EmailConfiguration = Omit<z.infer<typeof emailSettingsSchema>, 'password' | 'removePassword' | 'revision'>;
export interface StoredEmailSettings extends EmailConfiguration { encryptedPassword?: string; lastVerifiedAt?: string; lastTestSentAt?: string; }
export const EMAIL_SETTINGS_KEY = 'outgoing_email_v1';
export function withoutSecret(settings: StoredEmailSettings | null, revision: string | null) {
  return { host: settings?.host || '', port: settings?.port || 587, security: settings?.security || 'STARTTLS', username: settings?.username || '', fromName: settings?.fromName || 'Grand Medical Care', fromEmail: settings?.fromEmail || '', replyTo: settings?.replyTo || '', hasPassword: !!settings?.encryptedPassword, lastVerifiedAt: settings?.lastVerifiedAt || null, lastTestSentAt: settings?.lastTestSentAt || null, revision };
}
