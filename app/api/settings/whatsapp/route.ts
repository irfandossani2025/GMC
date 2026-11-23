import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { emailSettingsAccess as superAdminAccess } from '@/lib/email/access';
import {
  encryptAccessToken,
  publicWhatsAppSettings,
  readStoredWhatsAppSettings,
  saveStoredWhatsAppSettings,
  StoredWhatsAppSettings,
  whatsappSettingsSchema,
} from '@/lib/whatsapp-cloud/settings';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const access = await superAdminAccess(request);
  if (access.error) return access.error;
  try {
    const { settings, revision } = await readStoredWhatsAppSettings();
    return NextResponse.json({ settings: publicWhatsAppSettings(settings, revision) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'WhatsApp settings could not be loaded.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const access = await superAdminAccess(request, true);
  if (access.error) return access.error;
  try {
    const { accessToken, removeAccessToken, revision, ...configuration } = whatsappSettingsSchema.parse(await request.json());
    const current = await readStoredWhatsAppSettings();
    if (current.revision !== revision) throw new Error('SETTINGS_CONFLICT');
    const previous = current.settings;

    const encryptedAccessToken = removeAccessToken ? undefined : accessToken ? await encryptAccessToken(accessToken) : previous?.encryptedAccessToken;
    if (configuration.enabled && (!encryptedAccessToken || !configuration.phoneNumberId)) {
      throw new Error('To turn WhatsApp on, enter both the access token and the Phone Number ID.');
    }
    const connectionChanged = !!accessToken || !!removeAccessToken || previous?.phoneNumberId !== configuration.phoneNumberId || previous?.apiVersion !== configuration.apiVersion;
    const settings: StoredWhatsAppSettings = {
      ...configuration,
      ...(encryptedAccessToken ? { encryptedAccessToken } : {}),
      ...(configuration.enabled ? { enabledAt: previous?.enabled && previous.enabledAt ? previous.enabledAt : new Date().toISOString() } : {}),
      ...(!connectionChanged && previous?.lastVerifiedAt ? { lastVerifiedAt: previous.lastVerifiedAt, verifiedNumber: previous.verifiedNumber, verifiedName: previous.verifiedName } : {}),
      ...(!connectionChanged && previous?.lastTestSentAt ? { lastTestSentAt: previous.lastTestSentAt } : {}),
    };
    const row = await saveStoredWhatsAppSettings(settings);
    await db.auditLog.create({
      data: {
        action: 'WHATSAPP_SETTINGS_UPDATED',
        entityType: 'Settings',
        entityId: row.id,
        userId: access.actor!.id,
        changes: JSON.stringify({ enabled: configuration.enabled, phoneNumberId: configuration.phoneNumberId, tokenChanged: !!accessToken || !!removeAccessToken }),
      },
    }).catch(() => {});
    return NextResponse.json({ settings: publicWhatsAppSettings(settings, row.updatedAt.toISOString()) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.errors[0]?.message || 'Check the WhatsApp settings.' }, { status: 400 });
    const message = error instanceof Error ? error.message : '';
    if (message === 'SETTINGS_CONFLICT') return NextResponse.json({ error: 'WhatsApp settings changed in another session. Reload before saving.' }, { status: 409 });
    if (message.startsWith('To turn WhatsApp on')) return NextResponse.json({ error: message }, { status: 400 });
    console.error('WhatsApp settings save error:', error);
    return NextResponse.json({ error: 'WhatsApp settings could not be saved.' }, { status: 500 });
  }
}
