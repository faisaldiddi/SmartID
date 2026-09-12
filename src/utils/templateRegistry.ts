import { TEMPLATES, getTemplateCardState } from '../data/templates';
import { TemplateDesign, CardState, CardRenderModel } from '../types';

export { getTemplateCardState };

/**
 * Normalizes template ID string for flexible, robust matching
 */
function normalizeKey(id: string): string {
  return (id || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Central Template Registry
 * Maps canonical template IDs and standard user aliases to their exact TemplateDesign.
 */
export const templateRegistry: Record<string, TemplateDesign> = {};

// Register all 60 built-in templates
TEMPLATES.forEach((tpl, index) => {
  const normId = normalizeKey(tpl.id);
  const normName = normalizeKey(tpl.name);
  
  // 1. Exact ID
  templateRegistry[tpl.id] = tpl;
  templateRegistry[normId] = tpl;

  // 2. Exact Name
  templateRegistry[normName] = tpl;

  // 3. Category + Number aliases (e.g. "college-07", "coll-07", "college-polytechnic-07")
  const cat = tpl.category.toLowerCase();
  const num = (index + 1).toString().padStart(2, '0');
  templateRegistry[normalizeKey(`${cat}-${num}`)] = tpl;
  templateRegistry[normalizeKey(`${cat}-modern-${num}`)] = tpl;
  templateRegistry[normalizeKey(`${cat}-classic-${num}`)] = tpl;
  templateRegistry[normalizeKey(`${cat}-premium-${num}`)] = tpl;
  templateRegistry[normalizeKey(`modern-${cat}-${num}`)] = tpl;
});

// Explicit canonical aliases requested in prompt
const specificAliases: Record<string, string> = {
  'college-modern-07': 'coll-poly-07',
  'modern-college-07': 'coll-poly-07',
  'college-07': 'coll-poly-07',
  'corporate-premium-01': 'corp-exec-01',
  'corporate-01': 'corp-exec-01',
  'school-classic-02': 'sch-blazer-12',
  'security-dark-01': 'sec-guard-41',
};

Object.entries(specificAliases).forEach(([alias, targetId]) => {
  const targetTpl = TEMPLATES.find((t) => t.id === targetId);
  if (targetTpl) {
    templateRegistry[alias] = targetTpl;
    templateRegistry[normalizeKey(alias)] = targetTpl;
  }
});

/**
 * Retrieves a template by ID or canonical alias.
 * Guaranteed to return an authentic TemplateDesign.
 */
export function getTemplateById(id?: string): TemplateDesign {
  if (!id) return TEMPLATES[0];

  const normalized = normalizeKey(id);

  // 1. Direct registry lookup
  if (templateRegistry[id]) return templateRegistry[id];
  if (templateRegistry[normalized]) return templateRegistry[normalized];

  // 2. Case-insensitive lookup in TEMPLATES array
  const found = TEMPLATES.find(
    (t) => normalizeKey(t.id) === normalized || normalizeKey(t.name) === normalized
  );
  if (found) {
    templateRegistry[id] = found;
    return found;
  }

  // 3. Partial / category-based matching
  const partial = TEMPLATES.find((t) => {
    const tNorm = normalizeKey(t.id);
    return normalized.includes(tNorm) || tNorm.includes(normalized);
  });
  if (partial) {
    return partial;
  }

  console.warn(`Template not found: "${id}", using default fallback "${TEMPLATES[0].id}"`);
  return TEMPLATES[0];
}

/**
 * Builds a single canonical CardRenderModel from CardState.
 * This is the SINGLE SOURCE OF TRUTH for:
 * - Editor Live Preview
 * - QR Verification Card
 * - PDF Export
 * - Print Preview & Print Output
 * - PNG/JPEG Export
 */
export function buildCardSnapshot(cardState: CardState): CardRenderModel {
  const tpl = getTemplateById(cardState.templateId);
  const isLandscape = cardState.orientation === 'landscape';

  return {
    templateId: cardState.templateId || tpl.id,
    templateName: cardState.customTemplateName || tpl.name,
    orientation: cardState.orientation,
    hasBack: cardState.hasBack !== undefined ? cardState.hasBack : tpl.hasBack,
    widthMm: isLandscape ? 85.6 : 53.98,
    heightMm: isLandscape ? 53.98 : 85.6,

    personData: {
      fullName: cardState.details.fullName || 'FULL NAME',
      uniqueId: cardState.details.uniqueId || 'ID-0000',
      secondaryId: cardState.details.secondaryId,
      department: cardState.details.department || tpl.category,
      designation: cardState.details.designation || 'Staff Member',
      course: cardState.details.course,
      className: cardState.details.className,
      division: cardState.details.division,
      year: cardState.details.year,
      dob: cardState.details.dob,
      bloodGroup: cardState.details.bloodGroup,
      phone: cardState.details.phone,
      emergencyContact: cardState.details.emergencyContact,
      address: cardState.details.address,
      validFrom: cardState.details.validFrom,
      validUntil: cardState.details.validUntil,
      showSecondaryId: cardState.details.showSecondaryId,
      showDepartment: cardState.details.showDepartment,
      showDesignation: cardState.details.showDesignation,
      showCourse: cardState.details.showCourse,
      showClass: cardState.details.showClass,
      showDivision: cardState.details.showDivision,
      showYear: cardState.details.showYear,
      showDob: cardState.details.showDob,
      showBloodGroup: cardState.details.showBloodGroup,
      showPhone: cardState.details.showPhone,
      showEmergencyContact: cardState.details.showEmergencyContact,
      showAddress: cardState.details.showAddress,
      showValidity: cardState.details.showValidity,
      customFields: cardState.details.customFields || [],
    },

    organizationData: {
      orgName: cardState.header.orgName || tpl.header?.orgName || tpl.name.toUpperCase(),
      subtitle: cardState.header.subtitle || tpl.description,
      tagline: cardState.header.tagline,
      showLogo: cardState.header.showLogo,
      showSubtitle: cardState.header.showSubtitle,
      showTagline: cardState.header.showTagline,
    },

    colors: { ...cardState.colors },
    fontFamily: cardState.fontFamily || tpl.fontFamily || 'Plus Jakarta Sans',
    pattern: cardState.pattern || tpl.pattern || 'none',
    layoutVariant: tpl.layoutVariant || 'standard',
    photoShape: tpl.photoShape || 'rounded',
    headerPreset: tpl.headerPreset || 'Corporate Header',
    footerPreset: tpl.footerPreset || 'Signature Footer',

    photo: {
      url: cardState.photoUrl || tpl.defaultPhotoUrl || '',
      zoom: cardState.photoZoom || 100,
      rotate: cardState.photoRotate || 0,
    },

    logos: {
      primary: cardState.primaryLogo,
      secondary: cardState.secondaryLogo,
    },

    signature: cardState.signature,
    qr: cardState.qr,
    header: cardState.header,
    footer: cardState.footer,
  };
}

/**
 * Converts a canonical CardRenderModel back to CardState
 */
export function renderModelToCardState(model: CardRenderModel): CardState {
  const tpl = getTemplateById(model.templateId);
  const base = getTemplateCardState(tpl);

  return {
    ...base,
    templateId: model.templateId,
    customTemplateName: model.templateName || tpl.name,
    orientation: model.orientation,
    hasBack: model.hasBack,
    details: {
      ...base.details,
      ...model.personData,
    },
    header: {
      ...base.header,
      orgName: model.organizationData.orgName,
      subtitle: model.organizationData.subtitle || base.header.subtitle,
      tagline: model.organizationData.tagline || base.header.tagline,
      showLogo: model.organizationData.showLogo ?? base.header.showLogo,
      showSubtitle: model.organizationData.showSubtitle ?? base.header.showSubtitle,
      showTagline: model.organizationData.showTagline ?? base.header.showTagline,
      bgColor: model.colors.headerBg,
    },
    footer: {
      ...base.footer,
      ...model.footer,
      bgColor: model.colors.footerBg,
    },
    colors: { ...model.colors },
    fontFamily: model.fontFamily,
    pattern: model.pattern,
    photoUrl: model.photo?.url || base.photoUrl,
    photoZoom: model.photo?.zoom || 100,
    photoRotate: model.photo?.rotate || 0,
    primaryLogo: model.logos?.primary || base.primaryLogo,
    secondaryLogo: model.logos?.secondary || base.secondaryLogo,
    signature: model.signature || base.signature,
    qr: model.qr || base.qr,
  };
}
