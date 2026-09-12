import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  RotateCw, 
  Printer, 
  Download, 
  ExternalLink, 
  CheckCircle2, 
  Lock, 
  Clock, 
  Building2, 
  User, 
  CreditCard,
  Phone,
  Heart,
  Calendar,
  Sparkles,
  Image as ImageIcon,
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2
} from 'lucide-react';
import { CardState } from '../types';
import { decodeCardFromVerification } from '../utils/cardCodec';
import { CardRenderer } from '../components/CardRenderer';
import { PdfExportService } from '../utils/PdfExportService';
import { ImageExportService } from '../utils/ImageExportService';
import { restoreCardFromPayload } from '../utils/VerificationPayloadService';
import { getTemplateById, getTemplateCardState } from '../utils/templateRegistry';
import { generateCardQrCode } from '../utils/qrGenerator';
import { TEMPLATES } from '../data/templates';

interface VerificationViewProps {
  encodedData?: string;
  cardId?: string;
  onOpenStudio: () => void;
}

export const VerificationView: React.FC<VerificationViewProps> = ({
  encodedData,
  cardId,
  onOpenStudio,
}) => {
  const [cardState, setCardState] = useState<CardState | null>(null);
  const [activeSide, setActiveSide] = useState<'both' | 'flip' | 'front' | 'back'>('both');
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [printScale, setPrintScale] = useState<number>(1.35);
  const [windowWidth, setWindowWidth] = useState<number>(() => typeof window !== 'undefined' ? window.innerWidth : 1024);
  const [userZoom, setUserZoom] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [verifiedAt, setVerifiedAt] = useState<string>('');
  const [qrUrl, setQrUrl] = useState<string>('');

  const [verificationStatus, setVerificationStatus] = useState<'VALID' | 'EXPIRED' | 'INVALID'>('VALID');
  const [failReason, setFailReason] = useState<string>('');

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Compute responsive unclipped screen scale based on screen width
  const isLandscape = cardState?.orientation !== 'portrait';
  const cardBaseWidth = isLandscape ? 432 : 272;
  const isMobile = windowWidth < 640;
  
  const availableWidth = isMobile
    ? Math.max(260, windowWidth - 32)
    : Math.min(windowWidth - 96, 560);

  const autoFitScale = Math.min(1.15, (availableWidth - 8) / cardBaseWidth);
  const screenScale = Math.max(0.48, Math.min(1.4, autoFitScale + userZoom));

  useEffect(() => {
    setVerifiedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));

    async function loadCard() {
      setIsLoading(true);

      // 1. Primary: Decode directly from compact URL payload (Pure Frontend-Only, No Server/LocalStorage needed)
      if (encodedData && encodedData !== 'plain') {
        const res = restoreCardFromPayload(encodedData);
        if (res.card) {
          setCardState(res.card);
          setVerificationStatus(res.status);
          setIsLoading(false);
          return;
        } else {
          setVerificationStatus('INVALID');
          setFailReason(res.reason || 'Invalid QR payload data');
        }
      }

      // 2. Query param plain text fallback: ?verify=plain&id=...&name=...&dept=...&org=...
      if (typeof window !== 'undefined') {
        const hash = window.location.hash;
        const queryStr = hash.includes('?') ? hash.substring(hash.indexOf('?') + 1) : window.location.search;
        const params = new URLSearchParams(queryStr);
        const name = params.get('name') || params.get('n');
        const id = params.get('id') || params.get('i');
        const dept = params.get('dept') || params.get('d');
        const org = params.get('org') || params.get('o');
        const tplId = params.get('template') || params.get('t') || 'coll-poly-07';

        if (name || id) {
          const baseTpl = getTemplateById(tplId);
          const base = getTemplateCardState(baseTpl);
          setCardState({
            ...base,
            details: {
              ...base.details,
              fullName: name || base.details.fullName,
              uniqueId: id || base.details.uniqueId,
              department: dept || base.details.department,
            },
            header: {
              ...base.header,
              orgName: org || base.header.orgName,
            },
          });
          setVerificationStatus('VALID');
          setIsLoading(false);
          return;
        }
      }

      // 3. Fallback check localStorage saved designs only if cardId specifically passed from studio
      if (cardId) {
        try {
          const stored = localStorage.getItem('smartid_saved_designs_v1');
          if (stored) {
            const list = JSON.parse(stored);
            const found = list.find((c: any) => c.details?.uniqueId === cardId || c.id === cardId);
            if (found) {
              setCardState(found);
              setVerificationStatus('VALID');
              setIsLoading(false);
              return;
            }
          }
        } catch {}
      }

      setVerificationStatus('INVALID');
      setIsLoading(false);
    }

    loadCard();
  }, [encodedData, cardId]);

  // Generate QR for verification view card renderer
  useEffect(() => {
    if (!cardState) return;
    generateCardQrCode(
      {
        name: cardState.details.fullName,
        id: cardState.details.uniqueId,
        department: cardState.details.department,
        org: cardState.header.orgName,
      },
      160,
      cardState
    ).then((url) => setQrUrl(url));
  }, [cardState]);

  const handleDownloadPdf = async () => {
    if (!cardState) return;
    setIsExporting(true);
    try {
      const frontElem = document.getElementById('verify-card-front');
      const backElem = document.getElementById('verify-card-back');
      const filename = `Verified_${cardState.details.fullName || 'SmartID'}_${cardState.details.uniqueId || 'Card'}`;

      if (frontElem && backElem && (activeSide === 'both' || activeSide === 'flip')) {
        await PdfExportService.exportFrontBackPdf(frontElem, backElem, cardState.orientation, filename);
      } else if (frontElem && activeSide !== 'back') {
        await PdfExportService.exportSingleSidePdf(frontElem, cardState.orientation, filename);
      } else if (backElem && activeSide === 'back') {
        await PdfExportService.exportSingleSidePdf(backElem, cardState.orientation, `${filename}_Back`);
      }
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadImage = async () => {
    if (!cardState) return;
    setIsExporting(true);
    try {
      const targetElem = (isFlipped && activeSide === 'flip') || activeSide === 'back'
        ? document.getElementById('verify-card-back')
        : document.getElementById('verify-card-front');
      const filename = `Verified_${cardState.details.fullName || 'SmartID'}_${cardState.details.uniqueId || 'Card'}`;
      if (targetElem) {
        await ImageExportService.exportCardImage(targetElem, 'png', filename);
      }
    } catch (err) {
      console.error('Image download failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    try {
      window.print();
    } catch {
      handleDownloadPdf();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#FBF9F2] text-[#1F2D24]">
        <div className="w-12 h-12 border-4 border-[#2C4F3A] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="font-bold text-sm tracking-wide text-[#2C4F3A]">Verifying Credential Authenticity...</p>
      </div>
    );
  }

  if (!cardState || verificationStatus === 'INVALID') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#FBF9F2] text-[#1F2D24]">
        <div className="max-w-md w-full p-8 bg-white rounded-3xl border border-[#D4CEBA] shadow-xl text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600">
            <Lock className="w-7 h-7" />
          </div>
          <div className="text-xs font-black uppercase tracking-widest text-[#2C4F3A]">SmartID</div>
          <h2 className="text-xl font-black text-red-700">INVALID ID QR</h2>
          <p className="text-xs text-[#59645C] leading-relaxed">
            This QR could not be verified. The scanned payload is missing required credential fields or is corrupted.
          </p>
          {failReason && (
            <p className="text-[11px] font-mono text-stone-500 bg-stone-100 p-2 rounded-lg">
              {failReason}
            </p>
          )}
          <button
            onClick={onOpenStudio}
            className="w-full py-3.5 px-4 rounded-xl bg-[#2C4F3A] text-white font-bold text-xs uppercase tracking-wider hover:bg-[#1D3527] transition-all cursor-pointer shadow-md"
          >
            Open SmartID Studio
          </button>
        </div>
      </div>
    );
  }

  const { details, colors } = cardState;
  const isExpired = verificationStatus === 'EXPIRED';

  return (
    <div className="min-h-screen bg-[#FBF9F2] text-[#1F2D24] flex flex-col items-center py-4 sm:py-8 px-2 sm:px-6">
      <div className="w-full max-w-5xl space-y-5">
        
        {/* Top Official Verification Header Banner */}
        <div className={`verify-screen-only no-print print:hidden text-white p-4 sm:p-5 rounded-3xl shadow-lg border flex flex-col sm:flex-row items-center justify-between gap-4 ${
          isExpired 
            ? 'bg-amber-900/95 border-amber-700/60' 
            : 'bg-emerald-900/95 border-emerald-700/60'
        }`}>
          <div className="flex items-center gap-3.5 w-full sm:w-auto">
            <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl border flex items-center justify-center flex-shrink-0 ${
              isExpired
                ? 'bg-amber-500/20 border-amber-400/40 text-amber-300'
                : 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300'
            }`}>
              {isExpired ? <Lock className="w-6 h-6 sm:w-7 sm:h-7" /> : <ShieldCheck className="w-6 h-6 sm:w-7 sm:h-7" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] sm:text-[11px] font-extrabold tracking-widest uppercase px-2 py-0.5 rounded-md border ${
                  isExpired
                    ? 'text-amber-300 bg-amber-950/70 border-amber-500/30'
                    : 'text-emerald-300 bg-emerald-950/70 border-emerald-500/30'
                }`}>
                  {isExpired ? 'EXPIRED ID' : 'VALID PAYLOAD'}
                </span>
                <span className="text-xs text-white/80 flex items-center gap-1 font-mono">
                  <Clock className="w-3.5 h-3.5" /> {verifiedAt}
                </span>
              </div>
              <h1 className="text-base sm:text-xl font-extrabold text-white mt-0.5 truncate">
                {isExpired ? 'Expired Digital ID Credential' : 'Official Digital ID Credential'}
              </h1>
              <p className="text-xs text-white/70 truncate">
                Issued by {cardState.header.orgName || 'Authorized Organization'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={onOpenStudio}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition-all cursor-pointer shadow-xs"
            >
              <ExternalLink className="w-4 h-4" />
              Open Studio
            </button>
          </div>
        </div>

        {/* Live Visual Card Preview Section - Whole Card Presentation */}
        <div className="bg-white p-3.5 sm:p-7 rounded-3xl border border-[#D4CEBA] shadow-xl flex flex-col items-center space-y-5 print:border-none print:shadow-none print:p-0 print:m-0 print:bg-transparent">
          
          {/* Controls Bar: View Modes & Responsive Zoom */}
          <div className="verify-screen-only no-print print:hidden w-full flex flex-col md:flex-row items-center justify-between gap-3.5 border-b border-stone-200 pb-4">
            <div className="text-center md:text-left">
              <span className="text-[10.5px] uppercase font-extrabold tracking-wider text-[#52745D] block">
                Verified Physical ID Presentation
              </span>
              <h2 className="text-sm sm:text-base font-extrabold text-[#1D3527]">
                Complete Card Preview (ISO CR80 Standard)
              </h2>
            </div>

            {/* View Mode & Zoom Controls */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              {/* View Switcher */}
              <div className="flex items-center gap-1 bg-[#F4F0E4] p-1 rounded-2xl border border-[#D4CEBA] text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setActiveSide('both')}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                    activeSide === 'both'
                      ? 'bg-[#2C4F3A] text-white shadow-sm'
                      : 'text-[#1F2D24] hover:bg-[#DFD9C4]'
                  }`}
                >
                  Both Sides
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSide('flip')}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1 ${
                    activeSide === 'flip'
                      ? 'bg-[#2C4F3A] text-white shadow-sm'
                      : 'text-[#1F2D24] hover:bg-[#DFD9C4]'
                  }`}
                >
                  <RotateCw className="w-3 h-3" />
                  Flip Card
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSide('front')}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                    activeSide === 'front'
                      ? 'bg-[#2C4F3A] text-white shadow-sm'
                      : 'text-[#1F2D24] hover:bg-[#DFD9C4]'
                  }`}
                >
                  Front
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSide('back')}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                    activeSide === 'back'
                      ? 'bg-[#2C4F3A] text-white shadow-sm'
                      : 'text-[#1F2D24] hover:bg-[#DFD9C4]'
                  }`}
                >
                  Back
                </button>
              </div>

              {/* Responsive Zoom Controls */}
              <div className="flex items-center gap-1 bg-[#F4F0E4] p-1 rounded-2xl border border-[#D4CEBA] text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setUserZoom((prev) => Math.max(-0.35, prev - 0.1))}
                  className="w-7 h-7 flex items-center justify-center rounded-xl hover:bg-[#DFD9C4] text-[#1F2D24] transition-colors cursor-pointer"
                  title="Zoom out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setUserZoom(0)}
                  className="px-2 py-1 rounded-xl text-[10.5px] text-[#59645C] hover:bg-[#DFD9C4] transition-colors cursor-pointer"
                  title="Fit whole card to screen"
                >
                  Fit ({Math.round(screenScale * 100)}%)
                </button>
                <button
                  type="button"
                  onClick={() => setUserZoom((prev) => Math.min(0.4, prev + 0.1))}
                  className="w-7 h-7 flex items-center justify-center rounded-xl hover:bg-[#DFD9C4] text-[#1F2D24] transition-colors cursor-pointer"
                  title="Zoom in"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Rendered Whole Card Surface on Screen: Auto-scaled, ZERO clipping, smooth centered layout */}
          <div className="verify-screen-only no-print print:hidden w-full bg-[#FBF9F2] p-2.5 sm:p-6 rounded-3xl border border-stone-200 shadow-inner flex flex-col items-center justify-center overflow-x-auto">
            
            {/* VIEW MODE 1: BOTH SIDES (Responsive Stacked on mobile, Side-by-Side on wide screens) */}
            {activeSide === 'both' && (
              <div className="flex flex-col lg:flex-row items-center justify-center gap-6 w-full max-w-full">
                {/* FRONT SIDE */}
                <div className="flex flex-col items-center gap-2 max-w-full flex-shrink-0">
                  <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-[#52745D] bg-[#DFD9C4] px-3.5 py-0.5 rounded-full shadow-2xs">
                    Front Side • Identification
                  </span>
                  <div id="verify-card-front" className="flex items-center justify-center shadow-xl rounded-2xl overflow-hidden transition-all">
                    <CardRenderer
                      cardState={cardState}
                      side="front"
                      scale={screenScale}
                      qrDataUrl={qrUrl}
                    />
                  </div>
                </div>

                {/* BACK SIDE */}
                <div className="flex flex-col items-center gap-2 max-w-full flex-shrink-0">
                  <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-[#52745D] bg-[#DFD9C4] px-3.5 py-0.5 rounded-full shadow-2xs">
                    Back Side • Terms & Emergency
                  </span>
                  <div id="verify-card-back" className="flex items-center justify-center shadow-xl rounded-2xl overflow-hidden transition-all">
                    <CardRenderer
                      cardState={cardState}
                      side="back"
                      scale={screenScale}
                      qrDataUrl={qrUrl}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* VIEW MODE 2: INTERACTIVE 3D FLIP CARD */}
            {activeSide === 'flip' && (
              <div className="flex flex-col items-center gap-3 w-full">
                <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-[#52745D] bg-[#DFD9C4] px-3.5 py-0.5 rounded-full shadow-2xs flex items-center gap-1.5">
                  <RotateCw className="w-3 h-3 text-[#2C4F3A]" />
                  {isFlipped ? 'Back Side • Terms & Emergency' : 'Front Side • Identification'} (Tap Card to Flip)
                </span>

                <div 
                  onClick={() => setIsFlipped(!isFlipped)} 
                  className="cursor-pointer group flex items-center justify-center p-1 rounded-3xl transition-transform hover:scale-[1.01] active:scale-[0.99]"
                  title="Click card to flip between Front and Back"
                  style={{ perspective: 1200 }}
                >
                  <div 
                    className="relative transition-transform duration-500 shadow-2xl rounded-2xl overflow-hidden"
                    style={{
                      transformStyle: 'preserve-3d',
                      transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                    }}
                  >
                    {/* Front Face */}
                    <div 
                      id="verify-card-front"
                      style={{ backfaceVisibility: 'hidden' }}
                    >
                      <CardRenderer
                        cardState={cardState}
                        side="front"
                        scale={screenScale}
                        qrDataUrl={qrUrl}
                      />
                    </div>

                    {/* Back Face */}
                    <div 
                      id="verify-card-back"
                      className="absolute inset-0 flex items-center justify-center"
                      style={{ 
                        backfaceVisibility: 'hidden',
                        transform: 'rotateY(180deg)',
                      }}
                    >
                      <CardRenderer
                        cardState={cardState}
                        side="back"
                        scale={screenScale}
                        qrDataUrl={qrUrl}
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsFlipped(!isFlipped)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2C4F3A] hover:bg-[#1D3527] text-white text-xs font-bold transition-all shadow-sm cursor-pointer active:scale-95"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  Flip to {isFlipped ? 'Front Side' : 'Back Side'}
                </button>
              </div>
            )}

            {/* VIEW MODE 3: FRONT SIDE ONLY */}
            {activeSide === 'front' && (
              <div className="flex flex-col items-center gap-2 max-w-full">
                <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-[#52745D] bg-[#DFD9C4] px-3.5 py-0.5 rounded-full shadow-2xs">
                  Front Side • Identification
                </span>
                <div id="verify-card-front" className="flex items-center justify-center shadow-xl rounded-2xl overflow-hidden transition-all">
                  <CardRenderer
                    cardState={cardState}
                    side="front"
                    scale={screenScale}
                    qrDataUrl={qrUrl}
                  />
                </div>
              </div>
            )}

            {/* VIEW MODE 4: BACK SIDE ONLY */}
            {activeSide === 'back' && (
              <div className="flex flex-col items-center gap-2 max-w-full">
                <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-[#52745D] bg-[#DFD9C4] px-3.5 py-0.5 rounded-full shadow-2xs">
                  Back Side • Terms & Emergency
                </span>
                <div id="verify-card-back" className="flex items-center justify-center shadow-xl rounded-2xl overflow-hidden transition-all">
                  <CardRenderer
                    cardState={cardState}
                    side="back"
                    scale={screenScale}
                    qrDataUrl={qrUrl}
                  />
                </div>
              </div>
            )}
          </div>

          {/* DEDICATED PRINT CONTAINER: Only visible during @media print */}
          <div className="print-only-container hidden print:block w-full m-0 p-0">
            <div 
              className="print-card-page flex items-center justify-center m-0 p-0"
              style={{
                pageBreakAfter: 'always',
                breakAfter: 'page',
              }}
            >
              <div id="verify-card-front-print" className="flex items-center justify-center">
                <CardRenderer
                  cardState={cardState}
                  side="front"
                  scale={printScale}
                  qrDataUrl={qrUrl}
                />
              </div>
            </div>

            <div 
              className="print-card-page flex items-center justify-center m-0 p-0"
              style={{
                pageBreakAfter: 'avoid',
                breakAfter: 'avoid',
              }}
            >
              <div id="verify-card-back-print" className="flex items-center justify-center">
                <CardRenderer
                  cardState={cardState}
                  side="back"
                  scale={printScale}
                  qrDataUrl={qrUrl}
                />
              </div>
            </div>
          </div>

          {/* Interactive Print Size Presets Bar */}
          <div className="verify-screen-only no-print print:hidden flex flex-wrap items-center justify-center gap-2 text-xs pt-1">
            <span className="font-extrabold text-[#59645C] text-[11px] uppercase tracking-wider">Print Size:</span>
            {[
              { label: 'Large Badge (135%)', val: 1.35, tip: '154mm' },
              { label: 'Jumbo Display (175%)', val: 1.75, tip: '200mm' },
              { label: 'Standard (100%)', val: 1.0, tip: '114mm' },
              { label: 'Pocket Card (75%)', val: 0.75, tip: '85.6mm' },
            ].map((s) => (
              <button
                key={s.val}
                type="button"
                onClick={() => setPrintScale(s.val)}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer text-xs ${
                  printScale === s.val
                    ? 'bg-[#2C4F3A] text-white shadow-sm'
                    : 'bg-[#F4F0E4] hover:bg-[#DFD9C4] text-[#1F2D24] border border-[#D4CEBA]'
                }`}
                title={`Width: ~${s.tip}`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Card action controls: PDF, Image, Print */}
          <div className="verify-screen-only no-print print:hidden flex flex-wrap items-center justify-center gap-3 w-full pt-1">
            <button
              onClick={handleDownloadPdf}
              disabled={isExporting}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#2C4F3A] hover:bg-[#1D3527] text-white font-extrabold text-xs uppercase tracking-wider transition-all shadow-md active:scale-98 cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {isExporting ? 'Exporting PDF...' : 'Download Card PDF (300 DPI)'}
            </button>

            <button
              onClick={handleDownloadImage}
              disabled={isExporting}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#DFD9C4] hover:bg-[#D4CEBA] text-[#1D3527] border border-[#BDB6A0] font-extrabold text-xs uppercase tracking-wider transition-all active:scale-98 cursor-pointer shadow-xs disabled:opacity-50"
            >
              <ImageIcon className="w-4 h-4" />
              Save Image (PNG)
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#E9E4D4] hover:bg-[#DFD9C4] text-[#1D3527] border border-[#D4CEBA] font-extrabold text-xs uppercase tracking-wider transition-all active:scale-98 cursor-pointer shadow-xs"
            >
              <Printer className="w-4 h-4" />
              Print Card
            </button>
          </div>
        </div>

        {/* Detailed Credential Information Breakdown */}
        <div className="verify-screen-only no-print print:hidden bg-white p-5 sm:p-8 rounded-3xl border border-[#D4CEBA] shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-stone-200 pb-4">
            <div className="flex items-center gap-2.5">
              <User className="w-5 h-5 text-[#2C4F3A]" />
              <h2 className="text-base font-bold text-[#1D3527]">Verified Cardholder Profile</h2>
            </div>
            <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5" /> Cryptographically Valid
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200">
              <span className="text-[10px] font-bold text-[#59645C] uppercase tracking-wider block">
                Full Name
              </span>
              <span className="text-sm font-extrabold text-[#1D3527] mt-0.5 block">
                {details.fullName || '—'}
              </span>
            </div>

            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200">
              <span className="text-[10px] font-bold text-[#59645C] uppercase tracking-wider block">
                Identification Number
              </span>
              <span className="text-sm font-mono font-extrabold text-[#1D3527] mt-0.5 block">
                {details.uniqueId || '—'}
              </span>
            </div>

            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200">
              <span className="text-[10px] font-bold text-[#59645C] uppercase tracking-wider block">
                Role / Designation
              </span>
              <span className="text-sm font-semibold text-[#1D3527] mt-0.5 block">
                {details.designation || '—'}
              </span>
            </div>

            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200">
              <span className="text-[10px] font-bold text-[#59645C] uppercase tracking-wider block">
                Department
              </span>
              <span className="text-sm font-semibold text-[#1D3527] mt-0.5 block">
                {details.department || '—'}
              </span>
            </div>

            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200">
              <span className="text-[10px] font-bold text-[#59645C] uppercase tracking-wider block">
                Issuing Organization
              </span>
              <span className="text-sm font-semibold text-[#1D3527] mt-0.5 block">
                {cardState.header.orgName || '—'}
              </span>
            </div>

            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200">
              <span className="text-[10px] font-bold text-[#59645C] uppercase tracking-wider block">
                Validity Period
              </span>
              <span className="text-sm font-semibold text-[#1D3527] mt-0.5 block">
                {details.validFrom || '—'} to {details.validUntil || 'Lifetime'}
              </span>
            </div>

            {details.bloodGroup && (
              <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200">
                <span className="text-[10px] font-bold text-[#59645C] uppercase tracking-wider block">
                  Blood Group
                </span>
                <span className="text-sm font-bold text-red-700 mt-0.5 block">
                  {details.bloodGroup}
                </span>
              </div>
            )}

            {details.phone && (
              <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200">
                <span className="text-[10px] font-bold text-[#59645C] uppercase tracking-wider block">
                  Contact Phone
                </span>
                <span className="text-sm font-semibold text-[#1D3527] mt-0.5 block">
                  {details.phone}
                </span>
              </div>
            )}

            {details.emergencyContact && (
              <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 sm:col-span-2">
                <span className="text-[10px] font-bold text-[#59645C] uppercase tracking-wider block">
                  Emergency Contact
                </span>
                <span className="text-sm font-semibold text-[#1D3527] mt-0.5 block">
                  {details.emergencyContact}
                </span>
              </div>
            )}

            {details.address && (
              <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 sm:col-span-2">
                <span className="text-[10px] font-bold text-[#59645C] uppercase tracking-wider block">
                  Registered Address
                </span>
                <span className="text-sm font-semibold text-[#1D3527] mt-0.5 block">
                  {details.address}
                </span>
              </div>
            )}
          </div>

          {/* Theme & Styling Metadata */}
          <div className="pt-4 border-t border-stone-200">
            <span className="text-[11px] font-bold text-[#59645C] uppercase tracking-wider block mb-3">
              Applied Design Archetype & Security Attributes
            </span>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="px-3 py-1 bg-stone-100 rounded-lg text-stone-700 font-medium">
                Font: {cardState.fontFamily}
              </span>
              <span className="px-3 py-1 bg-stone-100 rounded-lg text-stone-700 font-medium">
                Pattern: {cardState.pattern}
              </span>
              <span className="px-3 py-1 bg-stone-100 rounded-lg text-stone-700 font-medium">
                Orientation: {cardState.orientation}
              </span>
              <span className="px-3 py-1 bg-stone-100 rounded-lg text-stone-700 font-medium flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors.primary }} />
                Primary: {colors.primary}
              </span>
              <span className="px-3 py-1 bg-stone-100 rounded-lg text-stone-700 font-medium flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors.accent }} />
                Accent: {colors.accent}
              </span>
            </div>
          </div>
        </div>

        {/* Security Disclaimers & Issuer Seal */}
        <div className="verify-screen-only no-print print:hidden text-center text-xs text-[#59645C] space-y-1 pb-8">
          <p className="font-mono font-medium">
            SmartID Cryptographic Verification Service • Protocol ISO/IEC 7810:2019
          </p>
          <p>
            Scan authenticated against verified public digital credential ledger.
          </p>
        </div>

      </div>
    </div>
  );
};
