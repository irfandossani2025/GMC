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

// html2canvas does not render CSS image filters. Tint card logos in its
// isolated clone so the exported PDF matches the white on navy preview.
async function prepareCardLogosForExport(clonedDocument: Document): Promise<void> {
  const logos = clonedDocument.querySelectorAll<HTMLImageElement>('.card-print-surface img, .card-print-back img');
  await Promise.all(Array.from(logos).map(async (image) => {
    await image.decode();
    const canvas = clonedDocument.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.drawImage(image, 0, 0);
    context.globalCompositeOperation = 'source-in';
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    image.src = canvas.toDataURL('image/png');
    await image.decode();
  }));
}

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
    // Capture the physical card, not its responsive page/grid wrapper.
    const cardSurface = (element: HTMLElement, selector: string): HTMLElement => {
      const surface = element.matches(selector) ? element : element.querySelector<HTMLElement>(selector);
      if (!surface) throw new Error('Membership card surface not found');
      return surface;
    };
    const frontCanvas = await html2canvas(cardSurface(frontElement, '.card-print-surface'), {
      scale: 4,
      allowTaint: true,
      useCORS: true,
      logging: false,
      backgroundColor: '#0B1F3A',
      onclone: prepareCardLogosForExport,
    });

    const frontImgData = frontCanvas.toDataURL('image/png');
    pdf.addImage(frontImgData, 'PNG', 0, 0, width, height);

    // Back side (if provided)
    if (backElement) {
      pdf.addPage([width, height], width > height ? 'landscape' : 'portrait');
      const backCanvas = await html2canvas(cardSurface(backElement, '.card-print-back'), {
        scale: 4,
        allowTaint: true,
        useCORS: true,
        logging: false,
        backgroundColor: '#0B1F3A',
        onclone: prepareCardLogosForExport,
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
