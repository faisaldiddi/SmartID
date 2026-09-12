import { CardState, ColorScheme, Orientation, PatternType } from '../types';
import { getTemplateById, getTemplateCardState } from './templateRegistry';

/**
 * Version 3 Compact QR Payload schema
 * Uses short keys to ensure URL stays ultra-compact (< 350 chars)
 * UTF-8 safe, pure frontend-only, zero backend dependency.
 */
export interface CompactQrPayloadV3 {
  v: 3;
  i: string;           // unique ID
  n: string;           // full name
  o?: string;          // organization
  d?: string;          // department
  r?: string;          // role / designation
  c?: string;          // card type (e.g., 'Student ID')
  e?: string;          // expiry (YYYY-MM-DD or date string)
  t: string;           // template ID (e.g. 'college-modern-07' / 'coll-poly-07')
  or?: Orientation;    // orientation ('portrait' | 'landscape')
  p: string;           // primary color HEX
  s: string;           // secondary color HEX
  a?: string;          // accent color HEX
  tx?: string;         // text light / header text HEX
  bg?: string;         // blood group (optional)
  ph?: string;         // phone (optional)
  em?: string;         // emergency contact (optional)
  ad?: string;         // address (optional)
  hp?: string;         // header preset ID (optional)
  fp?: string;         // footer preset ID (optional)
  pt?: PatternType;    // pattern (optional)
  fn?: string;         // font family (optional)
}

/**
 * Base URL Resolution:
 * 1. Checks VITE_PUBLIC_SMARTID_URL from environment
 * 2. Falls back to window.location.origin
 */
export function getSmartIdBaseUrl(): string {
  const envUrl = (import.meta as any).env?.VITE_PUBLIC_SMARTID_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim().length > 0) {
    return envUrl.trim().replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined') {
    // If running in browser on localhost without env var, use current origin + BASE_URL
    const base = ((import.meta as any).env?.BASE_URL || '/').replace(/\/+$/, '');
    return `${window.location.origin}${base}`;
  }
  return 'https://faisaldiddi.me/SmartID';
}

/**
 * Checks if current origin is localhost and no public URL is configured
 */
export function isLocalhostWithoutPublicUrl(): boolean {
  if (typeof window === 'undefined') return false;
  const envUrl = (import.meta as any).env?.VITE_PUBLIC_SMARTID_URL;
  if (envUrl && envUrl.trim().length > 0) return false;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0';
}

/**
 * Robust UTF-8 safe Base64URL encoder
 * Properly converts UTF-8 strings into bytes before Base64 encoding.
 * Supports accented letters, Hindi, Arabic, Japanese, emojis, etc.
 */
export function encodeBase64Url(obj: unknown): string {
  const json = JSON.stringify(obj);
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Robust UTF-8 safe Base64URL decoder
 * Restores original Unicode characters without corruption or crashing.
 */
export function decodeBase64Url<T = any>(value: string): T {
  let base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const json = new TextDecoder().decode(bytes);
  return JSON.parse(json);
}

/**
 * Builds compact V3 verification payload from CardState
 * Strips heavy images, full canvases, or local-only storage pointers.
 */
export function buildQrPayload(card: CardState): CompactQrPayloadV3 {
  const tpl = getTemplateById(card.templateId);

  const payload: CompactQrPayloadV3 = {
    v: 3,
    i: (card.details.uniqueId || 'ID-0001').trim(),
    n: (card.details.fullName || 'Cardholder').trim(),
    o: card.header.orgName?.trim() || undefined,
    d: card.details.department?.trim() || undefined,
    r: card.details.designation?.trim() || undefined,
    c: tpl.category ? `${tpl.category} ID` : undefined,
    e: card.details.validUntil?.trim() || undefined,
    t: card.templateId || tpl.id,
    or: card.orientation !== tpl.orientation ? card.orientation : undefined,
    p: card.colors.primary,
    s: card.colors.secondary,
    a: card.colors.accent !== tpl.colors.accent ? card.colors.accent : undefined,
    tx: card.colors.textLight !== '#FFFFFF' ? card.colors.textLight : undefined,
    bg: card.details.bloodGroup?.trim() || undefined,
    ph: card.details.phone?.trim() || undefined,
    em: card.details.emergencyContact?.trim() || undefined,
    ad: card.details.address?.trim() || undefined,
    hp: card.header.preset !== tpl.headerPreset ? card.header.preset : undefined,
    fp: card.footer.preset !== tpl.footerPreset ? card.footer.preset : undefined,
    pt: card.pattern !== tpl.pattern ? card.pattern : undefined,
    fn: card.fontFamily !== tpl.fontFamily ? card.fontFamily : undefined,
  };

  return payload;
}

/**
 * Encodes payload into URL-safe string
 */
export function encodeQrPayload(payload: CompactQrPayloadV3): string {
  return encodeBase64Url(payload);
}

/**
 * Decodes URL-safe string back into CompactQrPayloadV3 or legacy payload
 */
export function decodeQrPayload(encoded: string): any {
  return decodeBase64Url(encoded);
}

/**
 * Builds the canonical QR verification URL
 * Format: https://DOMAIN/#/verify?d=PAYLOAD
 */
export function buildQrVerificationUrl(card: CardState): string {
  const baseUrl = getSmartIdBaseUrl();
  const payload = buildQrPayload(card);
  const encoded = encodeQrPayload(payload);
  const verificationUrl = `${baseUrl}/#/verify?d=${encoded}`;

  if (process.env.NODE_ENV !== 'production' || typeof window !== 'undefined') {
    console.log('[SmartID QR] Generated Verification URL:', verificationUrl);
    console.log('[SmartID QR] URL Length:', verificationUrl.length, 'chars');
    console.log('[SmartID QR] Template ID:', payload.t);
  }

  return verificationUrl;
}

/**
 * Restores a full authentic CardState from the verification payload
 * Supports:
 * - V3 payload (v: 3, short keys: i, n, o, d, r, e, t, p, s, a, tx...)
 * - V2 payload fallback
 * - V1 payload fallback
 * NEVER replaces the card with a generic SmartID card.
 */
export function restoreCardFromPayload(encodedData: string): { card: CardState; status: 'VALID' | 'EXPIRED' | 'INVALID'; reason?: string } {
  try {
    if (!encodedData || typeof encodedData !== 'string' || encodedData.trim() === '' || encodedData === 'plain') {
      return { card: null as any, status: 'INVALID', reason: 'Missing payload data' };
    }

    const parsed = decodeQrPayload(encodedData);
    if (!parsed || typeof parsed !== 'object') {
      return { card: null as any, status: 'INVALID', reason: 'Malformed payload' };
    }

    // 1. Handle V3 Payload (Canonical SmartID format)
    if (parsed.v === 3 || (parsed.i && parsed.n && parsed.t)) {
      const p = parsed as CompactQrPayloadV3;
      const tpl = getTemplateById(p.t);
      const baseState = getTemplateCardState(tpl);

      const colors: ColorScheme = {
        primary: p.p || baseState.colors.primary,
        secondary: p.s || baseState.colors.secondary,
        accent: p.a || baseState.colors.accent,
        background: baseState.colors.background,
        textDark: baseState.colors.textDark,
        textLight: p.tx || baseState.colors.textLight,
        headerBg: p.p || baseState.colors.headerBg,
        footerBg: p.s || baseState.colors.footerBg,
      };

      const restored: CardState = {
        ...baseState,
        templateId: tpl.id,
        customTemplateName: tpl.name,
        orientation: p.or || tpl.orientation,
        colors,
        pattern: p.pt || tpl.pattern,
        fontFamily: p.fn || tpl.fontFamily,
        header: {
          ...baseState.header,
          orgName: p.o || baseState.header.orgName,
          preset: p.hp || baseState.header.preset,
          bgColor: colors.headerBg,
        },
        footer: {
          ...baseState.footer,
          preset: p.fp || baseState.footer.preset,
          bgColor: colors.footerBg,
        },
        details: {
          ...baseState.details,
          fullName: p.n || baseState.details.fullName,
          uniqueId: p.i || baseState.details.uniqueId,
          department: p.d || baseState.details.department,
          designation: p.r || baseState.details.designation,
          validUntil: p.e || baseState.details.validUntil,
          bloodGroup: p.bg || baseState.details.bloodGroup,
          phone: p.ph || baseState.details.phone,
          emergencyContact: p.em || baseState.details.emergencyContact,
          address: p.ad || baseState.details.address,
          showBloodGroup: !!p.bg,
          showPhone: !!p.ph,
          showEmergencyContact: !!p.em,
          showAddress: !!p.ad,
          showValidity: !!p.e,
        },
      };

      // Check Expiry
      let status: 'VALID' | 'EXPIRED' | 'INVALID' = 'VALID';
      if (p.e) {
        const expDate = new Date(p.e);
        if (!isNaN(expDate.getTime())) {
          const now = new Date();
          now.setHours(0, 0, 0, 0);
          if (expDate < now) {
            status = 'EXPIRED';
          }
        }
      }

      return { card: restored, status };
    }

    // 2. Handle Legacy V2 Payload
    if (parsed.v === 2 || parsed.tpl || parsed.templateId) {
      const p = parsed as any;
      const tplId = p.tpl || p.templateId || 'coll-poly-07';
      const tpl = getTemplateById(tplId);
      const baseState = getTemplateCardState(tpl);

      const primaryColor = p.c?.[0] || p.theme?.primary || baseState.colors.primary;
      const secondaryColor = p.c?.[1] || p.theme?.secondary || baseState.colors.secondary;
      const accentColor = p.c?.[2] || p.theme?.accent || baseState.colors.accent;

      const colors: ColorScheme = {
        primary: primaryColor,
        secondary: secondaryColor,
        accent: accentColor,
        background: baseState.colors.background,
        textDark: baseState.colors.textDark,
        textLight: baseState.colors.textLight,
        headerBg: primaryColor,
        footerBg: secondaryColor,
      };

      const restored: CardState = {
        ...baseState,
        templateId: tpl.id,
        customTemplateName: tpl.name,
        orientation: p.ori || p.orientation || tpl.orientation,
        colors,
        pattern: p.p || p.theme?.pattern || tpl.pattern,
        fontFamily: p.c?.[3] || p.theme?.font || tpl.fontFamily,
        header: {
          ...baseState.header,
          orgName: p.org || baseState.header.orgName,
          bgColor: colors.headerBg,
        },
        footer: {
          ...baseState.footer,
          bgColor: colors.footerBg,
        },
        details: {
          ...baseState.details,
          fullName: p.name || baseState.details.fullName,
          uniqueId: p.id || baseState.details.uniqueId,
          department: p.dept || baseState.details.department,
          designation: p.role || baseState.details.designation,
          validUntil: p.exp || p.validUntil || baseState.details.validUntil,
        },
      };

      return { card: restored, status: 'VALID' };
    }

    return { card: null as any, status: 'INVALID', reason: 'Unsupported QR payload version' };
  } catch (err: any) {
    console.error('[SmartID QR] Failed to decode payload:', err);
    return { card: null as any, status: 'INVALID', reason: err?.message || 'Decode error' };
  }
}

// Backward compatibility alias
export const buildVerificationPayload = (card: CardState) => encodeQrPayload(buildQrPayload(card));
export const buildVerificationUrl = buildQrVerificationUrl;
