import { CardState, ColorScheme, Orientation, PatternType } from '../types';
import { getTemplateById, getTemplateCardState } from './templateRegistry';

/**
 * Standardized Card Snapshot created directly from the current editor state.
 * Captures all public identity attributes, template design tokens, and visible fields.
 */
export interface CardSnapshot {
  version: 4;
  identity: {
    id: string;
    name: string;
    organization: string;
    department: string;
    designation: string;
    cardType: string;
    validUntil?: string;
  };
  design: {
    templateId: string;
    orientation: Orientation;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    textColor: string;
    fontFamily: string;
    headerPreset?: string;
    footerPreset?: string;
    pattern?: PatternType;
    layoutVariant?: string;
  };
  visibleFields?: {
    bloodGroup?: string;
    phone?: string;
    emergencyContact?: string;
    address?: string;
  };
  customFields?: Array<{ id: string; label: string; value: string }>;
}

/**
 * Version 4 Ultra-Compact QR Payload Schema
 * Uses short keys to ensure QR code density remains optimal (< 350 chars).
 * Pure frontend-only, UTF-8 safe, zero backend / database dependency.
 */
export interface CompactQrPayloadV4 {
  v: 4;
  i: string;           // unique ID
  n: string;           // full name
  o?: string;          // organization
  d?: string;          // department
  r?: string;          // designation / role
  c?: string;          // card type (e.g. 'Student ID', 'Corporate ID')
  e?: string;          // expiry (YYYY-MM-DD or date string)
  t: string;           // template ID
  or?: Orientation;    // orientation ('portrait' | 'landscape')
  p: string;           // primary color HEX
  s: string;           // secondary color HEX
  a?: string;          // accent color HEX
  tx?: string;         // textColor / textLight HEX
  fn?: string;         // font family
  hp?: string;         // header preset ID
  fp?: string;         // footer preset ID
  pt?: PatternType;    // pattern
  bg?: string;         // blood group (optional)
  ph?: string;         // phone (optional)
  em?: string;         // emergency contact (optional)
  ad?: string;         // address (optional)
  cf?: Array<{ l: string; v: string }>; // compact custom fields (optional)
}

/**
 * Backward-compatible V3 interface alias
 */
export type CompactQrPayloadV3 = CompactQrPayloadV4;

/**
 * Base URL Resolution:
 * 1. Checks VITE_PUBLIC_SMARTID_URL from environment
 * 2. Falls back to window.location.origin + BASE_URL
 * 3. Default production URL https://faisaldiddi.me/SmartID
 */
export function getSmartIdBaseUrl(): string {
  const envUrl = (import.meta as any).env?.VITE_PUBLIC_SMARTID_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim().length > 0) {
    return envUrl.trim().replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined') {
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
 * Builds an authentic snapshot from the CURRENT LIVE card state.
 * Strictly uses the current card details and never injects demo data.
 */
export function buildCardSnapshot(currentCard: CardState): CardSnapshot {
  const tpl = getTemplateById(currentCard.templateId);

  const identity = {
    id: (currentCard.details.uniqueId || '').trim(),
    name: (currentCard.details.fullName || '').trim(),
    organization: (currentCard.header.orgName || '').trim(),
    department: (currentCard.details.department || '').trim(),
    designation: (currentCard.details.designation || '').trim(),
    cardType: (currentCard.customTemplateName || tpl.name || 'SmartID').trim(),
    validUntil: currentCard.details.showValidity && currentCard.details.validUntil
      ? currentCard.details.validUntil.trim()
      : undefined,
  };

  const design = {
    templateId: currentCard.templateId || tpl.id,
    orientation: currentCard.orientation || tpl.orientation,
    primaryColor: currentCard.colors.primary,
    secondaryColor: currentCard.colors.secondary,
    accentColor: currentCard.colors.accent,
    textColor: currentCard.colors.textLight || '#FFFFFF',
    fontFamily: currentCard.fontFamily || tpl.fontFamily,
    headerPreset: currentCard.header.preset || tpl.headerPreset,
    footerPreset: currentCard.footer.preset || tpl.footerPreset,
    pattern: currentCard.pattern || tpl.pattern,
    layoutVariant: tpl.layoutVariant,
  };

  const visibleFields: NonNullable<CardSnapshot['visibleFields']> = {};
  if (currentCard.details.showBloodGroup && currentCard.details.bloodGroup) {
    visibleFields.bloodGroup = currentCard.details.bloodGroup.trim();
  }
  if (currentCard.details.showPhone && currentCard.details.phone) {
    visibleFields.phone = currentCard.details.phone.trim();
  }
  if (currentCard.details.showEmergencyContact && currentCard.details.emergencyContact) {
    visibleFields.emergencyContact = currentCard.details.emergencyContact.trim();
  }
  if (currentCard.details.showAddress && currentCard.details.address) {
    visibleFields.address = currentCard.details.address.trim();
  }

  const customFields = currentCard.details.customFields
    ?.filter((f) => f.enabled && f.value)
    .map((f) => ({ id: f.id, label: f.label, value: f.value }));

  return {
    version: 4,
    identity,
    design,
    visibleFields: Object.keys(visibleFields).length > 0 ? visibleFields : undefined,
    customFields: customFields && customFields.length > 0 ? customFields : undefined,
  };
}

/**
 * Converts a CardSnapshot into the compact QR payload format
 */
export function buildCompactPayloadFromSnapshot(snapshot: CardSnapshot): CompactQrPayloadV4 {
  const tpl = getTemplateById(snapshot.design.templateId);

  const payload: CompactQrPayloadV4 = {
    v: 4,
    i: snapshot.identity.id,
    n: snapshot.identity.name,
    o: snapshot.identity.organization || undefined,
    d: snapshot.identity.department || undefined,
    r: snapshot.identity.designation || undefined,
    c: snapshot.identity.cardType || undefined,
    e: snapshot.identity.validUntil || undefined,
    t: snapshot.design.templateId,
    or: snapshot.design.orientation !== tpl.orientation ? snapshot.design.orientation : undefined,
    p: snapshot.design.primaryColor,
    s: snapshot.design.secondaryColor,
    a: snapshot.design.accentColor !== tpl.colors.accent ? snapshot.design.accentColor : undefined,
    tx: snapshot.design.textColor !== '#FFFFFF' ? snapshot.design.textColor : undefined,
    fn: snapshot.design.fontFamily !== tpl.fontFamily ? snapshot.design.fontFamily : undefined,
    hp: snapshot.design.headerPreset !== tpl.headerPreset ? snapshot.design.headerPreset : undefined,
    fp: snapshot.design.footerPreset !== tpl.footerPreset ? snapshot.design.footerPreset : undefined,
    pt: snapshot.design.pattern !== tpl.pattern ? snapshot.design.pattern : undefined,
    bg: snapshot.visibleFields?.bloodGroup,
    ph: snapshot.visibleFields?.phone,
    em: snapshot.visibleFields?.emergencyContact,
    ad: snapshot.visibleFields?.address,
    cf: snapshot.customFields?.map((f) => ({ l: f.label, v: f.value })),
  };

  return payload;
}

/**
 * Encodes CardSnapshot into compact URL-safe Base64 string
 */
export function buildVerificationPayload(snapshot: CardSnapshot): string {
  const compact = buildCompactPayloadFromSnapshot(snapshot);
  return encodeBase64Url(compact);
}

/**
 * Legacy wrapper: builds payload from CardState
 */
export function buildQrPayload(card: CardState): CompactQrPayloadV4 {
  const snapshot = buildCardSnapshot(card);
  return buildCompactPayloadFromSnapshot(snapshot);
}

export function encodeQrPayload(payload: CompactQrPayloadV4): string {
  return encodeBase64Url(payload);
}

export function decodeQrPayload(encoded: string): any {
  return decodeBase64Url(encoded);
}

/**
 * Canonical URL Generator:
 * Takes the current CardState, builds an instant snapshot, and creates the verification URL.
 */
export function buildQrVerificationUrl(card: CardState): string {
  const baseUrl = getSmartIdBaseUrl();
  const snapshot = buildCardSnapshot(card);
  const encoded = buildVerificationPayload(snapshot);
  const verificationUrl = `${baseUrl}/#/verify?d=${encoded}`;

  if (process.env.NODE_ENV !== 'production' || typeof window !== 'undefined') {
    console.log('[SmartID QR] Snapshot ID:', snapshot.identity.id, '| Name:', snapshot.identity.name);
    console.log('[SmartID QR] Generated URL:', verificationUrl);
  }

  return verificationUrl;
}

/**
 * Restores authentic CardState from URL-safe verification payload.
 * Strictly uses payload attributes and never loads demo data fallbacks.
 * Returns { card: null, status: 'INVALID' } if payload cannot be decoded.
 */
export function restoreCardFromPayload(encodedData: string): {
  card: CardState | null;
  status: 'VALID' | 'EXPIRED' | 'INVALID';
  reason?: string;
} {
  try {
    if (!encodedData || typeof encodedData !== 'string' || encodedData.trim() === '' || encodedData === 'plain') {
      return { card: null, status: 'INVALID', reason: 'Missing QR payload data' };
    }

    const parsed = decodeBase64Url(encodedData);
    if (!parsed || typeof parsed !== 'object') {
      return { card: null, status: 'INVALID', reason: 'Malformed payload data' };
    }

    // Identify template ID
    const templateId = parsed.t || parsed.tpl || parsed.templateId;
    if (!templateId) {
      return { card: null, status: 'INVALID', reason: 'Missing template identifier in QR payload' };
    }

    const tpl = getTemplateById(templateId);
    const baseState = getTemplateCardState(tpl);

    // Extract exact values from payload (v4, v3 or legacy v2)
    const uniqueId = parsed.i || parsed.id || '';
    const fullName = parsed.n || parsed.name || '';
    const organization = parsed.o || parsed.org || '';
    const department = parsed.d || parsed.dept || '';
    const designation = parsed.r || parsed.role || '';
    const validUntil = parsed.e || parsed.exp || parsed.validUntil || '';
    const cardType = parsed.c || parsed.cardType || tpl.name;

    const primaryColor = parsed.p || parsed.c?.[0] || parsed.theme?.primary || baseState.colors.primary;
    const secondaryColor = parsed.s || parsed.c?.[1] || parsed.theme?.secondary || baseState.colors.secondary;
    const accentColor = parsed.a || parsed.c?.[2] || parsed.theme?.accent || baseState.colors.accent;
    const textLight = parsed.tx || baseState.colors.textLight;

    const colors: ColorScheme = {
      primary: primaryColor,
      secondary: secondaryColor,
      accent: accentColor,
      background: baseState.colors.background,
      textDark: baseState.colors.textDark,
      textLight: textLight,
      headerBg: primaryColor,
      footerBg: secondaryColor,
    };

    // Construct authentic CardState. NO hardcoded demo person identity values!
    const restored: CardState = {
      ...baseState,
      templateId: tpl.id,
      customTemplateName: cardType,
      orientation: parsed.or || parsed.ori || parsed.orientation || tpl.orientation,
      colors,
      pattern: parsed.pt || parsed.p || parsed.theme?.pattern || tpl.pattern,
      fontFamily: parsed.fn || parsed.c?.[3] || parsed.theme?.font || tpl.fontFamily,
      photoUrl: '', // Avatar initials are displayed; large photo base64 is deliberately omitted from QR
      header: {
        ...baseState.header,
        orgName: organization,
        preset: parsed.hp || baseState.header.preset,
        bgColor: colors.headerBg,
      },
      footer: {
        ...baseState.footer,
        preset: parsed.fp || baseState.footer.preset,
        bgColor: colors.footerBg,
      },
      details: {
        ...baseState.details,
        fullName: fullName,
        uniqueId: uniqueId,
        department: department,
        designation: designation,
        validUntil: validUntil,
        bloodGroup: parsed.bg || '',
        phone: parsed.ph || '',
        emergencyContact: parsed.em || '',
        address: parsed.ad || '',
        showBloodGroup: !!parsed.bg,
        showPhone: !!parsed.ph,
        showEmergencyContact: !!parsed.em,
        showAddress: !!parsed.ad,
        showValidity: !!validUntil,
        showDepartment: !!department,
        showDesignation: !!designation,
        customFields: parsed.cf
          ? parsed.cf.map((f: any, idx: number) => ({
              id: `cf_${idx}`,
              label: f.l,
              value: f.v,
              enabled: true,
            }))
          : (baseState.details.customFields || []),
      },
    };

    // Calculate status: VALID or EXPIRED
    let status: 'VALID' | 'EXPIRED' | 'INVALID' = 'VALID';
    if (validUntil) {
      const expDate = new Date(validUntil);
      if (!isNaN(expDate.getTime())) {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        if (expDate < now) {
          status = 'EXPIRED';
        }
      }
    }

    return { card: restored, status };
  } catch (err: any) {
    console.error('[SmartID QR] Failed to decode verification payload:', err);
    return { card: null, status: 'INVALID', reason: err?.message || 'Decode error' };
  }
}

export const buildVerificationUrl = buildQrVerificationUrl;
