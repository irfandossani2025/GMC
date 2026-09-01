import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface CardDimensions {
  width: number; // mm
  height: number; // mm
  bleedMargin?: number; // mm
}

export const PVC_CARD_DIMENSIONS: CardDimensions = {
  width: 85.6,
  height: 54,
  bleedMargin: 2,
};

export async function generateCardPDF(
  frontElement: HTMLElement,
  backElement?: HTMLElement,
  dimensions: CardDimensions = PVC_CARD_DIMENSIONS
): Promise<ArrayBuffer> {
  const { width, height } = dimensions;
  const pdf = new jsPDF({
    orientation: width > height ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [width, height],
  });

  try {
    // Front side
    const frontCanvas = await html2canvas(frontElement, {
      scale: 3,
      allowTaint: true,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    const frontImgData = frontCanvas.toDataURL('image/png');
    pdf.addImage(frontImgData, 'PNG', 0, 0, width, height);

    // Back side (if provided)
    if (backElement) {
      pdf.addPage([width, height], width > height ? 'landscape' : 'portrait');
      const backCanvas = await html2canvas(backElement, {
        scale: 3,
        allowTaint: true,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const backImgData = backCanvas.toDataURL('image/png');
      pdf.addImage(backImgData, 'PNG', 0, 0, width, height);
    }

    return pdf.output('arraybuffer');
  } catch (error) {
    console.error('PDF generation error:', error);
    throw new Error('Failed to generate card PDF');
  }
}

export async function downloadCardPDF(
  frontElement: HTMLElement,
  backElement: HTMLElement | undefined,
  fileName: string
): Promise<void> {
  const pdfBuffer = await generateCardPDF(frontElement, backElement);
  const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function generatePrintableHTML(
  frontHTML: string,
  backHTML: string
): string {
  const { width, height } = PVC_CARD_DIMENSIONS;
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Membership Card - Print</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: "Avenir Next", "Segoe UI", sans-serif; background: #ffffff; }
        @media print {
          body { margin: 0; }
          .page { break-after: always; }
          .page:last-child { break-after: auto; }
        }
        .page {
          width: ${width}mm;
          height: ${height}mm;
          display: flex;
          align-items: center;
          justify-content: center;
          page-break-after: always;
          margin: 8mm auto;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        .card-container {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
      </style>
    </head>
    <body>
      <div class="page">
        <div class="card-container">
          ${frontHTML}
        </div>
      </div>
      <div class="page">
        <div class="card-container">
          ${backHTML}
        </div>
      </div>
    </body>
    </html>
  `;
}
