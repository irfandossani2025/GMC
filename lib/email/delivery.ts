import { lookup } from 'dns/promises';
import { isIP } from 'net';
import { SMTPClient, MessageHeaders } from 'emailjs';
import type { StoredEmailSettings } from './schema';
import { decryptEmailPassword } from './secrets';
export function isPublicMailAddress(address: string): boolean {
  if (isIP(address) === 4) {
    const [a,b] = address.split('.').map(Number);
    return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && [0,168].includes(b)) || (a === 100 && b >= 64 && b <= 127) || (a === 198 && [18,19,51].includes(b)) || (a === 203 && b === 0));
  }
  return isIP(address) === 6 && /^[23]/i.test(address) && !address.toLowerCase().startsWith('2001:db8:');
}
class VerifiedSMTPClient extends SMTPClient {
  constructor(options: ConstructorParameters<typeof SMTPClient>[0]) {
    super(options);
    // emailjs 4 can leave login waiting when EHLO features are already cached.
    // Repeat EHLO on this connection and always complete the continuation.
    this.smtp.ehlo_or_helo_if_needed = callback => {
      this.smtp.ehlo(error => {
        if (error) return callback(error);
        const socket = (this.smtp as unknown as {sock?: {encrypted?: boolean; authorized?: boolean}}).sock;
        if (!socket?.encrypted || !socket.authorized) return callback(new Error('A verified encrypted SMTP connection is required.'));
        callback();
      });
    };
  }
  sendAfterVerification(message: MessageHeaders) {
    // The connection has already completed TLS and authentication. Let the client
    // queue use this verified socket instead of waiting for its own login flow.
    this.ready = true;
    return this.sendAsync(message);
  }
}
export async function runEmailCheck(settings: StoredEmailSettings, recipient?: string): Promise<void> {
  if (!settings.encryptedPassword) throw new Error('Save an SMTP password before testing.');
  const addresses = await lookup(settings.host, {all: true});
  if (!addresses.length || addresses.some(item => !isPublicMailAddress(item.address))) throw new Error('Use a public SMTP server hostname.');
  const address = addresses.find(item => item.family === 4)?.address || addresses[0].address;
  const secureOptions = {servername: settings.host, rejectUnauthorized: true, minVersion: 'TLSv1.2' as const};
  const client = new VerifiedSMTPClient({host: address, port: settings.port, user: settings.username, password: await decryptEmailPassword(settings.encryptedPassword), ssl: settings.security === 'TLS' ? secureOptions : false, tls: settings.security === 'STARTTLS' ? secureOptions : false, timeout: 10000, authentication: ['LOGIN', 'PLAIN'], logger: () => {}});
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {timer = setTimeout(() => { client.smtp.close(true); reject(new Error('Email connection timed out.')); }, 25000);});
  const work = async () => {
    await new Promise<void>((resolve, reject) => client.smtp.connect(error => error ? reject(error) : resolve()));
    await new Promise<void>((resolve, reject) => client.smtp.ehlo(error => error ? reject(error) : resolve()));
    // Never send authentication over an unencrypted or unverified socket.
    const socket = (client.smtp as unknown as {sock?: {encrypted?: boolean; authorized?: boolean}}).sock;
    if (!socket?.encrypted || !socket.authorized) throw new Error('A verified encrypted SMTP connection is required.');
    await new Promise<void>((resolve, reject) => client.smtp.login(error => error ? reject(error) : resolve()));
    if (recipient) {
      await client.sendAfterVerification({from: `${settings.fromName.replace(/[<>"\\]/g, '')} <${settings.fromEmail}>`, to: recipient, ...(settings.replyTo ? {'reply-to': settings.replyTo} : {}), subject: 'Grand Medical Care - email settings test', text: 'This is a test email from the Grand Medical Care membership application. Your outgoing email settings are working. This message contains no patient data.'});
    }
  };
  try { await Promise.race([work(), deadline]); } finally { if (timer) clearTimeout(timer); client.smtp.close(true); }
}
export function safeEmailError(error: unknown): string {
  const message = error instanceof Error ? error.message : '';
  if (/authorization|auth|535|credential/i.test(message)) return 'SMTP authentication failed. Check the username and password or app password.';
  if (/certificate|ssl|tls|encrypted/i.test(message)) return 'The SMTP server could not establish a verified encrypted connection.';
  if (/public SMTP|Save an SMTP/.test(message)) return message;
  return 'Could not connect or send email. Check the SMTP server, port, encryption and provider permissions.';
}
