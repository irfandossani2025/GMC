/**
 * WhatsApp helpers shared by the Meta WhatsApp Cloud API integration
 * (see lib/whatsapp-cloud). Messages are sent automatically from the
 * clinic's dedicated WhatsApp number using Meta-approved templates.
 */

export function normalizePhoneForWhatsApp(phone: string): string {
  return phone.replace(/[^\d]/g, '');
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

/** Today's date as the clinic sees it (Oman time), e.g. "22 Nov 2026". */
export function clinicDateLabel(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Muscat' }).format(date);
}
