export interface BarcodeOptions {
  format?: string;
  width?: number;
  height?: number;
  displayValue?: boolean;
  fontSize?: number;
  margin?: number;
}

export function getBarcodeOptions(
  options: BarcodeOptions = {}
): Required<BarcodeOptions> {
  return {
    format: options.format || process.env.NEXT_PUBLIC_BARCODE_FORMAT || 'CODE128',
    width: options.width || Number(process.env.NEXT_PUBLIC_BARCODE_WIDTH || 2),
    height: options.height || Number(process.env.NEXT_PUBLIC_BARCODE_HEIGHT || 72),
    displayValue: options.displayValue ?? false,
    fontSize: options.fontSize || 12,
    margin: options.margin || 4,
  };
}

export function getBarcodeImageAlt(value: string): string {
  return `Grand Medical Center membership barcode ${value}`;
}
