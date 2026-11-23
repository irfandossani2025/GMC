import { randomBytes } from 'crypto';
import { phoneForWhatsAppWeb } from '@/lib/whatsapp';

/**
 * Minimal Meta WhatsApp Cloud API client.
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api
 */
export interface CloudConfig {
  accessToken: string;
  phoneNumberId: string;
  apiVersion?: string;
}

export class WhatsAppApiError extends Error {
  constructor(message: string, public code?: number, public details?: unknown) {
    super(message);
    this.name = 'WhatsAppApiError';
  }
}

/** Turns Meta's error codes into plain-English reasons reception can act on. */
export function explainMetaError(code: number | undefined, fallback: string): string {
  switch (code) {
    case 190: return 'The WhatsApp access token is invalid or has expired. Update it in WhatsApp settings.';
    case 10:
    case 200: return 'The access token does not have permission to send WhatsApp messages.';
    case 100: return `Meta rejected the request: ${fallback}`;
    case 131026: return 'This phone number cannot receive WhatsApp messages (it may not be on WhatsApp).';
    case 131030: return 'This number is not on the allowed test list. Add it in Meta, or finish switching the number to live.';
    case 131047: return 'More than 24 hours since the patient last messaged; an approved template is required.';
    case 131051: return 'Unsupported message type.';
    case 131056: return 'Too many messages to this number in a short time. Try again shortly.';
    case 132000: return 'The number of values does not match the approved template. Check the template text in Meta.';
    case 132001: return 'The message template does not exist or is not approved yet in Meta.';
    case 132005: return 'The template text became too long after filling in the values.';
    case 132007: return 'The template was rejected by Meta (policy).';
    case 132012: return 'The template values are in the wrong format (for example, the image header is missing).';
    case 133010: return 'The clinic WhatsApp number is not registered with the Cloud API yet.';
    case 368: return 'Meta has temporarily blocked sending from this number (policy).';
    default: return fallback || 'WhatsApp message could not be sent.';
  }
}

function baseUrl(config: CloudConfig) {
  return `https://graph.facebook.com/${config.apiVersion || 'v21.0'}`;
}

async function callGraph<T>(config: CloudConfig, path: string, init: { method?: string; headers?: Record<string, string>; body?: string | Buffer } = {}): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(`${baseUrl(config)}/${path}`, {
      method: init.method || 'GET',
      headers: { Authorization: `Bearer ${config.accessToken}`, ...(init.headers || {}) },
      body: init.body as any,
      signal: controller.signal as any,
    });
    const text = await response.text();
    let data: any = {};
    try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
    if (!response.ok || data.error) {
      const code = data?.error?.code as number | undefined;
      const detail = data?.error?.error_data?.details || data?.error?.message || `HTTP ${response.status}`;
      throw new WhatsAppApiError(explainMetaError(code, detail), code, data?.error);
    }
    return data as T;
  } catch (error) {
    if (error instanceof WhatsAppApiError) throw error;
    if ((error as Error).name === 'AbortError') throw new WhatsAppApiError('Meta did not respond in time. Try again.');
    throw new WhatsAppApiError('Could not reach Meta. Check the server internet connection.');
  } finally {
    clearTimeout(timer);
  }
}

/** Confirms the token and Phone Number ID work; returns the number's display details. */
export async function verifyPhoneNumber(config: CloudConfig) {
  return callGraph<{ display_phone_number?: string; verified_name?: string; quality_rating?: string; id: string }>(
    config,
    `${config.phoneNumberId}?fields=display_phone_number,verified_name,quality_rating`
  );
}

/** Uploads an image (PNG/JPEG) to Meta and returns its media id for use in a message. */
export async function uploadMedia(config: CloudConfig, file: Buffer, mimeType: 'image/png' | 'image/jpeg', filename: string): Promise<string> {
  const boundary = `----gmc${randomBytes(12).toString('hex')}`;
  const part = (name: string, value: string) => `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`;
  const body = Buffer.concat([
    Buffer.from(part('messaging_product', 'whatsapp') + part('type', mimeType)),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`),
    file,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
  const data = await callGraph<{ id: string }>(config, `${config.phoneNumberId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
    body,
  });
  return data.id;
}

export interface TemplateMessage {
  to: string;
  name: string;
  language: string;
  bodyValues?: string[];
  headerImageId?: string;
}

/** Template values may not contain new lines, tabs or more than 4 spaces in a row (Meta rule). */
export function cleanTemplateValue(value: unknown): string {
  const text = String(value ?? '').replace(/[\r\n\t]+/g, ' ').replace(/ {4,}/g, '   ').trim();
  return text || '-';
}

export function buildTemplatePayload(message: TemplateMessage) {
  const components: unknown[] = [];
  if (message.headerImageId) components.push({ type: 'header', parameters: [{ type: 'image', image: { id: message.headerImageId } }] });
  if (message.bodyValues?.length) components.push({ type: 'body', parameters: message.bodyValues.map((text) => ({ type: 'text', text: cleanTemplateValue(text) })) });
  return {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: phoneForWhatsAppWeb(message.to),
    type: 'template',
    template: { name: message.name, language: { code: message.language }, ...(components.length ? { components } : {}) },
  };
}

/** Sends an approved template message; returns Meta's message id. */
export async function sendTemplate(config: CloudConfig, message: TemplateMessage): Promise<string> {
  const data = await callGraph<{ messages?: Array<{ id: string }> }>(config, `${config.phoneNumberId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildTemplatePayload(message)),
  });
  return data.messages?.[0]?.id || '';
}
