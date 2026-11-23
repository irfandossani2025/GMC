import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { emailSettingsAccess as superAdminAccess } from '@/lib/email/access';
import { decryptEmailPassword } from '@/lib/email/secrets';
import { publicWhatsAppSettings, readStoredWhatsAppSettings, saveStoredWhatsAppSettings } from '@/lib/whatsapp-cloud/settings';
import { sendTemplate, verifyPhoneNumber, WhatsAppApiError } from '@/lib/whatsapp-cloud/client';
import { clinicDateLabel } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

const schema = z.object({
  action: z.enum(['verify', 'send']),
  recipient: z.string().trim().regex(/^\+?[\d\s-]{8,20}$/, 'Enter the test phone number with country code, e.g. +968 9123 4567.').optional(),
  template: z.enum(['hello_world', 'session']).default('hello_world'),
});

/**
 * Super Admin checks:
 *  - verify: confirms the token and Phone Number ID with Meta
 *  - send: sends a test message to a number the Super Admin controls
 */
export async function POST(request: NextRequest) {
  const access = await superAdminAccess(request, true);
  if (access.error) return access.error;
  try {
    const { action, recipient, template } = schema.parse(await request.json());
    const { settings } = await readStoredWhatsAppSettings();
    if (!settings?.encryptedAccessToken || !settings.phoneNumberId) {
      return NextResponse.json({ error: 'Save the access token and Phone Number ID first.' }, { status: 400 });
    }
    const config = { accessToken: await decryptEmailPassword(settings.encryptedAccessToken), phoneNumberId: settings.phoneNumberId, apiVersion: settings.apiVersion };

    if (action === 'verify') {
      const info = await verifyPhoneNumber(config);
      const updated = { ...settings, lastVerifiedAt: new Date().toISOString(), verifiedNumber: info.display_phone_number || '', verifiedName: info.verified_name || '' };
      const row = await saveStoredWhatsAppSettings(updated);
      return NextResponse.json({
        settings: publicWhatsAppSettings(updated, row.updatedAt.toISOString()),
        message: `Connected to ${info.verified_name || 'the clinic number'} (${info.display_phone_number || settings.phoneNumberId}).`,
      });
    }

    if (!recipient) return NextResponse.json({ error: 'Enter the test phone number.' }, { status: 400 });
    if (template === 'hello_world') {
      await sendTemplate(config, { to: recipient, name: 'hello_world', language: 'en_US' });
    } else {
      await sendTemplate(config, {
        to: recipient,
        name: settings.sessionTemplateName,
        language: settings.sessionTemplateLanguage,
        bodyValues: ['Test Patient', 'Test Treatment', clinicDateLabel(), '1', '6', '5'],
      });
    }
    const updated = { ...settings, lastTestSentAt: new Date().toISOString() };
    const row = await saveStoredWhatsAppSettings(updated);
    return NextResponse.json({ settings: publicWhatsAppSettings(updated, row.updatedAt.toISOString()), message: 'Meta accepted the test message. Check WhatsApp on the test phone.' });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.errors[0]?.message || 'Check the test details.' }, { status: 400 });
    if (error instanceof WhatsAppApiError) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error('WhatsApp test error:', error);
    return NextResponse.json({ error: 'WhatsApp test could not be completed.' }, { status: 500 });
  }
}
