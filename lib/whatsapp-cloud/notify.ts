import { db } from '@/lib/db';
import { formatDisplayDate } from '@/lib/clinic';
import { clinicDateLabel } from '@/lib/whatsapp';
import { loadActiveWhatsAppConfig } from '@/lib/whatsapp-cloud/settings';
import { sendTemplate, uploadMedia, WhatsAppApiError } from '@/lib/whatsapp-cloud/client';

export type WhatsAppOutcome =
  | { status: 'sent'; messageId: string; sentAt: string }
  | { status: 'failed'; error: string }
  | { status: 'not_configured'; error: string }
  | { status: 'disabled'; error: string };

async function log(entry: { phone: string; message: string; messageType: string; status: string; response: Record<string, unknown> }) {
  try {
    await db.whatsAppLog.create({ data: { ...entry, response: JSON.stringify(entry.response) } });
  } catch (error) {
    console.error('WhatsApp log error:', error);
  }
}

function failure(error: unknown): string {
  return error instanceof WhatsAppApiError ? error.message : 'WhatsApp message could not be sent.';
}

/** Session confirmation, sent automatically after reception records a session. */
export async function sendSessionConfirmation(input: {
  memberId: string;
  phone: string;
  name: string;
  treatment: string;
  usedSessions: number;
  totalSessions: number;
  remainingSessions: number;
  sessionId: string;
}): Promise<WhatsAppOutcome> {
  const { config, reason } = await loadActiveWhatsAppConfig();
  if (!config) return { status: 'not_configured', error: reason || 'WhatsApp is not set up yet.' };
  if (!config.sendSessionConfirmation) return { status: 'disabled', error: 'Session confirmations are turned off in WhatsApp settings.' };

  const values = [input.name, input.treatment, clinicDateLabel(), String(input.usedSessions), String(input.totalSessions), String(input.remainingSessions)];
  const summary = `Session confirmation: ${input.treatment}, ${input.usedSessions}/${input.totalSessions} used, ${input.remainingSessions} left`;
  try {
    const messageId = await sendTemplate(config, { to: input.phone, name: config.sessionTemplateName, language: config.sessionTemplateLanguage, bodyValues: values });
    await log({ phone: input.phone, message: summary, messageType: 'SESSION_USED', status: 'sent', response: { memberId: input.memberId, sessionId: input.sessionId, messageId } });
    return { status: 'sent', messageId, sentAt: new Date().toISOString() };
  } catch (error) {
    const reasonText = failure(error);
    await log({ phone: input.phone, message: summary, messageType: 'SESSION_USED', status: 'failed', response: { memberId: input.memberId, sessionId: input.sessionId, error: reasonText } });
    return { status: 'failed', error: reasonText };
  }
}

/** Membership card (picture + private link). */
export async function sendMembershipCard(input: {
  memberId: string;
  cardId: string;
  phone: string;
  name: string;
  patientId: string;
  expiryDate: Date | string;
  cardUrl: string;
  image: Buffer;
  automatic: boolean;
}): Promise<WhatsAppOutcome> {
  const { config, reason } = await loadActiveWhatsAppConfig();
  if (!config) return { status: 'not_configured', error: reason || 'WhatsApp is not set up yet.' };
  if (input.automatic && !config.sendCardOnIssue) return { status: 'disabled', error: 'Automatic card sending is turned off in WhatsApp settings.' };

  const summary = `Membership card ${input.patientId} sent with link ${input.cardUrl}`;
  try {
    const mediaId = await uploadMedia(config, input.image, 'image/png', `${input.patientId}-membership-card.png`);
    const messageId = await sendTemplate(config, {
      to: input.phone,
      name: config.cardTemplateName,
      language: config.cardTemplateLanguage,
      headerImageId: mediaId,
      bodyValues: [input.name, input.patientId, formatDisplayDate(input.expiryDate), input.cardUrl],
    });
    await log({ phone: input.phone, message: summary, messageType: 'CARD_ISSUED', status: 'sent', response: { memberId: input.memberId, cardId: input.cardId, messageId, automatic: input.automatic } });
    return { status: 'sent', messageId, sentAt: new Date().toISOString() };
  } catch (error) {
    const reasonText = failure(error);
    await log({ phone: input.phone, message: summary, messageType: 'CARD_ISSUED', status: 'failed', response: { memberId: input.memberId, cardId: input.cardId, error: reasonText, automatic: input.automatic } });
    return { status: 'failed', error: reasonText };
  }
}

/** Latest WhatsApp attempt for a card (used to auto-send only once, and to show status). */
export async function latestCardMessage(cardId: string) {
  const rows = await db.whatsAppLog.findMany({
    where: { messageType: 'CARD_ISSUED', response: { contains: `"cardId":"${cardId}"` } },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });
  const sent = rows.find((row) => row.status === 'sent');
  const latest = rows[0];
  const parse = (value?: string | null) => { try { return value ? JSON.parse(value) : {}; } catch { return {}; } };
  return {
    sentAt: sent ? sent.createdAt.toISOString() : null,
    lastAttemptAt: latest ? latest.createdAt.toISOString() : null,
    lastStatus: latest?.status || null,
    lastError: latest && latest.status !== 'sent' ? (parse(latest.response).error as string) || null : null,
  };
}
