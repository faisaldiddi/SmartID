import React, { useMemo, useState } from 'react';
import { 
  CardState, 
  CardSide, 
  PatternType,
  CardRenderModel,
  CardSnapshot
} from '../types';
import { 
  Phone, 
  MapPin, 
  Calendar, 
  Building2
} from 'lucide-react';
import { getTemplateById, renderModelToCardState } from '../utils/templateRegistry';
import { snapshotToCardState } from '../utils/VerificationPayloadService';
import { fitTextToBounds } from '../utils/textBounds';

export interface CardRendererProps {
  cardState?: CardState;
  snapshot?: CardSnapshot | any;
  model?: CardRenderModel;
  side?: CardSide;
  scale?: number; // visual scale factor for screen (1 = normal ~432px base width)
  showBleedMarks?: boolean;
  qrDataUrl?: string;
  className?: string;
  id?: string;
  onClick?: () => void;
  isPrint?: boolean; // When true, renders with physical mm dimensions (85.6mm x 53.98mm)
  mode?: 'studio' | 'readonly' | 'export' | 'print';
}

function getInitials(name: string): string {
  if (!name) return 'ID';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export const CardRenderer: React.FC<CardRendererProps> = ({
  cardState: rawCardState,
  snapshot,
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
  const [imageError, setImageError] = useState(false);

  // Single canonical CardState source
  const cardState = useMemo(() => {
    if (model) {
      return renderModelToCardState(model);
    }
    if (rawCardState) {
      return rawCardState;
    }
    if (snapshot) {
      if ('details' in snapshot && 'header' in snapshot) {
        return snapshot as CardState;
      }
      return snapshotToCardState(snapshot);
    }
    return renderModelToCardState({} as any);
  }, [model, rawCardState, snapshot]);

  const {
    templateId,
    orientation,
    details,
    photoUrl,
    photoZoom = 100,
    photoRotate = 0,
    primaryLogo,
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

  // Smart text fitting calculations to eliminate text clipping on any name or org length
  const nameStyle = useMemo(
    () => fitTextToBounds(details.fullName || 'FULL NAME', { maxFontSize: 15, minFontSize: 8.5, maxCharsPerLine: 20 }),
    [details.fullName]
  );
  const orgStyle = useMemo(
    () => fitTextToBounds(header.orgName || 'ORGANIZATION NAME', { maxFontSize: 11.5, minFontSize: 7.5, maxCharsPerLine: 26 }),
    [header.orgName]
  );
  const deptStyle = useMemo(
    () => fitTextToBounds(details.department || '', { maxFontSize: 8.5, minFontSize: 6.5, maxCharsPerLine: 28 }),
    [details.department]
  );
  const desigStyle = useMemo(
    () => fitTextToBounds(details.designation || 'STAFF', { maxFontSize: 8, minFontSize: 6.2, maxCharsPerLine: 26 }),
    [details.designation]
  );

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
      case 'solid':
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
        <div className="w-full h-full flex flex-col justify-between overflow-hidden relative box-border">
          
          {/* Header Bar */}
          <div 
            className="px-3 py-1.5 flex items-center justify-between border-b relative z-10 min-h-[42px] box-border"
            style={{ 
              backgroundColor: header.bgColor || colors.headerBg,
              borderColor: `${colors.accent}40`,
              color: header.textColor || colors.textLight,
            }}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0 pr-1">
              {header.showLogo && primaryLogo?.url ? (
                <img 
                  src={primaryLogo.url} 
                  alt="Logo" 
                  className="h-7 w-auto object-contain max-w-[65px] flex-shrink-0"
                />
              ) : (
                <div 
                  className="w-6.5 h-6.5 rounded-lg flex items-center justify-center font-black text-xs shadow-sm flex-shrink-0"
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
                  <span className="text-[7.5px] opacity-85 font-medium leading-none truncate max-w-[200px] mt-0.5">
                    {header.subtitle}
                  </span>
                )}
              </div>
            </div>

            {header.showTagline && header.tagline && (
              <span 
                className="text-[7px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border flex-shrink-0 max-w-[120px] truncate"
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
          <div className="flex-1 px-3 py-1 flex items-center gap-2.5 relative z-10 box-border min-h-0">
            {/* Left Photo Column */}
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <div 
                className={`w-19 h-23 overflow-hidden border-2 shadow-sm relative bg-stone-100 flex items-center justify-center ${photoShapeClass}`}
                style={{ borderColor: colors.secondary }}
              >
                {photoUrl && !imageError ? (
                  <img
                    src={photoUrl}
                    alt={details.fullName}
                    className="w-full h-full object-cover transition-transform"
                    style={{
                      transform: `scale(${photoZoom / 100}) rotate(${photoRotate}deg)`,
                    }}
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <div 
                    className="w-full h-full flex flex-col items-center justify-center p-1 text-center"
                    style={{ backgroundColor: `${colors.primary}15` }}
                  >
                    <div 
                      className="w-9 h-9 rounded-full flex items-center justify-center font-black text-xs shadow-xs mb-1"
                      style={{ backgroundColor: colors.primary, color: colors.textLight }}
                    >
                      {getInitials(details.fullName)}
                    </div>
                    <span className="text-[7px] font-bold uppercase tracking-wider text-stone-500">Verified ID</span>
                  </div>
                )}
              </div>
              
              {/* ID Tag below photo */}
              <div 
                className="text-[8px] font-mono font-bold tracking-tight px-1.5 py-0.5 rounded border text-center max-w-[80px] truncate"
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
              <div className="mb-0.5">
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
                    className="inline-block font-bold uppercase tracking-wide px-1.5 py-0.2 rounded mt-0.5 break-words max-w-full"
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
              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[8px] mt-0.5">
                {details.showDepartment && details.department && (
                  <div className="col-span-2">
                    <span className="text-[6.5px] uppercase font-bold text-stone-400 block leading-none">Dept</span>
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
                    <span className="text-[6.5px] uppercase font-bold text-stone-400 block leading-none">Blood</span>
                    <span className="font-bold text-red-700 block leading-tight">{details.bloodGroup}</span>
                  </div>
                )}

                {details.showValidity && details.validUntil && (
                  <div>
                    <span className="text-[6.5px] uppercase font-bold text-stone-400 block leading-none">Valid Thru</span>
                    <span className="font-semibold block leading-tight truncate" style={{ color: colors.textDark }}>
                      {details.validUntil}
                    </span>
                  </div>
                )}

                {details.showPhone && details.phone && (
                  <div className="col-span-2">
                    <span className="text-[6.5px] uppercase font-bold text-stone-400 block leading-none">Phone</span>
                    <span className="font-semibold block leading-tight truncate" style={{ color: colors.textDark }}>
                      {details.phone}
                    </span>
                  </div>
                )}

                {details.showAddress && details.address && (
                  <div className="col-span-2">
                    <span className="text-[6.5px] uppercase font-bold text-stone-400 block leading-none">Location</span>
                    <span className="font-semibold block leading-tight truncate" style={{ color: colors.textDark }}>
                      {details.address}
                    </span>
                  </div>
                )}

                {/* Custom Fields (e.g. Aadhaar, Ward, Location) */}
                {details.customFields && details.customFields.filter((f) => f.enabled && f.value).map((f) => (
                  <div key={f.id} className="col-span-2">
                    <span className="text-[6.5px] uppercase font-bold text-stone-400 block leading-none">{f.label}</span>
                    <span className="font-semibold block leading-tight truncate" style={{ color: colors.textDark }}>
                      {f.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* QR Code on far right: Square, Unclipped, Respects 2.5mm safe margin */}
            {qr.enabled && qrDataUrl && (
              <div className="flex flex-col items-center justify-center p-1 bg-white rounded-lg border border-stone-200 shadow-sm flex-shrink-0 mr-1">
                <img src={qrDataUrl} alt="QR Code" className="w-12 h-12 object-contain" />
                <span className="text-[5.5px] font-mono uppercase text-stone-500 mt-0.5">VERIFY</span>
              </div>
            )}
          </div>

          {/* Footer Bar */}
          {footer.enabled && (
            <div 
              className="px-3 py-1 flex items-center justify-between text-[7px] border-t relative z-10 box-border"
              style={{ 
                backgroundColor: footer.bgColor || colors.footerBg,
                color: colors.textDark,
                borderColor: `${colors.primary}20` 
              }}
            >
              <span className="truncate max-w-[260px] opacity-85">
                {footer.text || 'Official Identification Credential'}
              </span>
              <div className="flex items-center gap-2 flex-shrink-0">
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
      <div className="w-full h-full flex flex-col justify-between overflow-hidden relative box-border">
        {/* Top Header */}
        <div 
          className="px-3 pt-2 pb-1 text-center relative z-10 border-b box-border"
          style={{ 
            backgroundColor: header.bgColor || colors.headerBg,
            borderColor: `${colors.accent}40`,
            color: header.textColor || colors.textLight,
          }}
        >
          {header.showLogo && primaryLogo?.url ? (
            <img 
              src={primaryLogo.url} 
              alt="Logo" 
              className="h-6 w-auto object-contain mx-auto mb-0.5 max-w-[80px]"
            />
          ) : (
            <div 
              className="w-5.5 h-5.5 rounded-lg mx-auto mb-0.5 flex items-center justify-center font-black text-[10px] shadow-sm"
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
            <p className="text-[6.5px] opacity-85 font-medium leading-tight truncate px-1 mt-0.5">
              {header.subtitle}
            </p>
          )}

          {header.showTagline && header.tagline && (
            <span 
              className="inline-block text-[6px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded-full border mt-0.5 max-w-[180px] truncate"
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
        <div className="flex-1 flex flex-col items-center justify-center px-3 py-1 relative z-10 box-border min-h-0">
          {/* Photo Frame */}
          <div 
            className={`w-21 h-25 overflow-hidden border-2 shadow-sm relative bg-stone-100 flex items-center justify-center mb-1 ${photoShapeClass}`}
            style={{ borderColor: colors.primary }}
          >
            {photoUrl && !imageError ? (
              <img
                src={photoUrl}
                alt={details.fullName}
                className="w-full h-full object-cover transition-transform"
                style={{
                  transform: `scale(${photoZoom / 100}) rotate(${photoRotate}deg)`,
                }}
                onError={() => setImageError(true)}
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
                <span className="text-[7px] font-bold uppercase tracking-wider text-stone-500">Verified ID</span>
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
                className="inline-block font-bold uppercase tracking-wide px-2 py-0.2 rounded-full mt-0.5 shadow-xs break-words max-w-full"
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
          <div className="w-full mt-1 space-y-0.5 text-[7.5px] border-t border-b py-0.5 px-1 box-border" style={{ borderColor: `${colors.primary}20` }}>
            <div className="flex justify-between items-center">
              <span className="text-[6.5px] font-bold uppercase text-stone-400">ID Number:</span>
              <span className="font-mono font-bold" style={{ color: colors.primary }}>
                {details.uniqueId}
              </span>
            </div>

            {details.showDepartment && details.department && (
              <div className="flex justify-between items-center">
                <span className="text-[6.5px] font-bold uppercase text-stone-400">Department:</span>
                <span className="font-semibold truncate max-w-[130px]" style={{ color: colors.textDark }}>
                  {details.department}
                </span>
              </div>
            )}

            {details.showBloodGroup && details.bloodGroup && (
              <div className="flex justify-between items-center">
                <span className="text-[6.5px] font-bold uppercase text-stone-400">Blood Group:</span>
                <span className="font-bold text-red-700">
                  {details.bloodGroup}
                </span>
              </div>
            )}

            {details.showValidity && details.validUntil && (
              <div className="flex justify-between items-center">
                <span className="text-[6.5px] font-bold uppercase text-stone-400">Valid Thru:</span>
                <span className="font-semibold" style={{ color: colors.textDark }}>
                  {details.validUntil}
                </span>
              </div>
            )}

            {details.showAddress && details.address && (
              <div className="flex justify-between items-center">
                <span className="text-[6.5px] font-bold uppercase text-stone-400">Location:</span>
                <span className="font-semibold truncate max-w-[130px]" style={{ color: colors.textDark }}>
                  {details.address}
                </span>
              </div>
            )}

            {/* Custom Fields (e.g. Aadhaar, Ward, Location) */}
            {details.customFields && details.customFields.filter((f) => f.enabled && f.value).map((f) => (
              <div key={f.id} className="flex justify-between items-center">
                <span className="text-[6.5px] font-bold uppercase text-stone-400">{f.label}:</span>
                <span className="font-semibold truncate max-w-[130px]" style={{ color: colors.textDark }}>
                  {f.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Bar with QR or Footer */}
        <div 
          className="px-3 py-1 border-t relative z-10 flex items-center justify-between box-border"
          style={{ 
            backgroundColor: footer.bgColor || colors.footerBg,
            borderColor: `${colors.primary}20`,
            color: colors.textDark,
          }}
        >
          {qr.enabled && qrDataUrl ? (
            <div className="flex items-center gap-1.5">
              <div className="p-0.5 bg-white rounded border border-stone-200">
                <img src={qrDataUrl} alt="QR Code" className="w-7.5 h-7.5 object-contain" />
              </div>
              <div className="text-[6px] leading-tight opacity-75">
                <span className="font-bold block">SmartID Verified</span>
                <span>Scan for ID</span>
              </div>
            </div>
          ) : (
            <div className="text-[6.5px] truncate max-w-[150px]">
              {footer.text || 'Official Credential'}
            </div>
          )}

          {signature?.signatoryName ? (
            <div className="flex flex-col items-end text-right">
              <span className="font-serif italic text-[8.5px] font-bold text-stone-800 leading-none">
                {signature.signatoryName}
              </span>
              <div className="w-12 border-b border-stone-400 my-0.5" />
              <span className="text-[5.5px] text-stone-500 font-bold uppercase tracking-wider">
                {signature.signatoryTitle || 'Authorized Signatory'}
              </span>
            </div>
          ) : (
            <div className="text-right">
              <div className="w-10 border-b border-stone-400 mb-0.5" />
              <span className="text-[5.5px] text-stone-400 uppercase font-semibold">Authorized</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Back layout content
  const renderBack = () => {
    const backTerms = cardState.terms || footer.terms || footer.secondaryText;
    const barcodeCode = cardState.barcodeValue || details.uniqueId;
    const officerName = signature.signatoryName;
    const officerTitle = signature.signatoryTitle;

    // Smart auto-fit for back terms text
    const termsStyle = fitTextToBounds(backTerms || '', { maxFontSize: 7.5, minFontSize: 5.5, maxCharsPerLine: 35 });

    if (isLandscape) {
      // ==============================================================
      // LANDSCAPE BACK LAYOUT: Balanced 2-Column Grid (Zero Clipping)
      // ==============================================================
      return (
        <div className="w-full h-full flex flex-col justify-between overflow-hidden relative p-3 box-border">
          {/* Top Header of Back */}
          <div 
            className="pb-1 border-b flex items-center justify-between relative z-10"
            style={{ borderColor: `${colors.primary}30` }}
          >
            <div className="flex items-center gap-1.5 min-w-0 pr-1">
              <Building2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: colors.primary }} />
              <span className="text-[9px] font-extrabold uppercase tracking-tight truncate" style={{ color: colors.textDark }}>
                {header.orgName || 'OFFICIAL CREDENTIAL'}
              </span>
            </div>
            <span className="text-[7.5px] font-mono font-bold flex-shrink-0" style={{ color: colors.primary }}>
              {details.uniqueId}
            </span>
          </div>

          {/* Back Middle Content: 2-Column Grid */}
          <div className="flex-1 py-1 grid grid-cols-12 gap-2 relative z-10 items-center min-h-0">
            {/* Left Column: Terms & Conditions */}
            <div 
              className="col-span-7 p-2 rounded-lg border text-stone-600 bg-white/75 backdrop-blur-xs flex flex-col justify-center h-full box-border"
              style={{ borderColor: `${colors.primary}20` }}
            >
              <p className="font-bold mb-0.5 text-stone-800 text-[7.5px]">Terms & Conditions:</p>
              {backTerms ? (
                <p 
                  className="leading-snug break-words whitespace-pre-line overflow-hidden"
                  style={{ fontSize: termsStyle.fontSize, lineHeight: termsStyle.lineHeight }}
                >
                  {backTerms}
                </p>
              ) : (
                <p className="text-[6.5px] leading-snug">
                  This credential is the property of {header.orgName || 'the issuing authority'}. It is non-transferable and must be presented upon official request. If lost or found, please return immediately.
                </p>
              )}
            </div>

            {/* Right Column: Address, Emergency SOS, Expiry */}
            <div className="col-span-5 flex flex-col justify-center gap-1 text-[7px] text-stone-600">
              {details.address && (
                <div className="flex items-start gap-1">
                  <MapPin className="w-2.5 h-2.5 text-stone-400 mt-0.5 flex-shrink-0" />
                  <span className="leading-tight break-words text-[6.5px]">{details.address}</span>
                </div>
              )}

              {details.emergencyContact && (
                <div className="flex items-center gap-1">
                  <Phone className="w-2.5 h-2.5 text-red-500 flex-shrink-0" />
                  <span className="font-bold text-red-700 text-[6.5px]">
                    SOS: {details.emergencyContact}
                  </span>
                </div>
              )}

              {details.validUntil && (
                <div className="flex items-center gap-1">
                  <Calendar className="w-2.5 h-2.5 text-stone-400 flex-shrink-0" />
                  <span className="text-[6.5px]">Exp: {details.validUntil}</span>
                </div>
              )}
            </div>
          </div>

          {/* Back Bottom Bar: Barcode on Left, Signature on Right */}
          <div 
            className="pt-1 border-t flex items-center justify-between relative z-10"
            style={{ borderColor: `${colors.primary}30` }}
          >
            {/* Barcode representation */}
            <div className="flex flex-col items-start">
              <div className="h-4.5 w-36 flex items-center justify-center gap-[1.5px] bg-white p-0.5 rounded border border-stone-200">
                {[3,1,2,4,1,3,2,1,4,2,3,1,2,3,1,4,2,1,3,2,4,1,2,3,1,2,4,2,1,3].map((w, idx) => (
                  <div 
                    key={idx} 
                    className="h-full bg-stone-900" 
                    style={{ width: `${w}px` }} 
                  />
                ))}
              </div>
              <span className="text-[6px] font-mono tracking-wider text-stone-500 mt-0.2">
                *{barcodeCode}*
              </span>
            </div>

            {/* Signature on Right */}
            <div className="flex flex-col items-end text-right">
              {signature.url ? (
                <img src={signature.url} alt="Signature" className="h-5 w-auto object-contain" />
              ) : officerName ? (
                <span className="font-serif italic text-[9px] text-stone-800 font-bold leading-tight">
                  {officerName}
                </span>
              ) : (
                <span className="text-[6.5px] text-stone-400 italic">Authorized Signature</span>
              )}
              <div className="w-16 border-b border-stone-400 my-0.5" />
              <span className="text-[5.5px] text-stone-500 font-bold uppercase tracking-wider">
                {officerTitle || 'Authorized Signatory'}
              </span>
            </div>
          </div>
        </div>
      );
    }

    // ==============================================================
    // PORTRAIT BACK LAYOUT (Vertical CR80 Standard)
    // ==============================================================
    return (
      <div className="w-full h-full flex flex-col justify-between overflow-hidden relative p-3 box-border">
        {/* Top Header */}
        <div 
          className="pb-1 border-b flex items-center justify-between relative z-10"
          style={{ borderColor: `${colors.primary}30` }}
        >
          <div className="flex items-center gap-1.5 min-w-0 pr-1">
            <Building2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: colors.primary }} />
            <span className="text-[8.5px] font-extrabold uppercase tracking-tight truncate" style={{ color: colors.textDark }}>
              {header.orgName || 'OFFICIAL CREDENTIAL'}
            </span>
          </div>
          <span className="text-[7px] font-mono font-bold flex-shrink-0" style={{ color: colors.primary }}>
            {details.uniqueId}
          </span>
        </div>

        {/* Middle Content */}
        <div className="flex-1 py-1.5 flex flex-col justify-center gap-1.5 relative z-10 text-[7px] leading-relaxed min-h-0">
          {/* Terms & Conditions Box */}
          <div 
            className="p-2 rounded-lg border text-stone-600 bg-white/75 backdrop-blur-xs box-border"
            style={{ borderColor: `${colors.primary}20` }}
          >
            <p className="font-bold mb-0.5 text-stone-800 text-[7px]">Terms & Conditions:</p>
            {backTerms ? (
              <p 
                className="leading-snug break-words whitespace-pre-line"
                style={{ fontSize: termsStyle.fontSize, lineHeight: termsStyle.lineHeight }}
              >
                {backTerms}
              </p>
            ) : (
              <p className="text-[6px] leading-snug">
                This credential is the property of {header.orgName || 'the issuing authority'}. It is non-transferable and must be presented upon official request.
              </p>
            )}
          </div>

          {/* Address & Emergency Info */}
          <div className="space-y-1 text-[6.5px]">
            {details.address && (
              <div className="flex items-start gap-1 text-stone-600">
                <MapPin className="w-2.5 h-2.5 text-stone-400 mt-0.5 flex-shrink-0" />
                <span className="leading-tight break-words">{details.address}</span>
              </div>
            )}

            {details.emergencyContact && (
              <div className="flex items-center gap-1 text-stone-600">
                <Phone className="w-2.5 h-2.5 text-red-500 flex-shrink-0" />
                <span className="font-bold text-red-700">
                  SOS: {details.emergencyContact}
                </span>
              </div>
            )}

            {details.validUntil && (
              <div className="flex items-center gap-1 text-stone-600">
                <Calendar className="w-2.5 h-2.5 text-stone-400 flex-shrink-0" />
                <span>Expiry: {details.validUntil}</span>
              </div>
            )}
          </div>

          {/* Barcode representation */}
          <div className="flex flex-col items-center mt-1">
            <div className="h-4.5 w-36 flex items-center justify-center gap-[1.5px] bg-white p-0.5 rounded border border-stone-200">
              {[3,1,2,4,1,3,2,1,4,2,3,1,2,3,1,4,2,1,3,2,4,1,2,3,1,2,4,2,1,3].map((w, idx) => (
                <div 
                  key={idx} 
                  className="h-full bg-stone-900" 
                  style={{ width: `${w}px` }} 
                />
              ))}
            </div>
            <span className="text-[6px] font-mono tracking-wider text-stone-500 mt-0.2">
              *{barcodeCode}*
            </span>
          </div>
        </div>

        {/* Back Bottom Signature */}
        <div 
          className="pt-1 border-t flex items-center justify-between relative z-10"
          style={{ borderColor: `${colors.primary}30` }}
        >
          <div className="text-[6px] text-stone-400">
            {footer.text || 'Official Credential'}
          </div>

          <div className="flex flex-col items-end text-right">
            {signature.url ? (
              <img src={signature.url} alt="Signature" className="h-5 w-auto object-contain" />
            ) : officerName ? (
              <span className="font-serif italic text-[8.5px] text-stone-800 font-bold">
                {officerName}
              </span>
            ) : (
              <span className="text-[6px] text-stone-400 italic">Authorized Signature</span>
            )}
            <div className="w-14 border-b border-stone-400 my-0.5" />
            <span className="text-[5.5px] text-stone-500 font-bold uppercase tracking-wider">
              {officerTitle || 'Authorized Signatory'}
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
          padding: '2mm', // 2mm internal safe area for physical print
          boxSizing: 'border-box',
          pageBreakInside: 'avoid',
          breakInside: 'avoid',
        }}
      >
        {renderPattern(pattern, colors.secondary)}
        <div className="w-full h-full relative box-border">
          {side === 'front' ? renderFront() : renderBack()}
        </div>
      </div>
    );
  }

  // Standard Screen Preview & High-Res Export Rendering:
  // Uses inset box-shadow to prevent border clipping issues
  return (
    <div
      id={id}
      onClick={onClick}
      className={`relative select-none transition-shadow rounded-2xl overflow-hidden shadow-md ${className}`}
      style={{
        width: `${baseWidth * scale}px`,
        height: `${baseHeight * scale}px`,
        backgroundColor: colors.background,
        boxShadow: `inset 0 0 0 1px ${colors.primary}35, 0 4px 6px -1px rgba(0, 0, 0, 0.1)`,
        fontFamily: fontFamily || 'Plus Jakarta Sans',
        boxSizing: 'border-box',
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
          boxSizing: 'border-box',
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
