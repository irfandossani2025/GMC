'use client';

import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import { getBarcodeImageAlt, getBarcodeOptions } from '@/lib/barcode';

interface BarcodeSvgProps {
  value: string;
  className?: string;
  color?: string;
}

export function BarcodeSvg({ value, className = '', color = '#000000' }: BarcodeSvgProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!svgRef.current) {
      return;
    }

    const options = getBarcodeOptions();
    JsBarcode(svgRef.current, value, {
      format: options.format,
      width: options.width,
      height: options.height,
      displayValue: false,
      margin: options.margin,
      background: '#ffffff',
      lineColor: color,
    });
  }, [value, color]);

  return <svg ref={svgRef} aria-label={getBarcodeImageAlt(value)} className={className} />;
}
