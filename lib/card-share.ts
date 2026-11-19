import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Private, unguessable links that let a member view and save their own
 * membership card without logging in. The link is signed with the server
 * secret, so it cannot be forged or changed to show someone else's card.
 */
function secret(): string {
  const value = process.env.CARD_SHARE_SECRET || process.env.JWT_SECRET;
  if (!value) throw new Error('Card sharing is not configured');
  return value;
}

function sign(cardId: string): string {
  return createHmac('sha256', secret()).update(`card-share:${cardId}`).digest('base64url').slice(0, 32);
}

export function createCardShareToken(cardId: string): string {
  return `${cardId}.${sign(cardId)}`;
}

export function verifyCardShareToken(token: string): string | null {
  const [cardId, signature] = decodeURIComponent(token || '').split('.');
  if (!cardId || !signature || !/^[A-Za-z0-9_-]+$/.test(cardId)) return null;
  const expected = Buffer.from(sign(cardId));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given) ? cardId : null;
}

export function buildCardShareUrl(cardId: string, origin: string): string {
  return `${origin.replace(/\/+$/, '')}/card/${createCardShareToken(cardId)}`;
}
