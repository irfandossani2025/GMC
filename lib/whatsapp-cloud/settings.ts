import { z } from 'zod';
import { db } from '@/lib/db';
import { decryptEmailPassword, encryptEmailPassword } from '@/lib/email/secrets';

/**
 * Meta WhatsApp Cloud API settings, saved by the Super Admin on the
 * WhatsApp settings page. The access token is stored encrypted and is never
 * shown again after saving.
 */
export const WHATSAPP_SETTINGS_KEY = 'whatsapp_cloud_v1';

export const DEFAULT_TEMPLATES = {
  card: { name: 'gmc_membership_card', language: 'en' },
  session: { name: 'gmc_session_recorded', language: 'en' },
};

const templateName = z.string().trim().min(1, 'Enter the template name.').max(512).regex(/^[a-z0-9_]+$/, 'Template names use lowercase letters, numbers and underscores only.');
const languageCode = z.string().trim().min(2).max(10).regex(/^[a-z]{2,3}(_[A-Z]{2})?$/, 'Use a language code such as en or en_US.');

export const whatsappSettingsSchema = z.object({
  enabled: z.boolean(),
  phoneNumberId: z.union([z.string().trim().regex(/^\d{6,30}$/, 'The Phone Number ID is a long number from Meta (digits only).'), z.literal('')]),
  businessAccountId: z.union([z.string().trim().regex(/^\d{6,30}$/, 'The WhatsApp Business Account ID is digits only.'), z.literal('')]).default(''),
  apiVersion: z.string().trim().regex(/^v\d{2}\.\d$/, 'Use a Graph API version such as v21.0.').default('v21.0'),
  sendCardOnIssue: z.boolean().default(true),
  sendSessionConfirmation: z.boolean().default(true),
  cardTemplateName: templateName.default(DEFAULT_TEMPLATES.card.name),
  cardTemplateLanguage: languageCode.default(DEFAULT_TEMPLATES.card.language),
  sessionTemplateName: templateName.default(DEFAULT_TEMPLATES.session.name),
  sessionTemplateLanguage: languageCode.default(DEFAULT_TEMPLATES.session.language),
  accessToken: z.string().trim().max(4096).regex(/^[^\s]*$/, 'Paste the access token without spaces.').optional(),
  removeAccessToken: z.boolean().optional(),
  revision: z.string().nullable(),
});

export type WhatsAppConfiguration = Omit<z.infer<typeof whatsappSettingsSchema>, 'accessToken' | 'removeAccessToken' | 'revision'>;
export interface StoredWhatsAppSettings extends WhatsAppConfiguration {
  encryptedAccessToken?: string;
  /** When WhatsApp was switched on; cards issued before this are never auto-sent. */
  enabledAt?: string;
  lastVerifiedAt?: string;
  verifiedNumber?: string;
  verifiedName?: string;
  lastTestSentAt?: string;
}

export function publicWhatsAppSettings(settings: StoredWhatsAppSettings | null, revision: string | null) {
  return {
    enabled: settings?.enabled ?? false,
    phoneNumberId: settings?.phoneNumberId || '',
    businessAccountId: settings?.businessAccountId || '',
    apiVersion: settings?.apiVersion || 'v21.0',
    sendCardOnIssue: settings?.sendCardOnIssue ?? true,
    sendSessionConfirmation: settings?.sendSessionConfirmation ?? true,
    cardTemplateName: settings?.cardTemplateName || DEFAULT_TEMPLATES.card.name,
    cardTemplateLanguage: settings?.cardTemplateLanguage || DEFAULT_TEMPLATES.card.language,
    sessionTemplateName: settings?.sessionTemplateName || DEFAULT_TEMPLATES.session.name,
    sessionTemplateLanguage: settings?.sessionTemplateLanguage || DEFAULT_TEMPLATES.session.language,
    hasAccessToken: !!settings?.encryptedAccessToken,
    enabledAt: settings?.enabledAt || null,
    lastVerifiedAt: settings?.lastVerifiedAt || null,
    verifiedNumber: settings?.verifiedNumber || null,
    verifiedName: settings?.verifiedName || null,
    lastTestSentAt: settings?.lastTestSentAt || null,
    revision,
  };
}

export async function readStoredWhatsAppSettings(): Promise<{ settings: StoredWhatsAppSettings | null; revision: string | null; rowId: string | null }> {
  const row = await db.settings.findUnique({ where: { key: WHATSAPP_SETTINGS_KEY } });
  return { settings: row ? (JSON.parse(row.value) as StoredWhatsAppSettings) : null, revision: row?.updatedAt.toISOString() || null, rowId: row?.id || null };
}

export async function saveStoredWhatsAppSettings(settings: StoredWhatsAppSettings) {
  return db.settings.upsert({
    where: { key: WHATSAPP_SETTINGS_KEY },
    create: { key: WHATSAPP_SETTINGS_KEY, value: JSON.stringify(settings) },
    update: { value: JSON.stringify(settings) },
  });
}

export const encryptAccessToken = encryptEmailPassword;

/** Everything needed to call Meta, or a reason why WhatsApp can't send yet. */
export type ActiveWhatsAppConfig = StoredWhatsAppSettings & { accessToken: string; phoneNumberId: string };
export async function loadActiveWhatsAppConfig(): Promise<{ config: ActiveWhatsAppConfig | null; reason?: string }> {
  try {
    const { settings } = await readStoredWhatsAppSettings();
    if (!settings || !settings.enabled) return { config: null, reason: 'WhatsApp is not set up yet.' };
    if (!settings.encryptedAccessToken || !settings.phoneNumberId) return { config: null, reason: 'WhatsApp settings are incomplete (access token or Phone Number ID missing).' };
    const accessToken = await decryptEmailPassword(settings.encryptedAccessToken);
    return { config: { ...settings, phoneNumberId: settings.phoneNumberId, accessToken } };
  } catch (error) {
    console.error('WhatsApp settings error:', error);
    return { config: null, reason: 'WhatsApp settings could not be read.' };
  }
}
