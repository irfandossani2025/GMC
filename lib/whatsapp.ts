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
