import QRCode from 'qrcode';
import { CardState } from '../types';
import { 
  buildQrVerificationUrl, 
  getSmartIdBaseUrl, 
  isLocalhostWithoutPublicUrl 
} from './VerificationPayloadService';

export interface QrDataPayload {
  name?: string;
  id?: string;
  department?: string;
  org?: string;
  customText?: string;
  customUrl?: string;
}

export { isLocalhostWithoutPublicUrl, getSmartIdBaseUrl };

/**
 * Single Canonical QR Code Generator:
 * Generates an SVG or PNG data URL from the canonical verification URL.
 * 
 * Flow:
 * 1. Takes CardState
 * 2. Generates canonical verification URL: https://DOMAIN/#/verify?d=PAYLOAD
 * 3. Uses Error Correction M, dark #000000, light #FFFFFF, margin 4
 * 4. Pure frontend-only, zero backend dependency.
 */
export async function generateCardQrCode(
  payload: QrDataPayload,
  size: number = 300,
  cardState?: CardState
): Promise<string> {
  let targetUrl = '';

  if (payload.customUrl && payload.customUrl.trim().length > 0) {
    targetUrl = payload.customUrl.trim();
  } else if (cardState) {
    targetUrl = buildQrVerificationUrl(cardState);
  } else {
    const baseUrl = getSmartIdBaseUrl();
    const params = new URLSearchParams();
    if (payload.id) params.set('i', payload.id);
    if (payload.name) params.set('n', payload.name);
    targetUrl = `${baseUrl}/#/verify?${params.toString()}`;
  }

  try {
    const dataUrl = await QRCode.toDataURL(targetUrl, {
      width: Math.max(size, 260),
      margin: 3,
      color: {
        dark: '#000000FF',
        light: '#FFFFFFFF',
      },
      errorCorrectionLevel: 'M',
    });
    return dataUrl;
  } catch (err) {
    console.error('[SmartID QR] QR Generation failed:', err);
    return '';
  }
}
