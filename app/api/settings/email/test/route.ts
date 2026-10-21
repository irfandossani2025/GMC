import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { emailSettingsAccess } from '@/lib/email/access';
import { EMAIL_SETTINGS_KEY, StoredEmailSettings, withoutSecret } from '@/lib/email/schema';
import { runEmailCheck, safeEmailError } from '@/lib/email/delivery';
export const dynamic = 'force-dynamic';
const schema = z.object({action: z.enum(['verify','send']), recipient: z.string().trim().email().max(254).optional(), revision: z.string()});
export async function POST(request: NextRequest) {
  const access = await emailSettingsAccess(request, true);
  if (access.error) return access.error;
  try {
    const data = schema.parse(await request.json());
    if (data.action === 'send' && !data.recipient) return NextResponse.json({error: 'Enter a test recipient email address.'}, {status: 400});
    const row = await db.settings.findUnique({where: {key: EMAIL_SETTINGS_KEY}});
    if (!row) return NextResponse.json({error: 'Save email settings before testing.'}, {status: 400});
    if (row.updatedAt.toISOString() !== data.revision) return NextResponse.json({error: 'Email settings changed in another session. Reload before saving.'}, {status: 409});
    const settings: StoredEmailSettings = JSON.parse(row.value);
    const attempts = await db.auditLog.count({where: {userId: access.actor.id, action: 'EMAIL_TEST_ATTEMPT', createdAt: {gte: new Date(Date.now() - 60000)}}});
    if (attempts >= 3) return NextResponse.json({error: 'Please wait one minute before testing email again.'}, {status: 429});
    await db.auditLog.create({data: {action: 'EMAIL_TEST_ATTEMPT', entityType: 'Settings', entityId: row.id, userId: access.actor.id, changes: JSON.stringify({action: data.action})}});
    try { await runEmailCheck(settings, data.action === 'send' ? data.recipient : undefined); }
    catch (error) { return NextResponse.json({error: safeEmailError(error)}, {status: 400}); }
    const updated: StoredEmailSettings = {...settings, lastVerifiedAt: new Date().toISOString(), ...(data.action === 'send' ? {lastTestSentAt: new Date().toISOString()} : {})};
    await db.settings.updateMany({where: {key: EMAIL_SETTINGS_KEY, value: row.value}, data: {value: JSON.stringify(updated)}});
    const latest = await db.settings.findUnique({where: {key: EMAIL_SETTINGS_KEY}});
    return NextResponse.json({message: data.action === 'send' ? 'Test email accepted by the SMTP server. Check the inbox and spam folder.' : 'SMTP connection and authentication verified.', settings: withoutSecret(latest ? JSON.parse(latest.value) : null, latest?.updatedAt.toISOString() || null)}, {headers: {'Cache-Control': 'no-store'}});
  } catch (error) {
    return NextResponse.json({error: error instanceof z.ZodError ? 'Check the email test details.' : 'Email test could not be completed.'}, {status: 400});
  }
}
