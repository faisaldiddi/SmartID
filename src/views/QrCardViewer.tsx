import React, { useState, useEffect, useCallback } from 'react';
import { X, RotateCw, ShieldCheck, AlertTriangle, ShieldAlert } from 'lucide-react';
import { CardState } from '../types';
import { CardRenderer } from '../components/CardRenderer';
import { CardScaleContainer } from '../components/CardScaleContainer';
import { CardErrorBoundary } from '../components/CardErrorBoundary';
import { restoreCardFromPayload } from '../utils/VerificationPayloadService';

interface QrCardViewerProps {
  encodedData?: string;
}

const QrCardViewerContent: React.FC<QrCardViewerProps> = ({ encodedData }) => {
  const [cardState, setCardState] = useState<CardState | null>(null);
  const [status, setStatus] = useState<'VALID' | 'EXPIRED' | 'INVALID'>('VALID');
  const [failReason, setFailReason] = useState<string>('');
  const [activeSide, setActiveSide] = useState<'front' | 'back'>('front');
  const [windowWidth, setWindowWidth] = useState<number>(() =>
    typeof window !== 'undefined' ? window.innerWidth : 390
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Proportional responsive scaling: Card dimensions remain strictly ISO CR80
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Decode QR payload on load (pure frontend-only, zero backend / localStorage lookup)
  useEffect(() => {
    setIsLoading(true);

    if (!encodedData || encodedData.trim() === '') {
      setStatus('INVALID');
      setFailReason('No credential payload found in URL.');
      setIsLoading(false);
      return;
    }

    const res = restoreCardFromPayload(encodedData);
    if (res.card && (res.status === 'VALID' || res.status === 'EXPIRED')) {
      setCardState(res.card);
      setStatus(res.status);
    } else {
      setCardState(null);
      setStatus('INVALID');
      setFailReason(res.reason || 'This QR does not contain a valid SmartID card.');
    }

    setIsLoading(false);
  }, [encodedData]);

  // Disable all editing keyboard shortcuts and context menus in QR Read-Only Viewer mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Block Delete, Backspace, Ctrl+S, Ctrl+Z, Ctrl+C, Ctrl+V, arrow keys
      if (
        e.key === 'Delete' ||
        e.key === 'Backspace' ||
        ((e.ctrlKey || e.metaKey) && ['s', 'z', 'c', 'v', 'a', 'x', 'y'].includes(e.key.toLowerCase()))
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('contextmenu', handleContextMenu, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('contextmenu', handleContextMenu, true);
    };
  }, []);

  const canGoBack = typeof window !== 'undefined' && (window.history.length > 1 || Boolean(window.opener));

  const handleClose = useCallback(() => {
    if (typeof window !== 'undefined') {
      if (window.opener) {
        window.close();
      } else if (window.history.length > 1) {
        window.history.back();
      }
    }
  }, []);

  // Card dimensions: ISO CR80 standard (Landscape 432x272, Portrait 272x432)
  const isLandscape = cardState?.orientation === 'landscape';
  const cardBaseWidth = isLandscape ? 432 : 272;
  const cardBaseHeight = isLandscape ? 272 : 432;

  // Compute available container width for proportional scaling
  const horizontalPadding = windowWidth < 480 ? 24 : 48;
  const maxAllowedWidth = isLandscape ? 440 : 310;
  const availableWidth = Math.min(windowWidth - horizontalPadding, maxAllowedWidth);

  // 1. LOADING STATE
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#173B2A] flex flex-col items-center justify-center p-6 text-white select-none">
        <div className="text-sm font-black tracking-widest uppercase mb-4 text-[#E7DEC8]">
          SmartID
        </div>
        <div className="w-10 h-10 border-3 border-[#E7DEC8] border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs font-semibold tracking-wider text-stone-200">
          Loading ID Card...
        </p>
      </div>
    );
  }

  // 2. INVALID QR SCREEN: Never show demo data or editor
  if (!cardState || status === 'INVALID') {
    return (
      <div className="min-h-screen bg-[#173B2A] flex flex-col items-center justify-between p-6 text-white select-none">
        <header className="w-full text-center pt-3">
          <div className="text-sm font-black tracking-widest uppercase text-[#E7DEC8]">SmartID</div>
        </header>

        <main className="w-full max-w-sm bg-[#FBF9F2] text-[#173B2A] rounded-3xl border border-red-200 shadow-2xl p-7 text-center space-y-3.5 my-auto">
          <div className="w-13 h-13 mx-auto rounded-2xl bg-red-100 border border-red-200 flex items-center justify-center text-red-600 shadow-xs">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h2 className="text-base font-black text-red-700 tracking-tight uppercase">
            INVALID ID CARD
          </h2>
          <p className="text-xs text-stone-600 leading-relaxed">
            This QR does not contain a valid SmartID card.
          </p>
          {failReason && (
            <p className="text-[10px] font-mono text-stone-400 bg-stone-100 p-2 rounded-lg break-words">
              {failReason}
            </p>
          )}
        </main>

        <footer className="w-full text-center pb-4">
          <p className="text-xs text-stone-400 tracking-wide font-medium">
            Verified using SmartID
          </p>
        </footer>
      </div>
    );
  }

  const hasBack = Boolean(cardState.hasBack);

  // 3. READ-ONLY "CARD PREVIEW" MODAL / POPUP
  return (
    <div className="min-h-screen bg-[#173B2A] text-white flex flex-col items-center justify-center p-3 sm:p-6 select-none box-border">
      
      {/* Small SmartID Brand Mark at top */}
      <div className="text-center mb-3">
        <span className="text-xs font-black tracking-widest text-[#E7DEC8] uppercase">
          SmartID
        </span>
      </div>

      {/* Main Card Preview Popup Box */}
      <div className="w-full max-w-md bg-[#FBF9F2] text-[#173B2A] rounded-3xl shadow-2xl border border-[#D4CEBA] overflow-hidden flex flex-col items-center box-border">
        
        {/* Header: "Card Preview" + Close "X" (if history available) */}
        <div className="w-full px-5 py-3.5 border-b border-stone-200/80 flex items-center justify-between bg-white/70">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#2C4F3A]" />
            <h2 className="text-sm font-extrabold tracking-tight text-[#173B2A]">
              Card Preview
            </h2>
          </div>
          {canGoBack && (
            <button
              type="button"
              onClick={handleClose}
              className="w-7 h-7 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 hover:text-stone-800 transition-all flex items-center justify-center cursor-pointer"
              aria-label="Close Preview"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Read-Only Status Banner */}
        <div className="w-full pt-4 pb-2 flex items-center justify-center">
          {status === 'VALID' ? (
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-[11px] font-extrabold tracking-wider uppercase shadow-2xs">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
              <span>✓ VERIFIED • READ ONLY</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-extrabold tracking-wider uppercase shadow-2xs">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
              <span>EXPIRED ID • READ ONLY</span>
            </div>
          )}
        </div>

        {/* The Exact Generated ID Card Scaled Proportionally with Zero Clipping */}
        <div className="w-full px-3 py-3 sm:px-6 flex items-center justify-center box-border overflow-hidden">
          <div 
            className="flex items-center justify-center select-none"
            style={{ pointerEvents: 'none' }}
          >
            <CardScaleContainer
              logicalWidth={cardBaseWidth}
              logicalHeight={cardBaseHeight}
              availableWidth={availableWidth}
              className="rounded-2xl shadow-xl overflow-hidden"
            >
              <CardRenderer
                cardState={cardState}
                side={activeSide}
                scale={1}
                mode="readonly"
              />
            </CardScaleContainer>
          </div>
        </div>

        {/* Optional Front / Back Toggle Controls (Only if card has back) */}
        {hasBack && (
          <div className="pb-3 pt-1 flex items-center justify-center">
            <div className="inline-flex items-center gap-1 p-1 bg-stone-200/80 rounded-xl text-xs font-bold shadow-2xs">
              <button
                type="button"
                onClick={() => setActiveSide('front')}
                className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeSide === 'front'
                    ? 'bg-[#173B2A] text-white shadow-xs'
                    : 'text-stone-700 hover:text-stone-950'
                }`}
              >
                Front
              </button>
              <button
                type="button"
                onClick={() => setActiveSide('back')}
                className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeSide === 'back'
                    ? 'bg-[#173B2A] text-white shadow-xs'
                    : 'text-stone-700 hover:text-stone-950'
                }`}
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setActiveSide((prev) => (prev === 'front' ? 'back' : 'front'))}
                className="px-2 py-1.5 rounded-lg text-stone-600 hover:text-stone-950 transition-all cursor-pointer flex items-center gap-1"
                title="Flip Card"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="w-full py-3 border-t border-stone-200/60 text-center bg-stone-50/70">
          <p className="text-[11px] font-medium text-stone-500 tracking-wide">
            Verified using SmartID
          </p>
        </div>

      </div>

    </div>
  );
};

export const QrCardViewer: React.FC<QrCardViewerProps> = (props) => (
  <CardErrorBoundary>
    <QrCardViewerContent {...props} />
  </CardErrorBoundary>
);
