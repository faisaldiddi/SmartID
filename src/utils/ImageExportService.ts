import html2canvas from 'html2canvas';

/**
 * Centralized Image Export Service
 * Exports the canonical rendered card to a high-resolution PNG or JPEG
 */
export class ImageExportService {
  static async exportCardImage(
    element: HTMLElement,
    format: 'png' | 'jpeg',
    filename: string = 'SmartID_Card'
  ): Promise<void> {
    try {
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }
    } catch {}

    const canvas = await html2canvas(element, {
      scale: 3, // 300+ DPI
      useCORS: true,
      allowTaint: false,
      backgroundColor: null,
      logging: false,
    });

    const dataUrl = canvas.toDataURL(`image/${format}`, 0.95);
    const link = document.createElement('a');
    link.download = `${filename}.${format === 'jpeg' ? 'jpg' : 'png'}`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
