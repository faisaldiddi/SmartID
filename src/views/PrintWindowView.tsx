import React, { useEffect, useState } from 'react';
import { Printer, Download, ArrowLeft, CheckCircle } from 'lucide-react';
import { CardState, PrintCalibration } from '../types';
import { CardRenderer } from '../components/CardRenderer';
import { PdfExportService } from '../utils/PdfExportService';
import { generateCardQrCode } from '../utils/qrGenerator';

interface PrintWindowViewProps {
  cardState: CardState;
  calibration: PrintCalibration;
  onBack: () => void;
}

export const PrintWindowView: React.FC<PrintWindowViewProps> = ({
  cardState: initialCardState,
  calibration,
  onBack,
}) => {
  const [cardState, setCardState] = useState<CardState>(initialCardState);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);
  const [printDispatched, setPrintDispatched] = useState(false);

  // Restore designated print target from localStorage or server
  useEffect(() => {
    try {
      const stored = localStorage.getItem('smartid_print_target');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.details) {
          setCardState(parsed);
          return;
        }
      }
    } catch {}

    fetch('/api/credentials/current_print')
      .then((r) => r.json())
      .then((data) => {
        if (data && data.cardState && data.cardState.details) {
          setCardState(data.cardState);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    generateCardQrCode(
      {
        name: cardState.details.fullName,
        id: cardState.details.uniqueId,
        department: cardState.details.department,
        org: cardState.header.orgName,
      },
      180,
      cardState
    ).then((url) => setQrDataUrl(url));
  }, [cardState]);

  // Auto-trigger print if requested via query param
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autoprint') === 'true') {
        const timer = setTimeout(() => {
          handlePrint();
        }, 600);
        return () => clearTimeout(timer);
      }
    }
  }, [qrDataUrl]);

  const handlePrint = () => {
    try {
      setPrintDispatched(true);
      window.print();
    } catch (err) {
      console.warn('Direct print blocked, falling back to PDF download:', err);
      handleDownloadPdf();
    }
  };

  const handleDownloadPdf = async () => {
    setIsExporting(true);
    try {
      const frontElem = document.getElementById('print-standalone-front');
      const backElem = document.getElementById('print-standalone-back');
      const filename = `${cardState.details.fullName || 'SmartID'}_${cardState.details.uniqueId || 'Card'}_PrintReady`;

      if (calibration.printMode === 'a4' && frontElem) {
        await PdfExportService.exportA4SheetPdf(frontElem, calibration.copies || 8, `${filename}_A4_Sheet`);
      } else if (calibration.cardSide === 'both' && frontElem && backElem) {
        await PdfExportService.exportFrontBackPdf(frontElem, backElem, cardState.orientation, filename);
      } else if (calibration.cardSide === 'back' && backElem) {
        await PdfExportService.exportSingleSidePdf(backElem, cardState.orientation, `${filename}_Back`);
      } else if (frontElem) {
        await PdfExportService.exportSingleSidePdf(frontElem, cardState.orientation, filename);
      }
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBF9F2] text-[#1F2D24] flex flex-col">
      {/* Top action toolbar - strictly hidden when printing */}
      <div className="no-print print:hidden sticky top-0 z-50 bg-[#1D3527] text-white px-6 py-4 border-b border-stone-800 shadow-md flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Studio
          </button>
          <div>
            <h1 className="text-sm font-extrabold uppercase tracking-wider text-[#FBF9F2]">
              Print-Ready Dispatch Canvas
            </h1>
            <p className="text-[11px] text-emerald-200/80">
              ISO CR80 Standard (85.60 × 53.98 mm) • {calibration.printMode === 'a4' ? 'A4 Cut Sheet' : 'Direct PVC Card'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleDownloadPdf}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {isExporting ? 'Generating PDF...' : 'Download 300 DPI PDF'}
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#2C4F3A] hover:bg-[#233f2e] border border-emerald-500/40 text-white text-xs font-extrabold uppercase tracking-wider shadow-lg hover:shadow-xl transition-all active:scale-98 cursor-pointer"
          >
            <Printer className="w-4 h-4 stroke-[2.5]" />
            Send to Printer (Ctrl+P)
          </button>
        </div>
      </div>

      {/* Main Print Surface */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-stone-200/60 print:bg-white print:p-0 standalone-print-surface">
        
        {/* Printable Card Area */}
        <div className="bg-white p-6 rounded-3xl shadow-xl border border-stone-300 print:shadow-none print:border-none print:p-0 standalone-print-surface">
          {calibration.printMode === 'a4' ? (
            // A4 Multi-card grid
            <div className="grid grid-cols-2 gap-6 p-4 max-w-2xl bg-white">
              {Array.from({ length: Math.min(calibration.copies || 8, 8) }).map((_, idx) => (
                <div key={idx} className="border border-dashed border-stone-300 p-1 rounded-xl">
                  <div id={idx === 0 ? 'print-standalone-front' : undefined}>
                    <CardRenderer
                      cardState={cardState}
                      side={calibration.cardSide === 'back' ? 'back' : 'front'}
                      scale={0.75}
                      showBleedMarks={true}
                      qrDataUrl={qrDataUrl}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // CR80 Direct Card
            <div 
              className="flex flex-col items-center gap-8 print:gap-0 print:block"
            >
              {(calibration.cardSide === 'front' || calibration.cardSide === 'both') && (
                <div 
                  id="print-standalone-front" 
                  className="print-card-page print:m-0 flex items-center justify-center"
                  style={{
                    pageBreakAfter: calibration.cardSide === 'both' ? 'always' : 'avoid',
                    breakAfter: calibration.cardSide === 'both' ? 'page' : 'avoid',
                  }}
                >
                  <div
                    style={{
                      transform: `translate(${calibration.offsetX}mm, ${calibration.offsetY}mm)`,
                      transformOrigin: 'center center',
                    }}
                  >
                    <CardRenderer
                      cardState={cardState}
                      side="front"
                      scale={(calibration.scale || 100) / 100}
                      showBleedMarks={false}
                      qrDataUrl={qrDataUrl}
                    />
                  </div>
                </div>
              )}

              {(calibration.cardSide === 'back' || calibration.cardSide === 'both') && (
                <div 
                  id="print-standalone-back" 
                  className="print-card-page print:m-0 flex items-center justify-center"
                  style={{
                    pageBreakAfter: 'avoid',
                    breakAfter: 'avoid',
                  }}
                >
                  <div
                    style={{
                      transform: `translate(${calibration.offsetX}mm, ${calibration.offsetY}mm)`,
                      transformOrigin: 'center center',
                    }}
                  >
                    <CardRenderer
                      cardState={cardState}
                      side="back"
                      scale={(calibration.scale || 100) / 100}
                      showBleedMarks={false}
                      qrDataUrl={qrDataUrl}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <p className="no-print print:hidden mt-6 text-xs text-[#59645C] text-center max-w-md">
          Tip: In the browser print dialog, set <span className="font-semibold text-[#1D3527]">Margins to None</span> and check <span className="font-semibold text-[#1D3527]">Background Graphics</span> for true PVC color saturation.
        </p>
      </div>
    </div>
  );
};
