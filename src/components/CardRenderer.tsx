import React, { useMemo } from 'react';
import { 
  CardState, 
  CardSide, 
  Orientation,
  PatternType,
  CardRenderModel
} from '../types';
import { 
  QrCode, 
  Shield, 
  Award, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  Droplet,
  CheckCircle2,
  Building2
} from 'lucide-react';
import { getTemplateById, renderModelToCardState } from '../utils/templateRegistry';

export interface CardRendererProps {
  cardState?: CardState;
  model?: CardRenderModel;
  side?: CardSide;
  scale?: number; // visual scale factor for screen (1 = normal ~432px base width)
  showBleedMarks?: boolean;
  qrDataUrl?: string;
  className?: string;
  id?: string;
  onClick?: () => void;
  isPrint?: boolean; // When true, renders with physical mm dimensions (85.6mm x 53.98mm)
}

/**
 * Smart Text Auto-Fit Helper:
 * Dynamically scales text down to prevent clipping while allowing natural word wrapping.
 * Solves stress cases like "MOHAMMED ABDUL REHMAN SIDDIQUI" and
 * "MAHATMA HUSSAIN EDUCATIONAL & TECHNOLOGICAL INSTITUTE"
 */
function fitNameText(name: string) {
  const len = (name || '').trim().length;
  if (len <= 14) return { fontSize: '16px', lineHeight: '18px' };
  if (len <= 20) return { fontSize: '13.5px', lineHeight: '15px' };
  if (len <= 28) return { fontSize: '11px', lineHeight: '13px' };
  if (len <= 38) return { fontSize: '9.5px', lineHeight: '11.5px' };
  return { fontSize: '8.5px', lineHeight: '10px' };
}

function fitOrgText(org: string) {
  const len = (org || '').trim().length;
  if (len <= 18) return { fontSize: '12px', lineHeight: '14px' };
  if (len <= 28) return { fontSize: '10px', lineHeight: '12px' };
  if (len <= 45) return { fontSize: '8.5px', lineHeight: '10px' };
  return { fontSize: '7.5px', lineHeight: '9px' };
}

function fitDetailText(text: string) {
  const len = (text || '').trim().length;
  if (len <= 20) return { fontSize: '8.5px', lineHeight: '10.5px' };
  if (len <= 32) return { fontSize: '7.5px', lineHeight: '9px' };
  return { fontSize: '6.8px', lineHeight: '8px' };
}

function getInitials(name: string): string {
  if (!name) return 'ID';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export const CardRenderer: React.FC<CardRendererProps> = ({
  cardState: rawCardState,
  model,
  side = 'front',
  scale = 1,
  showBleedMarks = false,
  qrDataUrl,
  className = '',
  id,
  onClick,
  isPrint = false,
}) => {
  // Single canonical CardState source
  const cardState = useMemo(() => {
    if (model) {
      return renderModelToCardState(model);
    }
    if (rawCardState) {
      return rawCardState;
    }
    // Fallback template
    return renderModelToCardState({} as any);
  }, [model, rawCardState]);

  const {
    templateId,
    orientation,
    details,
    photoUrl,
    photoZoom,
    photoRotate,
    primaryLogo,
    secondaryLogo,
    signature,
    header,
    footer,
    qr,
    colors,
    fontFamily,
    pattern,
  } = cardState;

  const tpl = useMemo(() => getTemplateById(templateId), [templateId]);
  const isLandscape = orientation === 'landscape';

  // Base dimensions: Standard ISO CR80 aspect ratio (1.5857)
  // Physical: 85.60 mm x 53.98 mm
  // Screen Base: 432px x 272px (Landscape) or 272px x 432px (Portrait)
  const baseWidth = isLandscape ? 432 : 272;
  const baseHeight = isLandscape ? 272 : 432;

  // Smart text fitting calculations
  const nameStyle = useMemo(() => fitNameText(details.fullName || 'FULL NAME'), [details.fullName]);
  const orgStyle = useMemo(() => fitOrgText(header.orgName || 'ORGANIZATION NAME'), [header.orgName]);
  const deptStyle = useMemo(() => fitDetailText(details.department || ''), [details.department]);
  const desigStyle = useMemo(() => fitDetailText(details.designation || ''), [details.designation]);

  // Photo shape from template archetype
  const photoShapeClass = useMemo(() => {
    const shape = tpl?.photoShape || 'rounded';
    switch (shape) {
      case 'circle':
        return 'rounded-full';
      case 'square':
        return 'rounded-none';
      case 'hexagon':
        return 'rounded-2xl';
      case 'pill':
        return 'rounded-3xl';
      case 'rounded':
      default:
        return 'rounded-xl';
    }
  }, [tpl]);

  // Render SVG pattern backgrounds
  const renderPattern = (pat: PatternType, strokeColor: string) => {
    switch (pat) {
      case 'dots':
        return (
          <svg className="absolute inset-0 w-full h-full opacity-10 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id={`dots-${id || 'c'}`} width="12" height="12" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1.5" fill={strokeColor} />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#dots-${id || 'c'})`} />
          </svg>
        );
      case 'lines':
        return (
          <svg className="absolute inset-0 w-full h-full opacity-10 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id={`lines-${id || 'c'}`} width="16" height="16" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="0" y2="16" stroke={strokeColor} strokeWidth="1.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#lines-${id || 'c'})`} />
          </svg>
        );
      case 'geometric':
        return (
          <svg className="absolute inset-0 w-full h-full opacity-10 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id={`geo-${id || 'c'}`} width="24" height="24" patternUnits="userSpaceOnUse">
                <path d="M0 12 L12 0 L24 12 L12 24 Z" fill="none" stroke={strokeColor} strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#geo-${id || 'c'})`} />
          </svg>
        );
      case 'wave':
        return (
          <svg className="absolute inset-0 w-full h-full opacity-15 pointer-events-none" preserveAspectRatio="none" viewBox="0 0 100 100">
            <path d="M0,20 Q25,40 50,20 T100,20 L100,0 L0,0 Z" fill={strokeColor} opacity="0.3" />
            <path d="M0,35 Q25,15 50,35 T100,35 L100,0 L0,0 Z" fill={strokeColor} opacity="0.15" />
          </svg>
        );
      case 'gradient':
        return (
          <div 
            className="absolute inset-0 pointer-events-none opacity-20"
            style={{
              background: `radial-gradient(circle at top right, ${colors.secondary}, transparent 70%)`,
            }}
          />
        );
      case 'abstract':
        return (
          <div 
            className="absolute -right-12 -top-12 w-36 h-36 rounded-full opacity-15 pointer-events-none blur-xl"
            style={{ backgroundColor: colors.accent }}
          />
        );
      default:
        return null;
    }
  };

  // Front layout content
  const renderFront = () => {
    if (isLandscape) {
      // ==========================================
      // LANDSCAPE FRONT LAYOUT (CR80 Standard)
      // ==========================================
      return (
        <div className="w-full h-full flex flex-col justify-between overflow-hidden relative">
          
          {/* Header Bar */}
          <div 
            className="px-3.5 py-2 flex items-center justify-between border-b relative z-10 min-h-[44px]"
            style={{ 
              backgroundColor: header.bgColor || colors.headerBg,
              borderColor: `${colors.accent}40`,
              color: header.textColor || colors.textLight,
            }}
          >
            <div className="flex items-center gap-2.5 flex-1 min-w-0 pr-2">
              {header.showLogo && primaryLogo.url ? (
                <img 
                  src={primaryLogo.url} 
                  alt="Logo" 
                  className="h-8 w-auto object-contain max-w-[70px] flex-shrink-0"
                />
              ) : (
                <div 
                  className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs shadow-sm flex-shrink-0"
                  style={{ backgroundColor: colors.secondary, color: colors.textLight }}
                >
                  {header.orgName ? header.orgName.charAt(0) : 'ID'}
                </div>
              )}

              {/* Organization Header Text: Auto-fit without clipping */}
              <div className="flex flex-col min-w-0 flex-1">
                <span 
                  className="font-extrabold tracking-tight uppercase block break-words"
                  style={{ 
                    fontSize: orgStyle.fontSize, 
                    lineHeight: orgStyle.lineHeight,
                    color: header.textColor || colors.textLight,
                  }}
                >
                  {header.orgName || 'ORGANIZATION NAME'}
                </span>
                {header.showSubtitle && header.subtitle && (
                  <span className="text-[8px] opacity-85 font-medium leading-none truncate max-w-[240px] mt-0.5">
                    {header.subtitle}
                  </span>
                )}
              </div>
            </div>

            {header.showTagline && header.tagline && (
              <span 
                className="text-[7.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border flex-shrink-0"
                style={{ 
                  backgroundColor: `${colors.accent}20`,
                  borderColor: `${colors.accent}60`,
                  color: colors.textLight,
                }}
              >
                {header.tagline}
              </span>
            )}
          </div>

          {/* Main Body Grid */}
          <div className="flex-1 px-3.5 py-1.5 flex items-center gap-3 relative z-10">
            {/* Left Photo Column */}
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <div 
                className={`w-20 h-24 overflow-hidden border-2 shadow-sm relative bg-stone-100 flex items-center justify-center ${photoShapeClass}`}
                style={{ borderColor: colors.secondary }}
              >
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt={details.fullName}
                    className="w-full h-full object-cover transition-transform"
                    style={{
                      transform: `scale(${photoZoom / 100}) rotate(${photoRotate}deg)`,
                    }}
                  />
                ) : (
                  <div 
                    className="w-full h-full flex flex-col items-center justify-center p-1 text-center"
                    style={{ backgroundColor: `${colors.primary}15` }}
                  >
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center font-black text-sm shadow-xs mb-1"
                      style={{ backgroundColor: colors.primary, color: colors.textLight }}
                    >
                      {getInitials(details.fullName)}
                    </div>
                    <span className="text-[7.5px] font-bold uppercase tracking-wider text-stone-500">Verified ID</span>
                  </div>
                )}
              </div>
              
              {/* ID Tag below photo */}
              <div 
                className="text-[8.5px] font-mono font-bold tracking-tight px-1.5 py-0.5 rounded border text-center"
                style={{ 
                  backgroundColor: `${colors.primary}15`, 
                  color: colors.primary,
                  borderColor: `${colors.primary}30` 
                }}
              >
                {details.uniqueId}
              </div>
            </div>

            {/* Middle Details Column: Smart Auto-Fit Name & Department */}
            <div className="flex-1 flex flex-col justify-center min-w-0 pr-1">
              <div className="mb-1">
                <h3 
                  className="font-black tracking-tight uppercase break-words"
                  style={{ 
                    color: colors.textDark,
                    fontSize: nameStyle.fontSize,
                    lineHeight: nameStyle.lineHeight,
                  }}
                >
                  {details.fullName || 'FULL NAME'}
                </h3>

                {details.showDesignation && (
                  <div 
                    className="inline-block font-bold uppercase tracking-wide px-2 py-0.5 rounded-md mt-0.5 break-words max-w-full"
                    style={{ 
                      backgroundColor: colors.primary, 
                      color: colors.textLight,
                      fontSize: desigStyle.fontSize,
                      lineHeight: desigStyle.lineHeight,
                    }}
                  >
                    {details.designation || 'STAFF'}
                  </div>
                )}
              </div>

              {/* Personnel Attributes Grid */}
              <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[8.5px] mt-0.5">
                {details.showDepartment && details.department && (
                  <div className="col-span-2">
                    <span className="text-[7px] uppercase font-bold text-stone-400 block leading-none">Dept</span>
                    <span 
                      className="font-bold block leading-tight break-words" 
                      style={{ 
                        color: colors.textDark,
                        fontSize: deptStyle.fontSize,
                        lineHeight: deptStyle.lineHeight,
                      }}
                    >
                      {details.department}
                    </span>
                  </div>
                )}

                {details.showBloodGroup && details.bloodGroup && (
                  <div>
                    <span className="text-[7px] uppercase font-bold text-stone-400 block leading-none">Blood</span>
                    <span className="font-bold text-red-700 block leading-tight">{details.bloodGroup}</span>
                  </div>
                )}

                {details.showValidity && details.validUntil && (
                  <div>
                    <span className="text-[7px] uppercase font-bold text-stone-400 block leading-none">Valid Thru</span>
                    <span className="font-semibold block leading-tight" style={{ color: colors.textDark }}>
                      {details.validUntil}
                    </span>
                  </div>
                )}

                {details.showPhone && details.phone && (
                  <div className="col-span-2">
                    <span className="text-[7px] uppercase font-bold text-stone-400 block leading-none">Phone</span>
                    <span className="font-semibold block leading-tight truncate" style={{ color: colors.textDark }}>
                      {details.phone}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* QR Code on far right: Square, Unclipped */}
            {qr.enabled && qrDataUrl && (
              <div className="flex flex-col items-center justify-center p-1 bg-white rounded-lg border border-stone-200 shadow-sm flex-shrink-0">
                <img src={qrDataUrl} alt="QR Code" className="w-13 h-13 object-contain" />
                <span className="text-[6px] font-mono uppercase text-stone-500 mt-0.5">VERIFY</span>
              </div>
            )}
          </div>

          {/* Footer Bar */}
          {footer.enabled && (
            <div 
              className="px-3 py-1 flex items-center justify-between text-[7.5px] border-t relative z-10"
              style={{ 
                backgroundColor: footer.bgColor || colors.footerBg,
                color: colors.textDark,
                borderColor: `${colors.primary}20` 
              }}
            >
              <span className="truncate max-w-[280px] opacity-85">
                {footer.text || 'Official Identification Credential'}
              </span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold tracking-wider">{details.uniqueId}</span>
              </div>
            </div>
          )}
        </div>
      );
    }

    // ==========================================
    // PORTRAIT FRONT LAYOUT (CR80 Standard)
    // ==========================================
    return (
      <div className="w-full h-full flex flex-col justify-between overflow-hidden relative">
        {/* Top Header */}
        <div 
          className="px-3 pt-2.5 pb-1.5 text-center relative z-10 border-b"
          style={{ 
            backgroundColor: header.bgColor || colors.headerBg,
            borderColor: `${colors.accent}40`,
            color: header.textColor || colors.textLight,
          }}
        >
          {header.showLogo && primaryLogo.url ? (
            <img 
              src={primaryLogo.url} 
              alt="Logo" 
              className="h-7 w-auto object-contain mx-auto mb-1 max-w-[90px]"
            />
          ) : (
            <div 
              className="w-6 h-6 rounded-lg mx-auto mb-1 flex items-center justify-center font-black text-[11px] shadow-sm"
              style={{ backgroundColor: colors.secondary, color: colors.textLight }}
            >
              {header.orgName ? header.orgName.charAt(0) : 'ID'}
            </div>
          )}

          <h2 
            className="font-black tracking-tight uppercase leading-tight px-1 break-words"
            style={{ 
              fontSize: orgStyle.fontSize, 
              lineHeight: orgStyle.lineHeight,
              color: header.textColor || colors.textLight,
            }}
          >
            {header.orgName || 'ORGANIZATION NAME'}
          </h2>

          {header.showSubtitle && header.subtitle && (
            <p className="text-[7px] opacity-85 font-medium leading-tight truncate px-1 mt-0.5">
              {header.subtitle}
            </p>
          )}

          {header.showTagline && header.tagline && (
            <span 
              className="inline-block text-[6.5px] font-bold uppercase tracking-wider px-2 py-0.2 rounded-full border mt-0.5"
              style={{ 
                backgroundColor: `${colors.accent}20`,
                borderColor: `${colors.accent}60`,
                color: colors.textLight,
              }}
            >
              {header.tagline}
            </span>
          )}
        </div>

        {/* Center Photo & Identity */}
        <div className="flex-1 flex flex-col items-center justify-center px-3 py-1 relative z-10">
          {/* Photo Frame */}
          <div 
            className={`w-22 h-26 overflow-hidden border-2 shadow-md relative bg-stone-100 flex items-center justify-center mb-1 ${photoShapeClass}`}
            style={{ borderColor: colors.primary }}
          >
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={details.fullName}
                className="w-full h-full object-cover transition-transform"
                style={{
                  transform: `scale(${photoZoom / 100}) rotate(${photoRotate}deg)`,
                }}
              />
            ) : (
              <div 
                className="w-full h-full flex flex-col items-center justify-center p-1 text-center"
                style={{ backgroundColor: `${colors.primary}15` }}
              >
                <div 
                  className="w-11 h-11 rounded-full flex items-center justify-center font-black text-base shadow-xs mb-1"
                  style={{ backgroundColor: colors.primary, color: colors.textLight }}
                >
                  {getInitials(details.fullName)}
                </div>
                <span className="text-[7.5px] font-bold uppercase tracking-wider text-stone-500">Verified ID</span>
              </div>
            )}
          </div>

          {/* Name & Role: Auto-fit */}
          <div className="text-center w-full px-1">
            <h3 
              className="font-black tracking-tight uppercase break-words"
              style={{ 
                color: colors.textDark,
                fontSize: nameStyle.fontSize,
                lineHeight: nameStyle.lineHeight,
              }}
            >
              {details.fullName || 'FULL NAME'}
            </h3>

            {details.showDesignation && (
              <div 
                className="inline-block font-bold uppercase tracking-wide px-2 py-0.5 rounded-full mt-0.5 shadow-xs break-words max-w-full"
                style={{ 
                  backgroundColor: colors.primary, 
                  color: colors.textLight,
                  fontSize: desigStyle.fontSize,
                  lineHeight: desigStyle.lineHeight,
                }}
              >
                {details.designation || 'DESIGNATION'}
              </div>
            )}
          </div>

          {/* Key-Value Fields */}
          <div className="w-full mt-1.5 space-y-0.5 text-[8px] border-t border-b py-1 px-1" style={{ borderColor: `${colors.primary}20` }}>
            <div className="flex justify-between items-center">
              <span className="text-[7px] font-bold uppercase text-stone-400">ID Number:</span>
              <span className="font-mono font-bold" style={{ color: colors.primary }}>
                {details.uniqueId}
              </span>
            </div>

            {details.showDepartment && details.department && (
              <div className="flex justify-between items-center">
                <span className="text-[7px] font-bold uppercase text-stone-400">Department:</span>
                <span className="font-semibold truncate max-w-[140px]" style={{ color: colors.textDark }}>
                  {details.department}
                </span>
              </div>
            )}

            {details.showBloodGroup && details.bloodGroup && (
              <div className="flex justify-between items-center">
                <span className="text-[7px] font-bold uppercase text-stone-400">Blood Group:</span>
                <span className="font-bold text-red-700">
                  {details.bloodGroup}
                </span>
              </div>
            )}

            {details.showValidity && details.validUntil && (
              <div className="flex justify-between items-center">
                <span className="text-[7px] font-bold uppercase text-stone-400">Valid Thru:</span>
                <span className="font-semibold" style={{ color: colors.textDark }}>
                  {details.validUntil}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Bar with QR or Footer */}
        <div 
          className="px-3 py-1.5 border-t relative z-10 flex items-center justify-between"
          style={{ 
            backgroundColor: footer.bgColor || colors.footerBg,
            borderColor: `${colors.primary}20`,
            color: colors.textDark,
          }}
        >
          {qr.enabled && qrDataUrl ? (
            <div className="flex items-center gap-1.5">
              <div className="p-0.5 bg-white rounded border border-stone-200">
                <img src={qrDataUrl} alt="QR Code" className="w-8 h-8 object-contain" />
              </div>
              <div className="text-[6.5px] leading-tight opacity-75">
                <span className="font-bold block">SmartID Verified</span>
                <span>Scan for ID</span>
              </div>
            </div>
          ) : (
            <div className="text-[7px] truncate max-w-[170px]">
              {footer.text || 'Official Credential'}
            </div>
          )}

          {footer.showSignature && signature.url ? (
            <div className="flex flex-col items-end">
              <img src={signature.url} alt="Signature" className="h-5 w-auto object-contain" />
              <span className="text-[6px] text-stone-500 font-semibold">{signature.signatoryTitle || 'Signature'}</span>
            </div>
          ) : (
            <div className="text-right">
              <div className="w-12 border-b border-stone-400 mb-0.5" />
              <span className="text-[6px] text-stone-400 uppercase font-semibold">Authorized</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Back layout content
  const renderBack = () => {
    return (
      <div className="w-full h-full flex flex-col justify-between overflow-hidden relative p-3.5">
        {/* Top Header of Back */}
        <div 
          className="pb-1.5 border-b flex items-center justify-between relative z-10"
          style={{ borderColor: `${colors.primary}30` }}
        >
          <div className="flex items-center gap-2">
            <Building2 className="w-3.5 h-3.5" style={{ color: colors.primary }} />
            <span className="text-[9.5px] font-extrabold uppercase tracking-tight" style={{ color: colors.textDark }}>
              {header.orgName || 'ORGANIZATION POLICIES'}
            </span>
          </div>
          <span className="text-[7.5px] font-mono font-bold" style={{ color: colors.primary }}>
            {details.uniqueId}
          </span>
        </div>

        {/* Back Middle Content */}
        <div className="flex-1 py-1.5 flex flex-col justify-center gap-1.5 relative z-10 text-[7.5px] leading-relaxed">
          {/* Instructions / Terms */}
          <div 
            className="p-2 rounded-lg border text-stone-600 bg-white/70 backdrop-blur-xs"
            style={{ borderColor: `${colors.primary}15` }}
          >
            <p className="font-bold mb-0.5 text-stone-800 text-[8px]">Terms & Conditions:</p>
            <p className="text-[7px] leading-snug">
              1. This credential is the property of the issuing organization and is non-transferable.<br />
              2. Must be presented upon request by authorized security personnel.<br />
              3. If lost or damaged, report immediately to the administration office.
            </p>
          </div>

          {/* Address & Emergency Info */}
          <div className="grid grid-cols-2 gap-1.5">
            {details.showAddress && details.address && (
              <div className="col-span-2 flex items-start gap-1 text-stone-600">
                <MapPin className="w-3 h-3 text-stone-400 mt-0.5 flex-shrink-0" />
                <span className="text-[7px] leading-tight break-words">{details.address}</span>
              </div>
            )}

            {details.showEmergencyContact && details.emergencyContact && (
              <div className="flex items-center gap-1 text-stone-600">
                <Phone className="w-3 h-3 text-red-500 flex-shrink-0" />
                <span className="text-[7px] font-bold text-red-700">
                  SOS: {details.emergencyContact}
                </span>
              </div>
            )}

            {details.showValidity && details.validUntil && (
              <div className="flex items-center gap-1 text-stone-600">
                <Calendar className="w-3 h-3 text-stone-400 flex-shrink-0" />
                <span className="text-[7px]">Expiry: {details.validUntil}</span>
              </div>
            )}
          </div>

          {/* Barcode representation */}
          <div className="mt-0.5 flex flex-col items-center">
            <div className="h-5 w-44 flex items-center justify-center gap-[2px] bg-white p-0.5 rounded border border-stone-200">
              {[3,1,2,4,1,3,2,1,4,2,3,1,2,3,1,4,2,1,3,2,4,1,2,3,1,2,4,2,1,3].map((w, idx) => (
                <div 
                  key={idx} 
                  className="h-full bg-stone-900" 
                  style={{ width: `${w}px` }} 
                />
              ))}
            </div>
            <span className="text-[6.5px] font-mono tracking-widest text-stone-500 mt-0.5">
              *{details.uniqueId}*
            </span>
          </div>
        </div>

        {/* Back Bottom Signature & QR */}
        <div 
          className="pt-1.5 border-t flex items-end justify-between relative z-10"
          style={{ borderColor: `${colors.primary}30` }}
        >
          {qr.enabled && qrDataUrl && (
            <div className="flex items-center gap-1.5">
              <img src={qrDataUrl} alt="QR" className="w-8 h-8 object-contain bg-white p-0.5 rounded border border-stone-200" />
              <div className="text-[6px] text-stone-400 leading-tight">
                Scan for<br />verification
              </div>
            </div>
          )}

          <div className="flex flex-col items-center text-center">
            {signature.url ? (
              <img src={signature.url} alt="Signature" className="h-6 w-auto object-contain" />
            ) : (
              <div className="h-5 flex items-center">
                <span className="font-serif italic text-[10px] text-stone-600">
                  {signature.signatoryName || 'Authorized Signature'}
                </span>
              </div>
            )}
            <div className="w-20 border-b border-stone-400 mb-0.5" />
            <span className="text-[6.5px] text-stone-500 font-bold uppercase tracking-wider">
              {signature.signatoryTitle || 'Authorized Signatory'}
            </span>
          </div>
        </div>
      </div>
    );
  };

  // If rendering for direct physical printing:
  if (isPrint) {
    return (
      <div
        id={id}
        onClick={onClick}
        className={`smartid-print-card relative select-none rounded-2xl overflow-hidden border ${className}`}
        style={{
          width: isLandscape ? '85.6mm' : '53.98mm',
          height: isLandscape ? '53.98mm' : '85.6mm',
          backgroundColor: colors.background,
          borderColor: `${colors.primary}40`,
          fontFamily: fontFamily || 'Plus Jakarta Sans',
          padding: '2mm', // 2mm internal safe area for print
          boxSizing: 'border-box',
          pageBreakInside: 'avoid',
          breakInside: 'avoid',
        }}
      >
        {renderPattern(pattern, colors.secondary)}
        <div className="w-full h-full relative">
          {side === 'front' ? renderFront() : renderBack()}
        </div>
      </div>
    );
  }

  // Standard Screen Preview & High-Res Export Rendering:
  return (
    <div
      id={id}
      onClick={onClick}
      className={`relative select-none transition-shadow rounded-2xl overflow-hidden shadow-md border ${className}`}
      style={{
        width: `${baseWidth * scale}px`,
        height: `${baseHeight * scale}px`,
        backgroundColor: colors.background,
        borderColor: `${colors.primary}40`,
        fontFamily: fontFamily || 'Plus Jakarta Sans',
      }}
    >
      {/* Background patterns */}
      {renderPattern(pattern, colors.secondary)}

      {/* Actual card content scaled cleanly */}
      <div
        className="origin-top-left absolute top-0 left-0"
        style={{
          width: `${baseWidth}px`,
          height: `${baseHeight}px`,
          transform: `scale(${scale})`,
        }}
      >
        {side === 'front' ? renderFront() : renderBack()}
      </div>

      {/* Optional bleed marks for print precision */}
      {showBleedMarks && (
        <>
          <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-red-500 pointer-events-none" />
          <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-red-500 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-red-500 pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-red-500 pointer-events-none" />
        </>
      )}
    </div>
  );
};
