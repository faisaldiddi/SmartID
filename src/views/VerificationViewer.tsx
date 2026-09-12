import React, { useState, useEffect } from 'react';
import { ShieldCheck, AlertTriangle, ShieldAlert, RotateCw } from 'lucide-react';
import { CardState } from '../types';
import { CardRenderer } from '../components/CardRenderer';
import { restoreCardFromPayload } from '../utils/VerificationPayloadService';

interface VerificationViewerProps {
  encodedData?: string;
}

export const VerificationViewer: React.FC<VerificationViewerProps> = ({ encodedData }) => {
  const [cardState, setCardState] = useState<CardState | null>(null);
  const [status, setStatus] = useState<'VALID' | 'EXPIRED' | 'INVALID'>('VALID');
  const [failReason, setFailReason] = useState<string>('');
  const [activeSide, setActiveSide] = useState<'front' | 'back'>('front');
  const [windowWidth, setWindowWidth] = useState<number>(() =>
    typeof window !== 'undefined' ? window.innerWidth : 390
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Track window resizing for proportional card scaling on mobile
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
      setFailReason('No verification payload found in URL.');
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
      setFailReason(res.reason || 'This QR does not contain a valid SmartID credential.');
    }

    setIsLoading(false);
  }, [encodedData]);

  // Determine card base dimensions (CR80 standard)
  const isLandscape = cardState?.orientation === 'landscape';
  const cardBaseWidth = isLandscape ? 432 : 272;

  // Calculate proportional scale: Card never rearranges elements, it scales uniformly
  const padding = windowWidth < 480 ? 28 : 48;
  const availableWidth = Math.min(windowWidth - padding, isLandscape ? 460 : 340);
  const cardScale = Math.max(0.68, Math.min(1.08, availableWidth / cardBaseWidth));

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FBF9F2] text-[#173B2A] flex flex-col items-center justify-center p-6">
        <div className="w-10 h-10 border-3 border-[#173B2A] border-t-transparent rounded-full animate-spin mb-3" />
        <span className="text-xs font-semibold tracking-wider text-[#173B2A]">
          Verifying Credential...
        </span>
      </div>
    );
  }

  // INVALID ID SCREEN: Never show a hardcoded demo card
  if (!cardState || status === 'INVALID') {
    return (
      <div className="min-h-screen bg-[#FBF9F2] text-[#173B2A] flex flex-col items-center justify-between p-6">
        {/* Verification Header */}
        <header className="w-full text-center pt-4 pb-2">
          <h1 className="text-sm font-black tracking-widest text-[#173B2A] uppercase">SmartID</h1>
          <p className="text-[11px] font-medium tracking-wide text-stone-500">ID Verification</p>
        </header>

        {/* Invalid Status Box */}
        <main className="w-full max-w-sm bg-white rounded-3xl border border-red-200 shadow-md p-6 text-center space-y-3 my-auto">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="inline-block px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-black tracking-wider uppercase">
            INVALID ID
          </div>
          <p className="text-xs text-stone-600 leading-relaxed">
            This QR does not contain a valid SmartID card.
          </p>
          {failReason && (
            <p className="text-[10.5px] font-mono text-stone-400 bg-stone-50 p-2 rounded-lg break-words">
              {failReason}
            </p>
          )}
        </main>

        {/* Verification Footer */}
        <footer className="w-full text-center pb-4 pt-2">
          <p className="text-[11px] font-medium text-stone-400 tracking-wide">
            Verified using SmartID
          </p>
        </footer>
      </div>
    );
  }

  // VALID / EXPIRED ID VIEWER
  return (
    <div className="min-h-screen bg-[#FBF9F2] text-[#173B2A] flex flex-col items-center justify-between px-3 py-4 sm:py-6">
      
      {/* 1. Verification Header */}
      <header className="w-full text-center pt-2 pb-2">
        <h1 className="text-base font-black tracking-widest text-[#173B2A] uppercase">SmartID</h1>
        <p className="text-xs font-medium tracking-wider text-stone-500">ID Verification</p>
      </header>

      {/* 2. Verification Status Badge */}
      <div className="my-2">
        {status === 'VALID' ? (
          <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-extrabold tracking-wider shadow-2xs">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>✓ VALID ID</span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs font-extrabold tracking-wider shadow-2xs">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>EXPIRED ID</span>
          </div>
        )}
      </div>

      {/* 3. Rendered ID Card (Scaled proportionally, strictly unclipped) */}
      <main className="w-full flex flex-col items-center justify-center my-auto py-2">
        <div className="flex items-center justify-center shadow-xl rounded-2xl overflow-hidden border border-[#D4CEBA] bg-white">
          <CardRenderer
            cardState={cardState}
            side={activeSide}
            scale={cardScale}
          />
        </div>

        {/* Front / Back Toggle Controls */}
        <div className="mt-4 flex items-center justify-center">
          <div className="inline-flex items-center gap-1 p-1 bg-stone-200/70 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveSide('front')}
              className={`px-4 py-1.5 rounded-lg transition-all cursor-pointer ${
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
              className={`px-4 py-1.5 rounded-lg transition-all cursor-pointer ${
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
              className="px-2 py-1.5 rounded-lg text-stone-600 hover:text-stone-900 transition-all cursor-pointer flex items-center gap-1"
              title="Flip card"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </main>

      {/* 4. Verification Footer */}
      <footer className="w-full text-center pt-3 pb-2 border-t border-stone-200/60 mt-2">
        <p className="text-xs font-medium text-stone-500 tracking-wide">
          Verified using SmartID
        </p>
      </footer>

    </div>
  );
};
