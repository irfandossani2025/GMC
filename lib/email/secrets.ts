import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { mkdir, open, readFile } from 'fs/promises';
import path from 'path';
async function encryptionKey(): Promise<Buffer> {
  const configured = process.env.EMAIL_SETTINGS_ENCRYPTION_KEY;
  if (configured) {
    if (!/^[a-f0-9]{64}$/i.test(configured)) throw new Error('Email encryption key is invalid.');
    return Buffer.from(configured, 'hex');
  }
  const directory = path.join(process.cwd(), '.private');
  await mkdir(directory, {recursive: true, mode: 0o700});
  const filename = path.join(directory, 'email-settings.key');
  try {
    const file = await open(filename, 'wx', 0o600);
    try { await file.writeFile(randomBytes(32)); } finally { await file.close(); }
  } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; }
  const key = await readFile(filename);
  if (key.length !== 32) throw new Error('Email encryption key is invalid.');
  return key;
}
export async function encryptEmailPassword(password: string): Promise<string> {
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', await encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(password, 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64'), cipher.getAuthTag().toString('base64'), encrypted.toString('base64')].join('.');
}
export async function decryptEmailPassword(value: string): Promise<string> {
  const [version, iv, tag, encrypted, extra] = value.split('.');
  if (version !== 'v1' || !iv || !tag || !encrypted || extra) throw new Error('Saved email password cannot be read.');
  const decipher = createDecipheriv('aes-256-gcm', await encryptionKey(), Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(encrypted, 'base64')), decipher.final()]).toString('utf8');
}
