import { CLINIC_NAME, formatDisplayDate } from '@/lib/clinic';

export function normalizePhoneForWhatsApp(phone: string): string {
  return phone.replace(/[^\d]/g, '');
}

export function buildWhatsAppLink(phone: string, message: string): string {
  const baseUrl = process.env.WHATSAPP_BASE_URL || 'https://wa.me';
  return `${baseUrl}/${normalizePhoneForWhatsApp(phone)}?text=${encodeURIComponent(message)}`;
}

export function buildWelcomeMessage(name: string, memberId: string, expiryDate: string | Date): string {
  return [
    `Hello ${name},`,
    '',
    `Welcome to ${CLINIC_NAME}.`,
    `Your membership ID is ${memberId}.`,
    `Expiry date: ${formatDisplayDate(expiryDate)}.`,
    '',
    'Thank you for choosing Grand Medical Care.',
  ].join('\n');
}

export function buildCardIssuedMessage(name: string, memberId: string, expiryDate: string | Date): string {
  return [
    `Hello ${name},`,
    '',
    `Your ${CLINIC_NAME} membership card is ready.`,
    `Member ID: ${memberId}`,
    `Expiry date: ${formatDisplayDate(expiryDate)}`,
    '',
    'Please keep this card with you during your visits.',
  ].join('\n');
}

export function buildPackagePurchasedMessage(
  name: string,
  memberId: string,
  packageName: string,
  totalSessions: number,
  expiryDate: string | Date
): string {
  return [
    `Hello ${name},`,
    '',
    `Thank you for choosing ${CLINIC_NAME}.`,
    `Your package ${packageName} has been activated.`,
    `Sessions purchased: ${totalSessions}.`,
    `Valid until: ${formatDisplayDate(expiryDate)}.`,
    '',
    'Please bring your membership card to every session.',
  ].join('\n');
}

export function buildSessionUsedMessage(
  name: string,
  packageName: string,
  remainingSessions: number
): string {
  return [
    `Hello ${name},`,
    '',
    `One session has been recorded for your ${packageName} package.`,
    `Remaining sessions: ${remainingSessions}.`,
    '',
    `Please show your Grand Medical Care membership card at the reception for your next visit.`,
  ].join('\n');
}

export interface WhatsAppSendResult {
	  success: boolean;
	  method: 'api' | 'link' | 'skipped';
	  link?: string;
	    error?: string;
}

/**
 * Send a WhatsApp message to a patient.
  *
   * Priority order:
    *  1. Twilio WhatsApp API  (if TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_WHATSAPP_FROM are set)
	 *  2. WhatsApp Business Cloud API  (if WHATSAPP_API_TOKEN + WHATSAPP_PHONE_NUMBER_ID are set)
	  *  3. Fallback – returns a wa.me link so the receptionist can send manually.
	   */
export async function sendWhatsAppMessage(
	  phone: string,
	  message: string
	): Promise<WhatsAppSendResult> {
	  const normalizedPhone = normalizePhoneForWhatsApp(phone);

  // --- Twilio WhatsApp API ---
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioFrom = process.env.TWILIO_WHATSAPP_FROM;

  if (twilioSid && twilioToken && twilioFrom) {
	      try {
			        const credentials = Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64');
			        const body = new URLSearchParams({
						        From: `whatsapp:${twilioFrom}`,
						        To: `whatsapp:+${normalizedPhone}`,
						        Body: message,
					});
			        const res = await fetch(
						        `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
						{
							          method: 'POST',
							          headers: {
										              Authorization: `Basic ${credentials}`,
										              'Content-Type': 'application/x-www-form-urlencoded',
									  },
							          body,
						}
						      );
			        const data = await res.json();
			        if (!res.ok) {
						        throw new Error(data.message || 'Twilio API error');
					}
			        return { success: true, method: 'api' };
		  } catch (err: any) {
			        console.error('Twilio WhatsApp send error:', err.message);
			        // Fall through to next method
		  }
  }

  // --- WhatsApp Business Cloud API ---
  const wabToken = process.env.WHATSAPP_API_TOKEN;
  const wabPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (wabToken && wabPhoneId) {
	      try {
			        const res = await fetch(
						        `https://graph.facebook.com/v19.0/${wabPhoneId}/messages`,
						{
							          method: 'POST',
							          headers: {
										              Authorization: `Bearer ${wabToken}`,
										              'Content-Type': 'application/json',
									  },
							          body: JSON.stringify({
										              messaging_product: 'whatsapp',
										              to: normalizedPhone,
										              type: 'text',
										              text: { body: message },
									  }),
						}
						      );
			        const data = await res.json();
			        if (!res.ok) {
						        throw new Error(data.error?.message || 'WhatsApp Cloud API error');
					}
			        return { success: true, method: 'api' };
		  } catch (err: any) {
			        console.error('WhatsApp Cloud API send error:', err.message);
			        // Fall through to link fallback
		  }
  }

  // --- Fallback: return a clickable wa.me link ---
  const link = buildWhatsAppLink(phone, message);
  return { success: false, method: 'link', link };
}

/**
 * Phone number in the international format WhatsApp needs (digits only).
 * Oman local numbers (8 digits) get the 968 country code added.
 */
export function phoneForWhatsAppWeb(phone: string): string {
  let digits = normalizePhoneForWhatsApp(phone);
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.length === 8) digits = `968${digits}`;
  return digits;
}

/** Opens a chat on WhatsApp Web (web.whatsapp.com) using the number logged in there. */
export function buildWhatsAppWebLink(phone: string, message: string): string {
  return `https://web.whatsapp.com/send?phone=${phoneForWhatsAppWeb(phone)}&text=${encodeURIComponent(message)}`;
}

export function buildCardShareMessage(name: string, memberId: string, expiryDate: string | Date, cardUrl: string): string {
  return [
    `Hello ${name},`,
    '',
    `Welcome to ${CLINIC_NAME}. Your membership card is ready.`,
    `Member ID: ${memberId}`,
    `Valid until: ${formatDisplayDate(expiryDate)}`,
    '',
    'View or save your membership card here:',
    cardUrl,
    '',
    'Please show this card at reception on every visit.',
  ].join('\n');
}

/** Today's date as the clinic sees it (Oman time), e.g. "22 Nov 2026". */
export function clinicDateLabel(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Muscat' }).format(date);
}

/** Message sent to the member after a session is recorded at reception. */
export function buildSessionRecordedMessage(details: {
  name: string;
  treatmentName?: string | null;
  packageName: string;
  date: string;
  usedSessions: number;
  totalSessions: number;
  remainingSessions: number;
}): string {
  const treatment = details.treatmentName && details.treatmentName !== details.packageName
    ? `${details.treatmentName} (${details.packageName})`
    : details.packageName;
  return [
    `Hello ${details.name},`,
    '',
    `Thank you for visiting ${CLINIC_NAME} today.`,
    '',
    `Treatment: ${treatment}`,
    `Date: ${details.date}`,
    `Sessions used: ${details.usedSessions} of ${details.totalSessions}`,
    `Sessions remaining: ${details.remainingSessions}`,
    '',
    details.remainingSessions > 0
      ? 'We look forward to seeing you at your next visit.'
      : 'This was the last session in your package. Please speak to our reception team to renew.',
  ].join('\n');
}
