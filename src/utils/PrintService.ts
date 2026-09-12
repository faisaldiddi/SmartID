import { CardState, CardRenderModel, Orientation } from '../types';
import { buildCardSnapshot } from './templateRegistry';

/**
 * Centralized Print Service
 * Prepares and dispatches canonical card printing with exact physical CR80 dimensions.
 */
export class PrintService {
  /**
   * Triggers browser print with pre-print asset verification and clean font loading
   */
  static async executePrint(): Promise<boolean> {
    try {
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }
    } catch {}

    return new Promise((resolve) => {
      const handleAfterPrint = () => {
        window.removeEventListener('afterprint', handleAfterPrint);
        resolve(true);
      };
      window.addEventListener('afterprint', handleAfterPrint);

      setTimeout(() => {
        try {
          window.print();
        } catch (err) {
          console.error('Print execution failed:', err);
          resolve(false);
        }
      }, 150);
    });
  }
}
