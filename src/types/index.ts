export type Orientation = 'portrait' | 'landscape';
export type CardSide = 'front' | 'back';
export type PrintMode = 'cr80' | 'a4';

export type CardCategory = 
  | 'Corporate'
  | 'College'
  | 'School'
  | 'Hospital'
  | 'Employee'
  | 'Student'
  | 'Event'
  | 'Volunteer'
  | 'Security'
  | 'Worker'
  | 'Minimal'
  | 'Modern'
  | 'Premium'
  | 'VIP'
  | 'Press';

export type TemplateCategory = CardCategory | string;

export type PatternType = 
  | 'none'
  | 'solid'
  | 'gradient'
  | 'wave'
  | 'geometric'
  | 'dots'
  | 'lines'
  | 'abstract'
  | 'stripes';

export interface CustomField {
  id: string;
  label: string;
  value: string;
  enabled: boolean;
}

export interface CardPersonDetails {
  fullName: string;
  uniqueId: string;
  secondaryId: string; // Student ID / Employee ID / Roll No
  department: string;
  designation: string;
  course: string;
  className: string;
  division: string;
  year: string;
  dob: string;
  bloodGroup: string;
  phone: string;
  emergencyContact: string;
  address: string;
  validFrom: string;
  validUntil: string;
  // Field visibility flags
  showSecondaryId: boolean;
  showDepartment: boolean;
  showDesignation: boolean;
  showCourse: boolean;
  showClass: boolean;
  showDivision: boolean;
  showYear: boolean;
  showDob: boolean;
  showBloodGroup: boolean;
  showPhone: boolean;
  showEmergencyContact: boolean;
  showAddress: boolean;
  showValidity: boolean;
  customFields: CustomField[];
}

export interface LogoConfig {
  url: string;
  width: number;
  opacity: number;
  position: 'left' | 'center' | 'right';
  label?: string;
}

export interface HeaderConfig {
  orgName: string;
  subtitle: string;
  tagline: string;
  height: number;
  bgType: 'solid' | 'gradient' | 'transparent';
  bgColor?: string;
  textColor?: string;
  alignment: 'left' | 'center' | 'right';
  showLogo: boolean;
  showSubtitle: boolean;
  showTagline: boolean;
  preset: string;
}

export interface FooterConfig {
  enabled: boolean;
  text: string;
  secondaryText: string;
  showSignature: boolean;
  showQr: boolean;
  showValidity: boolean;
  showAddress: boolean;
  bgColor?: string;
  textColor?: string;
  preset: string;
  terms?: string;
}

export interface SignatureConfig {
  url: string;
  signatoryName: string;
  signatoryTitle: string;
  showTitle: boolean;
}

export interface QrOptions {
  enabled: boolean;
  includeName: boolean;
  includeId: boolean;
  includeDepartment: boolean;
  includeOrg: boolean;
  customText?: string;
  size: number;
}

export interface ColorScheme {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  textDark: string;
  textLight: string;
  headerBg: string;
  footerBg: string;
}

export interface TemplateDesign {
  id: string;
  name: string;
  title?: string;
  category: CardCategory;
  orientation: Orientation;
  hasBack: boolean;
  colors: ColorScheme;
  fontFamily: string;
  pattern: PatternType;
  layoutVariant: string;
  photoShape: 'square' | 'rounded' | 'circle' | 'hexagon' | 'pill';
  headerPreset: string;
  footerPreset: string;
  description: string;
  backLayoutVariant?: string;
  tags?: string[];
  defaultDetails?: CardPersonDetails;
  header?: HeaderConfig;
  footer?: FooterConfig;
  primaryLogo?: LogoConfig;
  secondaryLogo?: LogoConfig;
  signature?: SignatureConfig;
  qr?: QrOptions;
  defaultPhotoUrl?: string;
  barcode?: any;
}

export interface CardState {
  templateId: string;
  orientation: Orientation;
  hasBack?: boolean;
  details: CardPersonDetails;
  photoUrl: string;
  photoZoom: number;
  photoRotate: number;
  primaryLogo: LogoConfig;
  secondaryLogo: LogoConfig;
  signature: SignatureConfig;
  header: HeaderConfig;
  footer: FooterConfig;
  qr: QrOptions;
  colors: ColorScheme;
  fontFamily: string;
  pattern: PatternType;
  barcode?: any;
  barcodeValue?: string;
  terms?: string;
  customTemplateName?: string;
}

export interface SavedCard {
  id: string;
  savedAt: string;
  name: string;
  personName: string;
  uniqueId: string;
  templateName: string;
  thumbnail?: string;
  cardState: CardState;
}

export interface CardRenderModel {
  templateId: string;
  templateName?: string;
  orientation: Orientation;
  hasBack: boolean;
  widthMm: number; // 85.6 mm
  heightMm: number; // 53.98 mm

  personData: CardPersonDetails;
  organizationData: {
    orgName: string;
    subtitle?: string;
    tagline?: string;
    showLogo?: boolean;
    showSubtitle?: boolean;
    showTagline?: boolean;
  };

  colors: ColorScheme;
  fontFamily: string;
  pattern: PatternType;
  layoutVariant: string;
  photoShape: 'square' | 'rounded' | 'circle' | 'hexagon' | 'pill';
  headerPreset: string;
  footerPreset: string;

  photo: {
    url: string;
    zoom: number;
    rotate: number;
  };
  logos: {
    primary: LogoConfig;
    secondary: LogoConfig;
  };
  signature: SignatureConfig;
  qr: QrOptions;
  header: HeaderConfig;
  footer: FooterConfig;
}

export interface PrintCalibration {
  offsetX: number; // mm
  offsetY: number; // mm
  scale: number; // percentage (100 is 1.0)
  a4CardsPerPage: 1 | 2 | 4 | 8 | 10;
  a4Spacing: number; // mm
  a4Margin: number; // mm
  printMode: PrintMode;
  cardSide: 'front' | 'back' | 'both';
  copies: number;
}
export type { CardSnapshot } from '../utils/VerificationPayloadService';
