import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Orientation } from '../types';

// CR80 standard physical dimensions in mm: 85.60 mm x 53.98 mm
export const CR80_WIDTH_MM = 85.6;
export const CR80_HEIGHT_MM = 53.98;

/**
 * Prepares an element for crisp, reliable canvas capture.
 * Handles hidden/offscreen elements, transforms, and converts external images to data URLs to prevent canvas tainting.
 */
export async function captureCardCanvas(element: HTMLElement, scale: number = 3): Promise<HTMLCanvasElement> {
  // If fonts are loading, wait for them to finish
  try {
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
  } catch {}

  const isElementVisible = element.offsetWidth > 0 && element.offsetHeight > 0 && element.style.display !== 'none';

  let targetElement = element;
  let tempWrapper: HTMLElement | null = null;

  // If the element is hidden (e.g. inside a non-active tab or display:none container),
  // clone it into a temporary offscreen visible container so html2canvas can measure and render it
  if (!isElementVisible) {
    tempWrapper = document.createElement('div');
    tempWrapper.style.position = 'fixed';
    tempWrapper.style.left = '-99999px';
    tempWrapper.style.top = '0';
    tempWrapper.style.zIndex = '-9999';
    tempWrapper.style.display = 'block';
    tempWrapper.style.visibility = 'visible';
    tempWrapper.style.opacity = '1';
    tempWrapper.style.pointerEvents = 'none';

    const clone = element.cloneNode(true) as HTMLElement;
    clone.style.display = 'block';
    clone.style.visibility = 'visible';

    // Remove any negative or hiding styles on parents
    let cur: HTMLElement | null = clone;
    while (cur) {
      cur.style.display = 'block';
      cur.style.visibility = 'visible';
      cur = cur.firstElementChild as HTMLElement | null;
    }

    tempWrapper.appendChild(clone);
    document.body.appendChild(tempWrapper);
    targetElement = clone;
  }

  try {
    // Process all images to ensure CORS and prevent canvas tainting
    const images = Array.from(targetElement.querySelectorAll('img'));
    await Promise.all(
      images.map(async (img) => {
        img.crossOrigin = 'anonymous';

        // Convert external HTTP images to Base64 data URLs if possible
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
          } catch {
            // Keep original image URL if fetch fails
          }
        }

        if (!img.complete) {
          await new Promise<void>((resolve) => {
            img.onload = () => resolve();
            img.onerror = () => resolve();
            setTimeout(resolve, 600);
          });
        }
      })
    );

    // Capture using html2canvas with allowTaint: false so toDataURL never throws SecurityError
    const canvas = await html2canvas(targetElement, {
      scale,
      useCORS: true,
      allowTaint: false, // CRITICAL: NEVER taint canvas so .toDataURL() is always allowed
      backgroundColor: null,
      logging: false,
      imageTimeout: 5000,
    });

    return canvas;
  } finally {
    if (tempWrapper && tempWrapper.parentNode) {
      tempWrapper.parentNode.removeChild(tempWrapper);
    }
  }
}

function sanitizeFilename(filename: string): string {
  return (filename || 'SmartID_Card').replace(/[/\\?%*:|"<>]/g, '_').trim();
}

export async function downloadCardImage(
  element: HTMLElement,
  format: 'png' | 'jpeg',
  filename: string
): Promise<void> {
  const safeName = sanitizeFilename(filename);
  const canvas = await captureCardCanvas(element, 3);
  const dataUrl = canvas.toDataURL(`image/${format}`, 0.95);
  const link = document.createElement('a');
  link.download = `${safeName}.${format === 'jpeg' ? 'jpg' : 'png'}`;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function downloadSingleCardPdf(
  element: HTMLElement,
  orientation: Orientation,
  filename: string
): Promise<void> {
  const safeName = sanitizeFilename(filename);
  const isLandscape = orientation === 'landscape';
  const widthMm = isLandscape ? CR80_WIDTH_MM : CR80_HEIGHT_MM;
  const heightMm = isLandscape ? CR80_HEIGHT_MM : CR80_WIDTH_MM;

  const canvas = await captureCardCanvas(element, 3);
  const imgData = canvas.toDataURL('image/png');

  // jsPDF format: [width, height] in mm
  const doc = new jsPDF({
    orientation: isLandscape ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [widthMm, heightMm],
  });

  doc.addImage(imgData, 'PNG', 0, 0, widthMm, heightMm, undefined, 'FAST');
  doc.save(`${safeName}.pdf`);
}

export async function downloadFrontBackPdf(
  frontElement: HTMLElement,
  backElement: HTMLElement,
  orientation: Orientation,
  filename: string
): Promise<void> {
  const safeName = sanitizeFilename(filename);
  const isLandscape = orientation === 'landscape';
  const widthMm = isLandscape ? CR80_WIDTH_MM : CR80_HEIGHT_MM;
  const heightMm = isLandscape ? CR80_HEIGHT_MM : CR80_WIDTH_MM;

  const frontCanvas = await captureCardCanvas(frontElement, 3);
  const frontImg = frontCanvas.toDataURL('image/png');

  const backCanvas = await captureCardCanvas(backElement, 3);
  const backImg = backCanvas.toDataURL('image/png');

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

  doc.save(`${safeName}_Front_Back.pdf`);
}

export async function downloadA4SheetPdf(
  cardElement: HTMLElement,
  copies: number = 8,
  filename: string = 'SmartID_A4_Sheet'
): Promise<void> {
  const safeName = sanitizeFilename(filename);
  const canvas = await captureCardCanvas(cardElement, 3);
  const imgData = canvas.toDataURL('image/png');

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

    // Draw card image
    doc.addImage(imgData, 'PNG', x, y, cardW, cardH, undefined, 'FAST');

    // Draw crop boundary marks
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.2);
    doc.rect(x, y, cardW, cardH);
  }

  // Header note
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('SmartID Studio • ISO CR80 (85.60 × 53.98 mm) • Print at 100% Scale (Do not fit to page)', 14, 12);

  doc.save(`${safeName}.pdf`);
}
