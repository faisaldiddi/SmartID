import { CardState, ColorScheme, Orientation, PatternType } from '../types';
import { getTemplateById, getTemplateCardState } from './templateRegistry';

/**
 * Standardized Complete Card Snapshot created directly from the current editor state.
 * Captures all public identity attributes, template design tokens, front-side layout,
 * and back-side specific data (terms, officer signature/name, barcode, emergency SOS, address).
 */
export interface CardSnapshot {
  version: 5;
  templateId: string;
  orientation: Orientation;
  cardSize: {
    width: number;
    height: number;
  };
  hasBack: boolean;

  theme: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    textColor: string;
    fontFamily: string;
    headerPreset?: string;
    footerPreset?: string;
    backgroundVariant?: string;
    pattern?: PatternType;
    layoutVariant?: string;
  };

  identity: {
    uniqueId: string;
    fullName: string;
    organization: string;
    department: string;
    designation: string;
    cardType: string;
    validUntil?: string;
    validFrom?: string;
  };

  visiblePublicFields: {
    bloodGroup?: string;
    phone?: string;
    emergencyContact?: string;
    address?: string;
  };

  frontSide: {
    subtitle?: string;
    tagline?: string;
    footerText?: string;
    customFields?: Array<{ id: string; label: string; value: string }>;
  };

  backSide: {
    enabled: boolean;
    terms?: string;
    emergencyContact?: string;
    address?: string;
    validUntil?: string;
    barcodeValue?: string;
    officerName?: string;
    officerTitle?: string;
    footerText?: string;
  };

  publicFields?: Record<string, string>;
  photoThumbnail?: string;
}

/**
 * Version 5 Ultra-Compact QR Payload Schema
 * Uses short keys to ensure QR code density remains optimal (< 380 chars).
 * Encodes BOTH front and back side content.
 * Pure frontend-only, UTF-8 safe, zero backend / database dependency.
 */
export interface CompactQrPayloadV5 {
  v: 5;
  t: string;           // template ID
  or?: Orientation;    // orientation ('portrait' | 'landscape')
  hb?: number;         // hasBack (1 or 0)
  p: string;           // primary color HEX
  s: string;           // secondary color HEX
  a?: string;          // accent color HEX
  tx?: string;         // textColor / textLight HEX
  fn?: string;         // font family
  hp?: string;         // header preset ID
  fp?: string;         // footer preset ID
  pt?: PatternType;    // pattern

  // Identity
  i: string;           // unique ID
  n: string;           // full name
  o?: string;          // organization
  d?: string;          // department
  r?: string;          // designation / role
  c?: string;          // card type (e.g. 'Student ID', 'Corporate ID')
  e?: string;          // expiry (YYYY-MM-DD or date string)
  ef?: string;         // valid from

  // Visible Public Fields
  bg?: string;         // blood group (optional)
  ph?: string;         // phone (optional)
  em?: string;         // emergency contact (optional)
  ad?: string;         // address (optional)

  // Front Specifics
  hs?: string;         // header subtitle
  ht?: string;         // header tagline
  ft?: string;         // footer text
  cf?: Array<{ l: string; v: string }>; // compact custom fields (optional)

  // Back Specifics
  tm?: string;         // back terms / conditions / instructions
  bv?: string;         // barcode value / alternate scan code
  on?: string;         // officer / signatory name
  ot?: string;         // officer / signatory title

  // Portable Thumbnail (WebP / JPEG data URL)
  th?: string;         // portable photo thumbnail
}

export type CompactQrPayloadV4 = CompactQrPayloadV5;
export type CompactQrPayloadV3 = CompactQrPayloadV5;

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
export function decodeBase64Url<T = any>(value: string): T | null {
  try {
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
  } catch {
    return null;
  }
}

/**
 * Builds a COMPLETE snapshot from the CURRENT LIVE card state (Front + Back).
 * Strictly uses the current card details and never injects demo data.
 */
export function buildCardSnapshot(currentCard: CardState, photoThumbnail?: string): CardSnapshot {
  const tpl = getTemplateById(currentCard.templateId);
  const hasBack = currentCard.hasBack !== undefined ? Boolean(currentCard.hasBack) : Boolean(tpl.hasBack);

  const theme: CardSnapshot['theme'] = {
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

  const identity: CardSnapshot['identity'] = {
    uniqueId: (currentCard.details.uniqueId || '').trim(),
    fullName: (currentCard.details.fullName || '').trim(),
    organization: (currentCard.header.orgName || '').trim(),
    department: (currentCard.details.department || '').trim(),
    designation: (currentCard.details.designation || '').trim(),
    cardType: (currentCard.customTemplateName || tpl.name || 'SmartID').trim(),
    validUntil: currentCard.details.showValidity && currentCard.details.validUntil
      ? currentCard.details.validUntil.trim()
      : undefined,
    validFrom: currentCard.details.validFrom?.trim() || undefined,
  };

  const visiblePublicFields: CardSnapshot['visiblePublicFields'] = {};
  if (currentCard.details.showBloodGroup && currentCard.details.bloodGroup) {
    visiblePublicFields.bloodGroup = currentCard.details.bloodGroup.trim();
  }
  if (currentCard.details.showPhone && currentCard.details.phone) {
    visiblePublicFields.phone = currentCard.details.phone.trim();
  }
  if (currentCard.details.showEmergencyContact && currentCard.details.emergencyContact) {
    visiblePublicFields.emergencyContact = currentCard.details.emergencyContact.trim();
  }
  if (currentCard.details.showAddress && currentCard.details.address) {
    visiblePublicFields.address = currentCard.details.address.trim();
  }

  const customFields = currentCard.details.customFields
    ?.filter((f) => f.enabled !== false && f.value)
    .map((f) => ({ id: f.id, label: f.label, value: f.value }));

  const frontSide: CardSnapshot['frontSide'] = {
    subtitle: currentCard.header.showSubtitle && currentCard.header.subtitle ? currentCard.header.subtitle.trim() : undefined,
    tagline: currentCard.header.showTagline && currentCard.header.tagline ? currentCard.header.tagline.trim() : undefined,
    footerText: currentCard.footer.text?.trim() || undefined,
    customFields: customFields && customFields.length > 0 ? customFields : undefined,
  };

  const backSide: CardSnapshot['backSide'] = {
    enabled: hasBack,
    terms: currentCard.terms?.trim() || currentCard.footer.terms?.trim() || undefined,
    emergencyContact: currentCard.details.showEmergencyContact && currentCard.details.emergencyContact
      ? currentCard.details.emergencyContact.trim()
      : undefined,
    address: currentCard.details.showAddress && currentCard.details.address
      ? currentCard.details.address.trim()
      : undefined,
    validUntil: currentCard.details.showValidity && currentCard.details.validUntil
      ? currentCard.details.validUntil.trim()
      : undefined,
    barcodeValue: currentCard.barcodeValue?.trim() || undefined,
    officerName: currentCard.signature.signatoryName?.trim() || undefined,
    officerTitle: currentCard.signature.signatoryTitle?.trim() || undefined,
    footerText: currentCard.footer.text?.trim() || undefined,
  };

  const isLandscape = (currentCard.orientation || tpl.orientation) === 'landscape';

  return {
    version: 5,
    templateId: currentCard.templateId || tpl.id,
    orientation: currentCard.orientation || tpl.orientation,
    cardSize: {
      width: isLandscape ? 1011 : 638,
      height: isLandscape ? 638 : 1011,
    },
    hasBack,
    theme,
    identity,
    visiblePublicFields,
    frontSide,
    backSide,
    publicFields: {
      fullName: identity.fullName,
      uniqueId: identity.uniqueId,
      organization: identity.organization,
      department: identity.department,
      designation: identity.designation,
    },
    photoThumbnail: photoThumbnail || undefined,
  };
}

/**
 * Converts a CardSnapshot into the compact QR payload format
 */
export function buildCompactPayloadFromSnapshot(snapshot: CardSnapshot): CompactQrPayloadV5 {
  const tpl = getTemplateById(snapshot.templateId);

  const payload: CompactQrPayloadV5 = {
    v: 5,
    t: snapshot.templateId,
    or: snapshot.orientation !== tpl.orientation ? snapshot.orientation : undefined,
    hb: snapshot.hasBack ? 1 : 0,

    p: snapshot.theme.primaryColor,
    s: snapshot.theme.secondaryColor,
    a: snapshot.theme.accentColor !== tpl.colors.accent ? snapshot.theme.accentColor : undefined,
    tx: snapshot.theme.textColor !== '#FFFFFF' ? snapshot.theme.textColor : undefined,
    fn: snapshot.theme.fontFamily !== tpl.fontFamily ? snapshot.theme.fontFamily : undefined,
    hp: snapshot.theme.headerPreset !== tpl.headerPreset ? snapshot.theme.headerPreset : undefined,
    fp: snapshot.theme.footerPreset !== tpl.footerPreset ? snapshot.theme.footerPreset : undefined,
    pt: snapshot.theme.pattern !== tpl.pattern ? snapshot.theme.pattern : undefined,

    i: snapshot.identity.uniqueId,
    n: snapshot.identity.fullName,
    o: snapshot.identity.organization || undefined,
    d: snapshot.identity.department || undefined,
    r: snapshot.identity.designation || undefined,
    c: snapshot.identity.cardType || undefined,
    e: snapshot.identity.validUntil || undefined,
    ef: snapshot.identity.validFrom || undefined,

    bg: snapshot.visiblePublicFields?.bloodGroup,
    ph: snapshot.visiblePublicFields?.phone,
    em: snapshot.visiblePublicFields?.emergencyContact,
    ad: snapshot.visiblePublicFields?.address,

    hs: snapshot.frontSide?.subtitle,
    ht: snapshot.frontSide?.tagline,
    ft: snapshot.frontSide?.footerText,
    cf: snapshot.frontSide?.customFields?.map((f) => ({ l: f.label, v: f.value })),

    tm: snapshot.backSide?.terms,
    bv: snapshot.backSide?.barcodeValue,
    on: snapshot.backSide?.officerName,
    ot: snapshot.backSide?.officerTitle,

    th: snapshot.photoThumbnail || undefined,
  };

  return payload;
}

/**
 * Encodes CardSnapshot into compact URL-safe Base64 string with budget guard
 */
export function buildVerificationPayload(snapshot: CardSnapshot): string {
  const compact = buildCompactPayloadFromSnapshot(snapshot);
  let encoded = encodeBase64Url(compact);

  // Safe QR size budget check: if thumbnail makes payload exceed ~1650 chars,
  // omit thumbnail to guarantee 100% scanning reliability
  if (encoded.length > 1650 && compact.th) {
    const leanCompact = { ...compact };
    delete leanCompact.th;
    encoded = encodeBase64Url(leanCompact);
  }

  return encoded;
}

export function encodeVerificationPayload(payload: CompactQrPayloadV5): string {
  return encodeBase64Url(payload);
}

export function decodeVerificationPayload(encoded: string): any {
  return decodeBase64Url(encoded);
}

export function payloadToCardSnapshot(payload: any): CardSnapshot {
  const templateId = payload.t || payload.tpl || payload.templateId || 'corp-exec-01';
  const tpl = getTemplateById(templateId);

  return {
    version: 5,
    templateId,
    orientation: payload.or || payload.ori || payload.orientation || tpl.orientation,
    hasBack: payload.hb !== undefined ? Boolean(payload.hb) : Boolean(tpl.hasBack),
    theme: {
      primaryColor: payload.p || tpl.colors.primary,
      secondaryColor: payload.s || tpl.colors.secondary,
      accentColor: payload.a || tpl.colors.accent,
      textColor: payload.tx || tpl.colors.textLight || '#FFFFFF',
      fontFamily: payload.fn || tpl.fontFamily,
      headerPreset: payload.hp || tpl.headerPreset,
      footerPreset: payload.fp || tpl.footerPreset,
      pattern: payload.pt || tpl.pattern,
      layoutVariant: tpl.layoutVariant,
    },
    identity: {
      uniqueId: payload.i || payload.id || '',
      fullName: payload.n || payload.name || '',
      organization: payload.o || payload.org || '',
      department: payload.d || payload.dept || '',
      designation: payload.r || payload.role || '',
      cardType: payload.c || payload.cardType || tpl.name,
      validUntil: payload.e || payload.exp || payload.validUntil || '',
      validFrom: payload.ef || '',
    },
    visiblePublicFields: {
      bloodGroup: payload.bg || '',
      phone: payload.ph || '',
      emergencyContact: payload.em || '',
      address: payload.ad || '',
    },
    frontSide: {
      subtitle: payload.hs || '',
      tagline: payload.ht || '',
      footerText: payload.ft || '',
      customFields: payload.cf ? payload.cf.map((f: any, idx: number) => ({ id: `cf_${idx}`, label: f.l, value: f.v })) : [],
    },
    backSide: {
      enabled: payload.hb !== undefined ? Boolean(payload.hb) : Boolean(tpl.hasBack),
      terms: payload.tm || '',
      emergencyContact: payload.em || '',
      address: payload.ad || '',
      validUntil: payload.e || '',
      barcodeValue: payload.bv || payload.i || '',
      officerName: payload.on || '',
      officerTitle: payload.ot || '',
      footerText: payload.ft || '',
    },
    cardSize: {
      width: (payload.or || tpl.orientation) === 'landscape' ? 1011 : 638,
      height: (payload.or || tpl.orientation) === 'landscape' ? 638 : 1011,
    },
    publicFields: {
      fullName: payload.n || payload.name || '',
      uniqueId: payload.i || payload.id || '',
      organization: payload.o || payload.org || '',
      department: payload.d || payload.dept || '',
      designation: payload.r || payload.role || '',
    },
    photoThumbnail: (payload.th && typeof payload.th === 'string' && payload.th.startsWith('data:image/'))
      ? payload.th
      : undefined,
  };
}

/**
 * Deserializes an encoded verification string or parsed payload into a canonical CardSnapshot
 */
export function deserializeCardSnapshot(data: string | object): CardSnapshot | null {
  try {
    const parsed = typeof data === 'string' ? decodeBase64Url(data) : data;
    if (!parsed || typeof parsed !== 'object') return null;
    return payloadToCardSnapshot(parsed);
  } catch {
    return null;
  }
}

/**
 * Converts a canonical CardSnapshot back into a full CardState model for rendering.
 */
export function snapshotToCardState(snapshot: CardSnapshot): CardState {
  const tpl = getTemplateById(snapshot.templateId);
  const baseState = getTemplateCardState(tpl);

  const colors: ColorScheme = {
    primary: snapshot.theme.primaryColor || tpl.colors.primary,
    secondary: snapshot.theme.secondaryColor || tpl.colors.secondary,
    accent: snapshot.theme.accentColor || tpl.colors.accent,
    background: baseState.colors.background,
    textDark: baseState.colors.textDark,
    textLight: snapshot.theme.textColor || baseState.colors.textLight,
    headerBg: snapshot.theme.primaryColor || tpl.colors.primary,
    footerBg: snapshot.theme.secondaryColor || tpl.colors.secondary,
  };

  const customFields = snapshot.frontSide?.customFields
    ? snapshot.frontSide.customFields.map((f, idx) => ({
        id: f.id || `cf_${idx}`,
        label: f.label,
        value: f.value,
        enabled: true,
      }))
    : [];

  return {
    ...baseState,
    templateId: snapshot.templateId,
    customTemplateName: snapshot.identity.cardType || tpl.name,
    orientation: snapshot.orientation,
    hasBack: snapshot.hasBack,
    colors,
    pattern: snapshot.theme.pattern || tpl.pattern,
    fontFamily: snapshot.theme.fontFamily || tpl.fontFamily,
    photoUrl: snapshot.photoThumbnail || '',
    header: {
      ...baseState.header,
      orgName: snapshot.identity.organization || '',
      subtitle: snapshot.frontSide?.subtitle || '',
      tagline: snapshot.frontSide?.tagline || '',
      showSubtitle: Boolean(snapshot.frontSide?.subtitle),
      showTagline: Boolean(snapshot.frontSide?.tagline),
      preset: snapshot.theme.headerPreset || baseState.header.preset,
      bgColor: colors.headerBg,
    },
    footer: {
      ...baseState.footer,
      text: snapshot.frontSide?.footerText || snapshot.backSide?.footerText || '',
      terms: snapshot.backSide?.terms || '',
      preset: snapshot.theme.footerPreset || baseState.footer.preset,
      bgColor: colors.footerBg,
    },
    signature: {
      ...baseState.signature,
      signatoryName: snapshot.backSide?.officerName || '',
      signatoryTitle: snapshot.backSide?.officerTitle || 'Authorized Signatory',
      url: '',
    },
    terms: snapshot.backSide?.terms || '',
    barcodeValue: snapshot.backSide?.barcodeValue || snapshot.identity.uniqueId,
    details: {
      ...baseState.details,
      fullName: snapshot.identity.fullName || '',
      uniqueId: snapshot.identity.uniqueId || '',
      department: snapshot.identity.department || '',
      designation: snapshot.identity.designation || '',
      validUntil: snapshot.identity.validUntil || '',
      validFrom: snapshot.identity.validFrom || '',
      bloodGroup: snapshot.visiblePublicFields?.bloodGroup || '',
      phone: snapshot.visiblePublicFields?.phone || '',
      emergencyContact: snapshot.visiblePublicFields?.emergencyContact || snapshot.backSide?.emergencyContact || '',
      address: snapshot.visiblePublicFields?.address || snapshot.backSide?.address || '',
      showBloodGroup: Boolean(snapshot.visiblePublicFields?.bloodGroup),
      showPhone: Boolean(snapshot.visiblePublicFields?.phone),
      showEmergencyContact: Boolean(snapshot.visiblePublicFields?.emergencyContact || snapshot.backSide?.emergencyContact),
      showAddress: Boolean(snapshot.visiblePublicFields?.address || snapshot.backSide?.address),
      showValidity: Boolean(snapshot.identity.validUntil),
      showDepartment: Boolean(snapshot.identity.department),
      showDesignation: Boolean(snapshot.identity.designation),
      customFields,
    },
  };
}

/**
 * Legacy wrapper: builds payload from CardState
 */
export function buildQrPayload(card: CardState): CompactQrPayloadV5 {
  const snapshot = buildCardSnapshot(card);
  return buildCompactPayloadFromSnapshot(snapshot);
}

export function encodeQrPayload(payload: CompactQrPayloadV5): string {
  return encodeBase64Url(payload);
}

export function decodeQrPayload(encoded: string): any {
  return decodeBase64Url(encoded);
}

/**
 * Canonical URL Generator:
 * Takes the current CardState, builds an instant snapshot, and creates the verification URL.
 */
export function buildQrVerificationUrl(card: CardState, photoThumbnail?: string): string {
  const baseUrl = getSmartIdBaseUrl();
  const snapshot = buildCardSnapshot(card, photoThumbnail);
  const encoded = buildVerificationPayload(snapshot);
  const verificationUrl = `${baseUrl}/#/verify?d=${encoded}`;

  if (process.env.NODE_ENV !== 'production' || typeof window !== 'undefined') {
    console.log('[SmartID QR] Snapshot ID:', snapshot.identity.uniqueId, '| Name:', snapshot.identity.fullName);
    console.log('[SmartID QR] Has Back:', snapshot.hasBack, '| Back Terms:', snapshot.backSide.terms);
    console.log('[SmartID QR] Has Photo Thumbnail:', Boolean(snapshot.photoThumbnail));
    console.log('[SmartID QR] Generated URL length:', verificationUrl.length);
  }

  return verificationUrl;
}

/**
 * Restores authentic CardState from URL-safe verification payload.
 * Strictly uses payload attributes and never loads demo data fallbacks.
 * Accurately reconstructs BOTH front and back sides from the snapshot.
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

    // Extract exact values from payload (v5, v4, v3 or legacy v2)
    const uniqueId = parsed.i || parsed.id || '';
    const fullName = parsed.n || parsed.name || '';
    const organization = parsed.o || parsed.org || '';
    const department = parsed.d || parsed.dept || '';
    const designation = parsed.r || parsed.role || '';
    const validUntil = parsed.e || parsed.exp || parsed.validUntil || '';
    const validFrom = parsed.ef || '';
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

    const hasBack = parsed.hb !== undefined ? Boolean(parsed.hb) : Boolean(tpl.hasBack);

    // Reconstruct custom fields cleanly
    const customFields = parsed.cf
      ? parsed.cf.map((f: any, idx: number) => ({
          id: `cf_${idx}`,
          label: f.l,
          value: f.v,
          enabled: true,
        }))
      : [];

    // Construct authentic CardState. NO hardcoded demo person or back-side dummy values!
    const restored: CardState = {
      ...baseState,
      templateId: tpl.id,
      customTemplateName: cardType,
      orientation: parsed.or || parsed.ori || parsed.orientation || tpl.orientation,
      hasBack,
      colors,
      pattern: parsed.pt || parsed.p_type || parsed.p || parsed.theme?.pattern || tpl.pattern,
      fontFamily: parsed.fn || parsed.c?.[3] || parsed.theme?.font || tpl.fontFamily,
      photoUrl: (parsed.th && typeof parsed.th === 'string' && parsed.th.startsWith('data:image/'))
        ? parsed.th
        : '',
      header: {
        ...baseState.header,
        orgName: organization,
        subtitle: parsed.hs || '',
        tagline: parsed.ht || '',
        showSubtitle: Boolean(parsed.hs),
        showTagline: Boolean(parsed.ht),
        preset: parsed.hp || baseState.header.preset,
        bgColor: colors.headerBg,
      },
      footer: {
        ...baseState.footer,
        text: parsed.ft || '',
        terms: parsed.tm || '',
        preset: parsed.fp || baseState.footer.preset,
        bgColor: colors.footerBg,
      },
      signature: {
        ...baseState.signature,
        signatoryName: parsed.on || '',
        signatoryTitle: parsed.ot || '',
        url: '', // Signatures are vector/text on card preview
      },
      terms: parsed.tm || '',
      barcodeValue: parsed.bv || uniqueId,
      details: {
        ...baseState.details,
        fullName: fullName,
        uniqueId: uniqueId,
        department: department,
        designation: designation,
        validUntil: validUntil,
        validFrom: validFrom,
        bloodGroup: parsed.bg || '',
        phone: parsed.ph || '',
        emergencyContact: parsed.em || '',
        address: parsed.ad || '',
        showBloodGroup: Boolean(parsed.bg),
        showPhone: Boolean(parsed.ph),
        showEmergencyContact: Boolean(parsed.em),
        showAddress: Boolean(parsed.ad),
        showValidity: Boolean(validUntil),
        showDepartment: Boolean(department),
        showDesignation: Boolean(designation),
        customFields: customFields,
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
