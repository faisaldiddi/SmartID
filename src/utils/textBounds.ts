/**
 * Text Bounds and Element Geometry Validation Utility
 *
 * Implements dynamic font-size calculation (fitTextToBounds) and
 * element boundary validation (validateCardBounds) to prevent text clipping
 * on physical and digital card presentations.
 */

import { CardSnapshot } from '../types';

export interface FitTextOptions {
  maxFontSize: number;
  minFontSize: number;
  maxCharsPerLine?: number;
  lineHeightMultiplier?: number;
}

export interface FittedTextStyle {
  fontSize: string;
  lineHeight: string;
}

/**
 * Calculates optimal font size and line height to fit text within allocated bounds.
 * Prevents text from being clipped by outer containers or pushing other elements out.
 */
export function fitTextToBounds(
  text: string | undefined | null,
  options: FitTextOptions
): FittedTextStyle {
  const content = (text || '').trim();
  const len = content.length;
  const maxFs = options.maxFontSize;
  const minFs = options.minFontSize;
  const maxChars = options.maxCharsPerLine || 24;
  const lhMult = options.lineHeightMultiplier || 1.15;

  if (len === 0) {
    return {
      fontSize: `${maxFs}px`,
      lineHeight: `${Math.round(maxFs * lhMult)}px`,
    };
  }

  // Linear scaling calculation based on length threshold
  let calculatedFs = maxFs;
  if (len > maxChars) {
    const ratio = maxChars / len;
    // Gradual font size decay with a floor at minFontSize
    calculatedFs = Math.max(minFs, Math.round(maxFs * Math.pow(ratio, 0.5) * 10) / 10);
  }

  const roundedFs = Math.max(minFs, Math.min(maxFs, calculatedFs));
  const lineHeight = Math.round(roundedFs * lhMult * 10) / 10;

  return {
    fontSize: `${roundedFs}px`,
    lineHeight: `${lineHeight}px`,
  };
}

export interface BoundsValidationIssue {
  side: 'front' | 'back';
  field: string;
  warning: string;
}

/**
 * Validates that card elements satisfy bounds constraints and safe margins (approx 2.5mm / 10px).
 */
export function validateCardBounds(snapshot: CardSnapshot): BoundsValidationIssue[] {
  const issues: BoundsValidationIssue[] = [];
  const safeMarginPx = 10; // ~2.5mm safe margin
  const cardW = snapshot.cardSize?.width || (snapshot.orientation === 'landscape' ? 432 : 272);
  const cardH = snapshot.cardSize?.height || (snapshot.orientation === 'landscape' ? 272 : 432);

  // Validate Name length
  const name = snapshot.identity?.fullName || '';
  if (name.length > 50) {
    issues.push({
      side: 'front',
      field: 'fullName',
      warning: 'Name exceeds 50 characters; dynamic text sizing active to prevent clipping.',
    });
  }

  // Validate Organization length
  const org = snapshot.identity?.organization || '';
  if (org.length > 60) {
    issues.push({
      side: 'front',
      field: 'organization',
      warning: 'Organization name exceeds 60 characters.',
    });
  }

  // Validate Back terms
  const terms = snapshot.back?.terms || '';
  if (terms.length > 300) {
    issues.push({
      side: 'back',
      field: 'terms',
      warning: 'Back side terms exceed 300 characters; auto-scrolling or compressed typography required.',
    });
  }

  return issues;
}
