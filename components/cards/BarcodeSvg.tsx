'use client';

import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import { getBarcodeImageAlt, getBarcodeOptions } from '@/lib/barcode';

interface BarcodeSvgProps {
  value: string;
  className?: string;
  color?: string;
  backgroundColor?: string;
  preserveAspectRatio?: string;
}

export function BarcodeSvg({ value, className = '', color = '#000000', backgroundColor = '#ffffff', preserveAspectRatio = 'xMidYMid meet' }: BarcodeSvgProps) {
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
      background: backgroundColor,
      lineColor: color,
    });
  }, [value, color, backgroundColor]);

  return <svg ref={svgRef} preserveAspectRatio={preserveAspectRatio} aria-label={getBarcodeImageAlt(value)} className={className} />;
}
