import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { emailSettingsAccess } from '@/lib/email/access';
import { emailSettingsSchema, EMAIL_SETTINGS_KEY, StoredEmailSettings, withoutSecret } from '@/lib/email/schema';
import { encryptEmailPassword } from '@/lib/email/secrets';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  const access = await emailSettingsAccess(request);
  if (access.error) return access.error;
  try {
    const row = await db.settings.findUnique({where: {key: EMAIL_SETTINGS_KEY}});
    return NextResponse.json({settings: withoutSecret(row ? JSON.parse(row.value) : null, row?.updatedAt.toISOString() || null), testRecipient: access.actor.email}, {headers: {'Cache-Control': 'no-store'}});
  } catch { return NextResponse.json({error: 'Email settings could not be loaded.'}, {status: 500}); }
}
export async function POST(request: NextRequest) {
  const access = await emailSettingsAccess(request, true);
  if (access.error) return access.error;
  try {
    const {password, removePassword, revision, ...configuration} = emailSettingsSchema.parse(await request.json());
    const result = await db.$transaction(async tx => {
      const existing = await tx.settings.findUnique({where: {key: EMAIL_SETTINGS_KEY}});
      if ((existing?.updatedAt.toISOString() || null) !== revision) throw new Error('SETTINGS_CONFLICT');
      const previous: StoredEmailSettings | null = existing ? JSON.parse(existing.value) : null;
      if (previous?.encryptedPassword && (previous.host !== configuration.host || previous.username !== configuration.username) && !password && !removePassword) throw new Error('Re-enter the SMTP password when changing the server or username.');
      const encryptedPassword = removePassword ? undefined : password ? await encryptEmailPassword(password) : previous?.encryptedPassword;
      if (!encryptedPassword && !removePassword) throw new Error('Enter the SMTP password.');
      const settings: StoredEmailSettings = {...configuration, ...(encryptedPassword ? {encryptedPassword} : {})};
      const row = await tx.settings.upsert({where: {key: EMAIL_SETTINGS_KEY}, create: {key: EMAIL_SETTINGS_KEY, value: JSON.stringify(settings)}, update: {value: JSON.stringify(settings)}});
      await tx.auditLog.create({data: {action: 'EMAIL_SETTINGS_UPDATED', entityType: 'Settings', entityId: row.id, userId: access.actor.id, changes: JSON.stringify({host: configuration.host, port: configuration.port, security: configuration.security, passwordChanged: !!password || !!removePassword})}});
      return withoutSecret(settings, row.updatedAt.toISOString());
    }, {isolationLevel: 'Serializable'});
    return NextResponse.json({settings: result}, {headers: {'Cache-Control': 'no-store'}});
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({error: error.errors[0]?.message || 'Check the email settings.'}, {status: 400});
    const message = error instanceof Error ? error.message : '';
    if (message === 'SETTINGS_CONFLICT' || ['P2034','P2002'].includes((error as {code?: string}).code || '')) return NextResponse.json({error: 'Email settings changed in another session. Reload before saving.'}, {status: 409});
    if (['Enter the SMTP password.', 'Re-enter the SMTP password when changing the server or username.'].includes(message)) return NextResponse.json({error: message}, {status: 400});
    return NextResponse.json({error: 'Email settings could not be saved.'}, {status: 500});
  }
}
