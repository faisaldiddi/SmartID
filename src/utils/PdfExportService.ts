import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { CardState, CardRenderModel, Orientation } from '../types';
import { buildCardSnapshot } from './templateRegistry';

export const CR80_WIDTH_MM = 85.60;
export const CR80_HEIGHT_MM = 53.98;

export function sanitizePdfFilename(name: string, id: string): string {
  const cleanName = (name || 'SmartID').replace(/[^a-zA-Z0-9_\- ]/g, '').trim().replace(/\s+/g, '_');
  const cleanId = (id || 'Card').replace(/[^a-zA-Z0-9_\- ]/g, '').trim().replace(/\s+/g, '_');
  return `SmartID_${cleanName}_${cleanId}`;
}

/**
 * Awaits all web fonts and image assets inside an element so canvas capture is 100% complete
 */
async function waitForAssets(element: HTMLElement): Promise<void> {
  // 1. Wait for document fonts
  try {
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
  } catch {}

  // 2. Wait for all <img> elements to be fully loaded
  const images = Array.from(element.querySelectorAll('img'));
  await Promise.all(
    images.map(async (img) => {
      img.crossOrigin = 'anonymous';

      // Convert remote HTTP images to base64 if needed
      if (img.src && img.src.startsWith('http')) {
        try {
          const resp = await fetch(img.src, { mode: 'cors' });
          if (resp.ok) {
            const blob = await resp.blob();
            const dataUrl = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.onerror = () => resolve('');
              reader.readAsDataURL(blob);
            });
            if (dataUrl) {
              img.src = dataUrl;
            }
          }
        } catch {}
      }

      if (!img.complete) {
        await new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
          setTimeout(resolve, 800);
        });
      }
    })
  );

  // Small breath to ensure DOM paint
  await new Promise((resolve) => setTimeout(resolve, 50));
}

/**
 * Captures a clean high-resolution canvas of a card element (scale 3 = 300+ DPI)
 */
async function captureElementCanvas(element: HTMLElement): Promise<HTMLCanvasElement> {
  await waitForAssets(element);

  const canvas = await html2canvas(element, {
    scale: 3, // High-resolution 300+ DPI
    useCORS: true,
    allowTaint: false,
    backgroundColor: null,
    logging: false,
    imageTimeout: 6000,
  });

  return canvas;
}

/**
 * Centralized PDF Export Service
 * Exports the SAME canonical rendered card to a high-quality CR80 PDF.
 */
export class PdfExportService {
  /**
   * Exports a single side of the card to an exact CR80 PDF
   */
  static async exportSingleSidePdf(
    element: HTMLElement,
    orientation: Orientation,
    filename: string = 'SmartID_Card'
  ): Promise<void> {
    const isLandscape = orientation === 'landscape';
    const widthMm = isLandscape ? CR80_WIDTH_MM : CR80_HEIGHT_MM;
    const heightMm = isLandscape ? CR80_HEIGHT_MM : CR80_WIDTH_MM;

    const canvas = await captureElementCanvas(element);
    const imgData = canvas.toDataURL('image/png', 1.0);

    const doc = new jsPDF({
      orientation: isLandscape ? 'landscape' : 'portrait',
      unit: 'mm',
      format: [widthMm, heightMm],
    });

    doc.addImage(imgData, 'PNG', 0, 0, widthMm, heightMm, undefined, 'FAST');
    doc.save(`${filename}.pdf`);
  }

  /**
   * Exports both Front and Back sides to a 2-page exact CR80 PDF
   * Page 1 = Front, Page 2 = Back
   */
  static async exportFrontBackPdf(
    frontElement: HTMLElement,
    backElement: HTMLElement,
    orientation: Orientation,
    filename: string = 'SmartID_Card'
  ): Promise<void> {
    const isLandscape = orientation === 'landscape';
    const widthMm = isLandscape ? CR80_WIDTH_MM : CR80_HEIGHT_MM;
    const heightMm = isLandscape ? CR80_HEIGHT_MM : CR80_WIDTH_MM;

    const frontCanvas = await captureElementCanvas(frontElement);
    const frontImg = frontCanvas.toDataURL('image/png', 1.0);

    const backCanvas = await captureElementCanvas(backElement);
    const backImg = backCanvas.toDataURL('image/png', 1.0);

    const doc = new jsPDF({
      orientation: isLandscape ? 'landscape' : 'portrait',
      unit: 'mm',
      format: [widthMm, heightMm],
    });

    // Page 1: Front
    doc.addImage(frontImg, 'PNG', 0, 0, widthMm, heightMm, undefined, 'FAST');

    // Page 2: Back
    doc.addPage([widthMm, heightMm], isLandscape ? 'landscape' : 'portrait');
    doc.addImage(backImg, 'PNG', 0, 0, widthMm, heightMm, undefined, 'FAST');

    doc.save(`${filename}_Front_Back.pdf`);
  }

  /**
   * Exports multiple cards to an A4 printable sheet (up to 8 CR80 cards)
   */
  static async exportA4SheetPdf(
    cardElement: HTMLElement,
    copies: number = 8,
    filename: string = 'SmartID_A4_Sheet'
  ): Promise<void> {
    const canvas = await captureElementCanvas(cardElement);
    const imgData = canvas.toDataURL('image/png', 1.0);

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4', // 210 x 297 mm
    });

    const cardW = CR80_WIDTH_MM; // 85.6
    const cardH = CR80_HEIGHT_MM; // 53.98
    const startX = 14;
    const startY = 18;
    const gapX = 10;
    const gapY = 8;
    const count = Math.min(copies, 8);

    for (let i = 0; i < count; i++) {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = startX + col * (cardW + gapX);
      const y = startY + row * (cardH + gapY);

      doc.addImage(imgData, 'PNG', x, y, cardW, cardH, undefined, 'FAST');
      doc.setDrawColor(180, 180, 180);
      doc.setLineWidth(0.2);
      doc.rect(x, y, cardW, cardH);
    }

    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('SmartID Studio • ISO CR80 (85.60 × 53.98 mm) • Print at 100% Scale', 14, 12);

    doc.save(`${filename}.pdf`);
  }
}
