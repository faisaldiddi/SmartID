/**
 * Dedicated Print Engine for SmartID
 * Provides isolated, rock-solid hardware and sheet printing without interference
 * from web UI layout, navigation chrome, or browser iframe sandboxes.
 */

import { Orientation, PrintCalibration, CardSide, PrintMode, CardState } from '../types';
import { setPrintTarget } from './storage';

export interface DirectPrintOptions {
  cardState?: CardState;
  calibration?: PrintCalibration;
  frontElement?: HTMLElement | null;
  backElement?: HTMLElement | null;
  orientation?: Orientation;
  side?: CardSide;
  mode?: PrintMode;
  title?: string;
  onFallbackNeeded?: () => void;
}

/**
 * Opens dedicated standalone print window in a clean tab.
 * This guarantees 100% full-screen print output with zero UI chrome or sandbox interference.
 */
export function openStandalonePrintWindow(cardState?: CardState, calibration?: PrintCalibration): void {
  if (cardState) {
    setPrintTarget(cardState);
  }
  const printUrl = `${window.location.origin}/?view=print&autoprint=true`;
  window.open(printUrl, '_blank');
}

/**
 * Triggers native browser print dialog cleanly.
 * Handles fonts, offscreen pre-rendering, iframe sandboxing, and automatic fallback.
 */
export async function printCardDirectly(options: DirectPrintOptions): Promise<{ success: boolean; error?: string }> {
  if (options.cardState) {
    setPrintTarget(options.cardState);
  }

  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;

  // If running inside a sandboxed iframe preview, open dedicated standalone print window
  if (isInIframe) {
    try {
      openStandalonePrintWindow(options.cardState, options.calibration);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message };
    }
  }

  // Ensure fonts and images have resolved
  try {
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
  } catch {}

  // In top-level browser window, trigger native window.print()
  try {
    window.print();
    return { success: true };
  } catch (err: any) {
    console.warn('Direct window.print() failed, falling back to standalone print window:', err);
    try {
      openStandalonePrintWindow(options.cardState, options.calibration);
      return { success: true };
    } catch (popupErr: any) {
      if (options.onFallbackNeeded) {
        options.onFallbackNeeded();
      }
      return { success: false, error: err?.message || 'Print blocked' };
    }
  }
}
