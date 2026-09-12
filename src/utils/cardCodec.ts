import { CardState, ColorScheme, PatternType, Orientation } from '../types';
import { TEMPLATES, getTemplateCardState } from '../data/templates';

export interface CompactVerificationData {
  id: string;
  name: string;
  role?: string;
  dept?: string;
  org?: string;
  issueDate?: string;
  validUntil?: string;
  bloodGroup?: string;
  phone?: string;
  emergency?: string;
  address?: string;
  dob?: string;
  tplId?: string;
  customTpl?: string;
  orient: Orientation;
  pattern: PatternType;
  font: string;
  colors: [string, string, string, string, string, string, string, string]; // primary, secondary, accent, background, textDark, textLight, headerBg, footerBg
  photo?: string;
  headerSub?: string;
  tagline?: string;
  footerText?: string;
  footerSecondaryText?: string;
  sigName?: string;
  sigTitle?: string;
  customFields?: Array<{ id: string; label: string; value: string; enabled: boolean }>;
}

/**
 * Compactly serializes a card state for encoding into a QR code verification URL.
 */
export function encodeCardForVerification(card: CardState): string {
  try {
    const compact: CompactVerificationData = {
      id: card.details.uniqueId || 'ID-0000',
      name: card.details.fullName || 'Cardholder',
      role: card.details.designation || undefined,
      dept: card.details.department || undefined,
      org: card.header.orgName || undefined,
      issueDate: card.details.validFrom || undefined,
      validUntil: card.details.validUntil || undefined,
      bloodGroup: card.details.bloodGroup || undefined,
      phone: card.details.phone || undefined,
      emergency: card.details.emergencyContact || undefined,
      address: card.details.address || undefined,
      dob: card.details.dob || undefined,
      tplId: card.templateId || undefined,
      customTpl: card.customTemplateName || undefined,
      orient: card.orientation,
      pattern: card.pattern,
      font: card.fontFamily,
      colors: [
        card.colors.primary,
        card.colors.secondary,
        card.colors.accent,
        card.colors.background,
        card.colors.textDark,
        card.colors.textLight,
        card.colors.headerBg,
        card.colors.footerBg,
      ],
      photo: card.photoUrl && card.photoUrl.length < 500 ? card.photoUrl : undefined,
      headerSub: card.header.subtitle || undefined,
      tagline: card.header.tagline || undefined,
      footerText: card.footer.text || undefined,
      footerSecondaryText: card.footer.secondaryText || undefined,
      sigName: card.signature.signatoryName || undefined,
      sigTitle: card.signature.signatoryTitle || undefined,
      customFields: card.details.customFields?.length ? card.details.customFields : undefined,
    };

    const json = JSON.stringify(compact);
    // Base64 URL safe
    return btoa(unescape(encodeURIComponent(json)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  } catch (err) {
    console.error('Failed to encode card state:', err);
    return '';
  }
}

/**
 * Decodes a compacted string from a QR code verification URL back into a full CardState.
 */
export function decodeCardFromVerification(encodedStr: string): CardState | null {
  try {
    let base64 = encodedStr.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const json = decodeURIComponent(escape(atob(base64)));
    const c: CompactVerificationData = JSON.parse(json);

    // Find base template or fallback to first
    const baseTpl = TEMPLATES.find((t) => t.id === c.tplId) || TEMPLATES[0];
    const baseState = getTemplateCardState(baseTpl);

    const colors: ColorScheme = {
      primary: c.colors?.[0] || baseState.colors.primary,
      secondary: c.colors?.[1] || baseState.colors.secondary,
      accent: c.colors?.[2] || baseState.colors.accent,
      background: c.colors?.[3] || baseState.colors.background,
      textDark: c.colors?.[4] || baseState.colors.textDark,
      textLight: c.colors?.[5] || baseState.colors.textLight,
      headerBg: c.colors?.[6] || baseState.colors.headerBg,
      footerBg: c.colors?.[7] || baseState.colors.footerBg,
    };

    const cardState: CardState = {
      ...baseState,
      templateId: c.tplId || baseState.templateId,
      customTemplateName: c.customTpl || baseState.customTemplateName,
      orientation: c.orient || baseState.orientation,
      colors,
      pattern: c.pattern || baseState.pattern,
      fontFamily: c.font || baseState.fontFamily,
      details: {
        ...baseState.details,
        fullName: c.name || baseState.details.fullName,
        uniqueId: c.id || baseState.details.uniqueId,
        designation: c.role || baseState.details.designation,
        department: c.dept || baseState.details.department,
        validFrom: c.issueDate || baseState.details.validFrom,
        validUntil: c.validUntil || baseState.details.validUntil,
        bloodGroup: c.bloodGroup || baseState.details.bloodGroup,
        phone: c.phone || baseState.details.phone,
        emergencyContact: c.emergency || baseState.details.emergencyContact,
        address: c.address || baseState.details.address,
        dob: c.dob || baseState.details.dob,
        showBloodGroup: !!c.bloodGroup,
        showPhone: !!c.phone,
        showEmergencyContact: !!c.emergency,
        showAddress: !!c.address,
        showValidity: !!c.validUntil,
        showDob: !!c.dob,
        customFields: c.customFields || baseState.details.customFields,
      },
      header: {
        ...baseState.header,
        orgName: c.org || baseState.header.orgName,
        subtitle: c.headerSub || baseState.header.subtitle,
        tagline: c.tagline || baseState.header.tagline,
        showSubtitle: !!c.headerSub,
        showTagline: !!c.tagline,
      },
      footer: {
        ...baseState.footer,
        text: c.footerText || baseState.footer.text,
        secondaryText: c.footerSecondaryText || baseState.footer.secondaryText,
      },
      signature: {
        ...baseState.signature,
        signatoryName: c.sigName || baseState.signature.signatoryName,
        signatoryTitle: c.sigTitle || baseState.signature.signatoryTitle,
      },
      photoUrl: c.photo || baseState.photoUrl,
    };

    return cardState;
  } catch (err) {
    console.error('Failed to decode verification string:', err);
    return null;
  }
}
