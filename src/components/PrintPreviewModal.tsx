import React, { useState } from 'react';
import { 
  Printer, 
  Settings2, 
  Sliders, 
  Eye, 
  Check, 
  X, 
  Copy, 
  Grid, 
  Scissors,
  Download,
  FileDown,
  ExternalLink
} from 'lucide-react';
import { CardState, PrintCalibration, PrintMode, CardSide } from '../types';
import { CardRenderer } from './CardRenderer';
import { savePrintCalibration, DEFAULT_CALIBRATION, saveCurrentDraft, setPrintTarget } from '../utils/storage';
import { PdfExportService } from '../utils/PdfExportService';
import { downloadSingleCardPdf, downloadFrontBackPdf, downloadCardImage, downloadA4SheetPdf } from '../utils/pdfExport';
import { printCardDirectly } from '../utils/printEngine';

interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  cardState: CardState;
  calibration: PrintCalibration;
  onUpdateCalibration: (cal: PrintCalibration) => void;
  qrDataUrl?: string;
  onTriggerBrowserPrint: () => void;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({
  isOpen,
  onClose,
  cardState,
  calibration,
  onUpdateCalibration,
  qrDataUrl,
  onTriggerBrowserPrint,
  onShowToast,
}) => {
  const [activeSidePreview, setActiveSidePreview] = useState<CardSide>('front');
  const [showCutMarks, setShowCutMarks] = useState(true);
  const [exportingPdf, setExportingPdf] = useState(false);

  if (!isOpen) return null;

  const handleCalibrationChange = <K extends keyof PrintCalibration>(key: K, value: PrintCalibration[K]) => {
    const updated = { ...calibration, [key]: value };
    onUpdateCalibration(updated);
  };

  const handleSaveSettings = () => {
    savePrintCalibration(calibration);
    onShowToast('Print calibration settings saved locally', 'success');
  };

  const handleResetSettings = () => {
    onUpdateCalibration(DEFAULT_CALIBRATION);
    savePrintCalibration(DEFAULT_CALIBRATION);
    onShowToast('Reset to standard CR80 print specs', 'info');
  };

  const handleDownloadPdf = async () => {
    setExportingPdf(true);
    try {
      const frontElem = document.getElementById('print-modal-card-front');
      const backElem = document.getElementById('print-modal-card-back');
      const filename = `${cardState.details.fullName || 'Card'}_${cardState.details.uniqueId}`;

      if (calibration.printMode === 'a4' && frontElem) {
        await PdfExportService.exportA4SheetPdf(frontElem, calibration.copies || 8, `${filename}_A4_Sheet`);
        onShowToast('A4 Multi-Card Print Sheet PDF downloaded!', 'success');
      } else if (calibration.cardSide === 'both' && frontElem && backElem) {
        await PdfExportService.exportFrontBackPdf(frontElem, backElem, cardState.orientation, filename);
        onShowToast('CR80 Front & Back PDF downloaded!', 'success');
      } else if (calibration.cardSide === 'back' && backElem) {
        await PdfExportService.exportSingleSidePdf(backElem, cardState.orientation, `${filename}_Back`);
        onShowToast('High-resolution CR80 Back PDF downloaded!', 'success');
      } else if (frontElem) {
        await PdfExportService.exportSingleSidePdf(frontElem, cardState.orientation, filename);
        onShowToast('High-resolution CR80 PDF downloaded!', 'success');
      }
    } catch (err: any) {
      console.error('PDF export error:', err);
      onShowToast('Failed to export PDF: ' + (err?.message || 'Unknown error'), 'error');
    } finally {
      setExportingPdf(false);
    }
  };

  const handleOpenPrintTab = () => {
    setPrintTarget(cardState);
    const base = import.meta.env.BASE_URL || '/';
    const printUrl = `${window.location.origin}${base}?view=print&autoprint=true`;
    window.open(printUrl, '_blank');
    onShowToast('Opened standalone print view in new tab', 'info');
  };

  const handlePrintNow = async () => {
    setPrintTarget(cardState);

    // If app is embedded in sandboxed iframe (AI Studio preview), window.print() is blocked.
    // Seamlessly open standalone tab where native browser print dialog works directly.
    const isInIframe = typeof window !== 'undefined' && window.self !== window.top;
    if (isInIframe) {
      handleOpenPrintTab();
      return;
    }

    onShowToast('Preparing print surface and dispatching...', 'info');
    onClose();
    setTimeout(() => {
      onTriggerBrowserPrint();
    }, 150);
  };

  const handleDownloadImage = async (format: 'png' | 'jpeg') => {
    try {
      const cardElem = document.getElementById(`print-modal-card-${activeSidePreview}`);
      if (!cardElem) return;
      const filename = `${cardState.details.fullName || 'Card'}_${activeSidePreview.toUpperCase()}`;
      await downloadCardImage(cardElem, format, filename);
      onShowToast(`Exported ${format.toUpperCase()} image`, 'success');
    } catch (err) {
      console.error('Image export failed:', err);
      onShowToast('Export failed', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="bg-[#FBF9F2] rounded-3xl border border-[#D4CEBA] shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col max-h-[95vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#D4CEBA] flex items-center justify-between bg-[#F4F0E4]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#2C4F3A] text-[#DFD9C4]">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-[#1D3527]">Print Preparation Studio</h3>
              <p className="text-xs text-[#59645C]">CR80 Direct PVC & A4 Sheet Printer Calibration</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-[#DFD9C4] text-[#1F2D24] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Preview Stage (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center bg-[#F4F0E4]/60 rounded-2xl border border-[#D4CEBA] p-6">
            {/* Side Tabs */}
            <div className="flex items-center gap-2 bg-[#DFD9C4] p-1 rounded-xl mb-5">
              <button
                onClick={() => setActiveSidePreview('front')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  activeSidePreview === 'front'
                    ? 'bg-[#2C4F3A] text-[#FBF9F2]'
                    : 'text-[#1F2D24] hover:bg-black/5'
                }`}
              >
                Front Side
              </button>
              <button
                onClick={() => setActiveSidePreview('back')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  activeSidePreview === 'back'
                    ? 'bg-[#2C4F3A] text-[#FBF9F2]'
                    : 'text-[#1F2D24] hover:bg-black/5'
                }`}
              >
                Back Side
              </button>
            </div>

            {/* Visual Card Display with calibrated offsets applied */}
            <div 
              className="p-3 bg-white rounded-3xl shadow-sm border border-[#D4CEBA] relative overflow-hidden transition-all"
              style={{
                transform: `translate(${calibration.offsetX}px, ${calibration.offsetY}px) scale(${calibration.scale / 100})`,
              }}
            >
              {/* Cutting guide simulation */}
              {showCutMarks && (
                <div className="absolute inset-0 pointer-events-none border border-dashed border-red-400 m-1 rounded-xl z-20">
                  <span className="absolute top-1 left-2 text-[8px] font-mono text-red-500 font-bold bg-white/80 px-1 rounded">
                    CR80 Crop Area (85.60 × 53.98 mm)
                  </span>
                </div>
              )}

              {/* Render Both in hidden/visible DOM to support instant PDF multi-page extraction */}
              <div style={{ display: activeSidePreview === 'front' ? 'block' : 'none' }}>
                <CardRenderer
                  id="print-modal-card-front"
                  cardState={cardState}
                  side="front"
                  scale={cardState.orientation === 'landscape' ? 0.95 : 0.85}
                  qrDataUrl={qrDataUrl}
                />
              </div>

              <div style={{ display: activeSidePreview === 'back' ? 'block' : 'none' }}>
                <CardRenderer
                  id="print-modal-card-back"
                  cardState={cardState}
                  side="back"
                  scale={cardState.orientation === 'landscape' ? 0.95 : 0.85}
                  qrDataUrl={qrDataUrl}
                />
              </div>
            </div>

            {/* Dimensions Badge */}
            <div className="mt-5 flex items-center gap-3 text-xs text-[#59645C]">
              <span className="font-mono font-bold text-[#1D3527]">
                {cardState.orientation === 'landscape' ? '85.60 mm × 53.98 mm' : '53.98 mm × 85.60 mm'}
              </span>
              <span>•</span>
              <span className="capitalize">{cardState.orientation} CR80 PVC</span>
            </div>

            {/* Quick image downloads */}
            <div className="mt-4 flex items-center gap-2">
              <button
                onClick={() => handleDownloadImage('png')}
                className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-white border border-[#D4CEBA] text-[#1D3527] hover:bg-[#DFD9C4] flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Save {activeSidePreview.toUpperCase()} PNG
              </button>
              <button
                onClick={handleDownloadPdf}
                disabled={exportingPdf}
                className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-white border border-[#D4CEBA] text-[#1D3527] hover:bg-[#DFD9C4] flex items-center gap-1.5 transition-colors"
              >
                <FileDown className="w-3.5 h-3.5" /> {exportingPdf ? 'Exporting...' : 'Export CR80 PDF'}
              </button>
            </div>
          </div>

          {/* Right Calibration Settings (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Print Mode */}
            <div className="p-4 rounded-2xl bg-[#F4F0E4] border border-[#D4CEBA] space-y-3">
              <span className="text-xs uppercase font-extrabold tracking-wider text-[#59645C] block">
                Target Print Format
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleCalibrationChange('printMode', 'cr80')}
                  className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-colors ${
                    calibration.printMode === 'cr80'
                      ? 'bg-[#2C4F3A] text-[#FBF9F2] border-[#1D3527]'
                      : 'bg-white text-[#1F2D24] border-[#D4CEBA]'
                  }`}
                >
                  <span className="text-xs font-extrabold">CR80 PVC Direct</span>
                  <span className="text-[10px] opacity-80">Evolis, Zebra, Fargo ID card printers</span>
                </button>

                <button
                  onClick={() => handleCalibrationChange('printMode', 'a4')}
                  className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-colors ${
                    calibration.printMode === 'a4'
                      ? 'bg-[#2C4F3A] text-[#FBF9F2] border-[#1D3527]'
                      : 'bg-white text-[#1F2D24] border-[#D4CEBA]'
                  }`}
                >
                  <span className="text-xs font-extrabold">A4 Paper Sheet</span>
                  <span className="text-[10px] opacity-80">8 cards/sheet with cut lines</span>
                </button>
              </div>

              {/* Side Selection */}
              <div>
                <span className="text-[11px] font-bold text-[#1F2D24] block mb-1">Card Sides to Print:</span>
                <div className="grid grid-cols-3 gap-1.5 text-xs font-semibold">
                  {(['front', 'back', 'both'] as CardSide[]).map((side) => (
                    <button
                      key={side}
                      onClick={() => handleCalibrationChange('cardSide', side)}
                      className={`py-1.5 rounded-lg border capitalize transition-colors ${
                        calibration.cardSide === side
                          ? 'bg-[#2C4F3A] text-[#FBF9F2] border-[#2C4F3A]'
                          : 'bg-white text-[#1F2D24] border-[#D4CEBA]'
                      }`}
                    >
                      {side}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Hardware Alignment Calibration */}
            <div className="p-4 rounded-2xl bg-[#F4F0E4] border border-[#D4CEBA] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-extrabold tracking-wider text-[#59645C] flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5" /> Alignment Offsets
                </span>
                <button
                  onClick={handleResetSettings}
                  className="text-[10px] text-[#2C4F3A] font-bold hover:underline"
                >
                  Reset
                </button>
              </div>

              {/* Horizontal Offset */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span>Horizontal Offset (X):</span>
                  <span className="font-mono text-[#2C4F3A] font-bold">{calibration.offsetX} mm</span>
                </div>
                <input
                  type="range"
                  min="-10"
                  max="10"
                  step="0.5"
                  value={calibration.offsetX}
                  onChange={(e) => handleCalibrationChange('offsetX', parseFloat(e.target.value))}
                  className="w-full accent-[#2C4F3A]"
                />
              </div>

              {/* Vertical Offset */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span>Vertical Offset (Y):</span>
                  <span className="font-mono text-[#2C4F3A] font-bold">{calibration.offsetY} mm</span>
                </div>
                <input
                  type="range"
                  min="-10"
                  max="10"
                  step="0.5"
                  value={calibration.offsetY}
                  onChange={(e) => handleCalibrationChange('offsetY', parseFloat(e.target.value))}
                  className="w-full accent-[#2C4F3A]"
                />
              </div>

              {/* Print Scale & Sizing Presets */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1.5">
                  <span>Card Print Size:</span>
                  <span className="font-mono text-[#2C4F3A] font-bold text-xs bg-[#DFD9C4] px-2 py-0.5 rounded">
                    {calibration.scale}% {calibration.scale >= 150 ? '(Jumbo)' : calibration.scale >= 125 ? '(Large)' : calibration.scale >= 90 ? '(Regular)' : '(Pocket)'}
                  </span>
                </div>

                {/* Quick size preset buttons */}
                <div className="grid grid-cols-4 gap-1.5 mb-2.5">
                  {[
                    { label: 'Pocket ID', val: 75, desc: '85.6mm' },
                    { label: 'Standard', val: 100, desc: '114mm' },
                    { label: 'Large Badge', val: 135, desc: '154mm' },
                    { label: 'Jumbo Display', val: 175, desc: '200mm' },
                  ].map((preset) => (
                    <button
                      key={preset.val}
                      type="button"
                      onClick={() => handleCalibrationChange('scale', preset.val)}
                      className={`px-1 py-1.5 rounded-xl border text-center transition-all cursor-pointer ${
                        calibration.scale === preset.val
                          ? 'bg-[#2C4F3A] text-white border-[#2C4F3A] font-extrabold shadow-sm'
                          : 'bg-white hover:bg-[#DFD9C4] text-[#1F2D24] border-[#D4CEBA] font-medium'
                      }`}
                    >
                      <div className="text-[10.5px] leading-tight">{preset.label}</div>
                      <div className="text-[9px] opacity-75">{preset.desc}</div>
                    </button>
                  ))}
                </div>

                <input
                  type="range"
                  min="60"
                  max="220"
                  step="5"
                  value={calibration.scale}
                  onChange={(e) => handleCalibrationChange('scale', parseFloat(e.target.value))}
                  className="w-full accent-[#2C4F3A]"
                />
                <div className="flex justify-between text-[9.5px] text-[#59645C] font-mono mt-1">
                  <span>60% (Compact)</span>
                  <span>100% (Standard)</span>
                  <span>135% (Large Badge)</span>
                  <span>220% (Full Page)</span>
                </div>
              </div>

              {/* Cutting guide checkbox */}
              <div className="pt-1 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="chk-cutmarks"
                  checked={showCutMarks}
                  onChange={(e) => setShowCutMarks(e.target.checked)}
                  className="rounded text-[#2C4F3A] focus:ring-[#2C4F3A]"
                />
                <label htmlFor="chk-cutmarks" className="text-xs font-medium text-[#1F2D24] cursor-pointer">
                  Show crop & boundary guide lines
                </label>
              </div>
            </div>

            {/* Copies */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-[#D4CEBA]">
              <span className="text-xs font-bold text-[#1F2D24]">Number of Copies:</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={calibration.copies}
                  onChange={(e) => handleCalibrationChange('copies', Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-16 px-2 py-1 border border-[#D4CEBA] rounded-lg text-center font-bold text-xs"
                />
              </div>
            </div>

            <button
              onClick={handleSaveSettings}
              className="w-full py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-[#2C4F3A] bg-[#DFD9C4] hover:bg-[#D4CEBA] border border-[#D4CEBA] transition-colors"
            >
              Save Calibration as Default
            </button>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 bg-[#F4F0E4] border-t border-[#D4CEBA] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-[#59645C] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
            <span>Ready for browser print dialog (Ctrl+P / Cmd+P)</span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={handleOpenPrintTab}
              className="flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold uppercase tracking-wider text-[#2C4F3A] bg-white hover:bg-[#DFD9C4] border border-[#D4CEBA] rounded-xl transition-all shadow-sm cursor-pointer"
              title="Opens a clean full-screen tab outside the iframe preview"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open in New Tab
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={exportingPdf}
              className="flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold uppercase tracking-wider text-[#1D3527] bg-[#E9E4D4] hover:bg-[#DFD9C4] border border-[#D4CEBA] rounded-xl transition-all cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              {exportingPdf ? 'Saving...' : 'PDF'}
            </button>
            <button
              id="btn-trigger-browser-print"
              onClick={handlePrintNow}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-[#FBF9F2] bg-[#2C4F3A] hover:bg-[#1D3527] rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Print ID Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
