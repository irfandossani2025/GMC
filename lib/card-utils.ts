const CARD_SCAN_ROUTE = '/c';

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

export function buildCardScanPath(barcode: string): string {
  return `${CARD_SCAN_ROUTE}/${encodeURIComponent(barcode)}`;
}

export function buildCardScanUrl(barcode: string, origin?: string): string {
  const configuredOrigin =
    origin ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (typeof window !== 'undefined' ? window.location.origin : '');

  if (!configuredOrigin) {
    return buildCardScanPath(barcode);
  }

  return `${trimTrailingSlash(configuredOrigin)}${buildCardScanPath(barcode)}`;
}

export function extractBarcodeToken(value: string): string {
  const cleaned = decodeURIComponent(value.trim());

  if (!cleaned) {
    return '';
  }

  try {
    const url = new URL(cleaned);
    const queryBarcode = url.searchParams.get('barcode');
    if (queryBarcode) {
      return queryBarcode.trim().toUpperCase();
    }

    const segments = url.pathname.split('/').filter(Boolean);
    const cardRouteIndex = segments.findIndex((segment) => segment.toLowerCase() === 'c');
    if (cardRouteIndex >= 0 && segments[cardRouteIndex + 1]) {
      return segments[cardRouteIndex + 1].trim().toUpperCase();
    }

    const lastSegment = segments.at(-1);
    if (lastSegment) {
      return lastSegment.trim().toUpperCase();
    }
  } catch {
    // Plain barcode scanner input is expected here.
  }

  return cleaned.toUpperCase();
}
