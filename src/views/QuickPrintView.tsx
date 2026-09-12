import React, { useState, useEffect } from 'react';
import { 
  Printer, 
  Sparkles, 
  Upload, 
  Camera, 
  CreditCard, 
  Check, 
  RefreshCw,
  Sliders,
  FileSpreadsheet,
  ExternalLink,
  Save
} from 'lucide-react';
import { CardState, PrintCalibration } from '../types';
import { TEMPLATES, getTemplateCardState } from '../data/templates';
import { CardRenderer } from '../components/CardRenderer';
import { getRandomId } from '../utils/idGenerator';
import { optimizeImage } from '../utils/imageOptimizer';
import { printCardDirectly } from '../utils/printEngine';
import { downloadSingleCardPdf, downloadA4SheetPdf } from '../utils/pdfExport';
import { generateCardQrCode } from '../utils/qrGenerator';
import { saveCurrentDraft, saveDesign, setPrintTarget } from '../utils/storage';

interface QuickPrintViewProps {
  onTriggerBrowserPrint: (cardState: CardState, calibration: PrintCalibration) => void;
  onOpenEditor: (cardState: CardState) => void;
  onOpenCsvModal: () => void;
  onOpenAiAssistant: () => void;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const QuickPrintView: React.FC<QuickPrintViewProps> = ({
  onTriggerBrowserPrint,
  onOpenEditor,
  onOpenCsvModal,
  onOpenAiAssistant,
  onShowToast,
}) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState(TEMPLATES[0].id);
  const currentTemplate = TEMPLATES.find((t) => t.id === selectedTemplateId) || TEMPLATES[0];

  const [fullName, setFullName] = useState('Alexander Wright');
  const [designation, setDesignation] = useState('Senior Security Architect');
  const [department, setDepartment] = useState('Information Security');
  const [orgName, setOrgName] = useState('Nexus Enterprise Corp');
  const [uniqueId, setUniqueId] = useState(getRandomId('SEC'));
  const [photoUrl, setPhotoUrl] = useState(
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80'
  );

  const [printMode, setPrintMode] = useState<'cr80' | 'a4'>('cr80');
  const [printScale, setPrintScale] = useState<number>(135);
  const [copies, setCopies] = useState(1);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  // Construct quick card state
  const baseCard = getTemplateCardState(currentTemplate);
  const quickCardState: CardState = {
    ...baseCard,
    details: {
      ...baseCard.details,
      fullName,
      designation,
      department,
      uniqueId,
    },
    header: {
      ...baseCard.header,
      orgName,
    },
    photoUrl,
  };

  // Generate real interactive QR code for preview
  useEffect(() => {
    generateCardQrCode(
      {
        name: fullName,
        id: uniqueId,
        department,
        org: orgName,
      },
      180,
      quickCardState
    ).then((url) => setQrDataUrl(url));
  }, [fullName, uniqueId, department, orgName, currentTemplate, photoUrl]);

  const handleOpenStandalonePrint = () => {
    setPrintTarget(quickCardState);
    const printUrl = `${window.location.origin}/?view=print&autoprint=true`;
    window.open(printUrl, '_blank');
    onShowToast('Opened standalone print view in new tab', 'info');
  };

  const handleSaveToMyDesigns = () => {
    const res = saveDesign(quickCardState);
    if (res.success) {
      onShowToast(`Card "${res.card.name}" saved to My Designs!`, 'success');
    } else {
      onShowToast(res.error || 'Saved to current session', 'info');
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onShowToast('Optimizing photo...', 'info');
      try {
        const optimized = await optimizeImage(file, { maxWidth: 500, maxHeight: 650, quality: 0.88, format: 'image/jpeg' });
        setPhotoUrl(optimized);
        onShowToast('Photo updated for Quick Print', 'success');
      } catch (err) {
        console.error('Photo error:', err);
        onShowToast('Failed to optimize photo', 'error');
      }
    }
  };

  const handleRegenerateId = () => {
    setUniqueId(getRandomId('ID'));
    onShowToast('New unique ID generated', 'info');
  };

  const handleQuickPrint = async () => {
    const cal: PrintCalibration = {
      offsetX: 0,
      offsetY: 0,
      scale: printScale,
      a4CardsPerPage: 8,
      a4Spacing: 6,
      a4Margin: 10,
      printMode,
      cardSide: 'front',
      copies,
    };

    onShowToast('Opening print dispatch...', 'info');
    const frontElem = document.getElementById('quick-print-card-front');

    const isInIframe = typeof window !== 'undefined' && window.self !== window.top;
    if (isInIframe) {
      handleOpenStandalonePrint();
      return;
    }

    onShowToast('Opening browser print dialog...', 'info');
    onTriggerBrowserPrint(quickCardState, cal);
  };

  const handleDownloadPdf = async () => {
    const frontElem = document.getElementById('quick-print-card-front');
    if (!frontElem) return;

    onShowToast('Generating high-resolution PDF...', 'info');
    const filename = `${quickCardState.details.fullName || 'Card'}_${quickCardState.details.uniqueId}`;

    try {
      if (printMode === 'a4') {
        await downloadA4SheetPdf(frontElem, copies, `${filename}_A4_Sheet`);
        onShowToast('A4 Sheet PDF downloaded!', 'success');
      } else {
        await downloadSingleCardPdf(frontElem, quickCardState.orientation, filename);
        onShowToast('CR80 Card PDF downloaded!', 'success');
      }
    } catch (err) {
      console.error('PDF error:', err);
      onShowToast('Failed to export PDF', 'error');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="bg-[#F4F0E4] p-6 sm:p-8 rounded-3xl border border-[#D4CEBA] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-extrabold tracking-wider px-2.5 py-0.5 rounded-full bg-[#2C4F3A] text-[#FBF9F2]">
              Instant Workflow
            </span>
            <span className="text-xs text-[#59645C] font-semibold">Zero configuration needed</span>
          </div>
          <h1 className="text-3xl font-extrabold text-[#1D3527] tracking-tight">
            Quick Print Studio
          </h1>
          <p className="text-xs sm:text-sm text-[#59645C]">
            Fill essential information, pick a pre-tested template, and print immediately to your hardware card printer.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenCsvModal}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white border border-[#D4CEBA] text-[#1D3527] font-bold text-xs hover:bg-[#DFD9C4] transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#2C4F3A]" />
            CSV Import
          </button>
          <button
            onClick={onOpenAiAssistant}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#2C4F3A] text-[#FBF9F2] font-bold text-xs uppercase tracking-wider hover:bg-[#1D3527] transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#DFD9C4]" />
            AI Ideas
          </button>
        </div>
      </div>

      {/* Main Grid: Left Form (5 Cols), Right Card Preview (7 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Form */}
        <div className="lg:col-span-6 space-y-5 bg-[#FBF9F2] p-6 rounded-3xl border border-[#D4CEBA]">
          <h3 className="font-extrabold text-base text-[#1D3527] flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-[#2C4F3A]" />
            1. Select Template
          </h3>

          <div className="grid grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1">
            {TEMPLATES.slice(0, 10).map((tpl) => (
              <button
                key={tpl.id}
                onClick={() => setSelectedTemplateId(tpl.id)}
                className={`p-2.5 rounded-xl border text-left text-xs font-semibold transition-all truncate ${
                  selectedTemplateId === tpl.id
                    ? 'bg-[#2C4F3A] text-[#FBF9F2] border-[#2C4F3A]'
                    : 'bg-white text-[#1F2D24] border-[#D4CEBA] hover:bg-[#F4F0E4]'
                }`}
              >
                <div className="font-bold truncate">{tpl.name}</div>
                <div className="text-[10px] opacity-75 capitalize">{tpl.category}</div>
              </button>
            ))}
          </div>

          <h3 className="font-extrabold text-base text-[#1D3527] pt-2 flex items-center gap-2 border-t border-[#D4CEBA]">
            <span className="w-5 h-5 rounded-full bg-[#2C4F3A] text-[#FBF9F2] text-[11px] flex items-center justify-center font-bold">2</span>
            Essential Information
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-bold text-[#59645C] uppercase tracking-wider mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#D4CEBA] bg-white font-semibold text-sm focus:ring-2 focus:ring-[#2C4F3A] focus:outline-hidden"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-[#59645C] uppercase tracking-wider mb-1">
                  Designation / Role
                </label>
                <input
                  type="text"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D4CEBA] bg-white text-xs font-semibold"
                />
              </div>
              <div>
                <label className="block font-bold text-[#59645C] uppercase tracking-wider mb-1">
                  Department
                </label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D4CEBA] bg-white text-xs font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-[#59645C] uppercase tracking-wider mb-1">
                Organization / Institution Name
              </label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#D4CEBA] bg-white text-xs font-semibold"
              />
            </div>

            <div>
              <label className="block font-bold text-[#59645C] uppercase tracking-wider mb-1">
                Unique Credential ID
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={uniqueId}
                  onChange={(e) => setUniqueId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D4CEBA] bg-white font-mono text-xs font-bold text-[#2C4F3A]"
                />
                <button
                  onClick={handleRegenerateId}
                  className="p-2 rounded-xl bg-[#DFD9C4] hover:bg-[#D4CEBA] text-[#1D3527] transition-colors"
                  title="Generate new ID"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Photo Upload */}
            <div>
              <label className="block font-bold text-[#59645C] uppercase tracking-wider mb-1">
                Cardholder Photo
              </label>
              <div className="flex items-center gap-3">
                <div className="w-12 h-14 rounded-lg overflow-hidden border border-[#D4CEBA] bg-stone-100 flex-shrink-0">
                  <img src={photoUrl} alt="Preview" className="w-full h-full object-cover" />
                </div>
                <label className="flex-1 px-3 py-2 rounded-xl border border-dashed border-[#2C4F3A] bg-[#F4F0E4] hover:bg-[#DFD9C4] cursor-pointer text-center font-semibold text-xs text-[#1D3527] transition-colors">
                  <Upload className="w-3.5 h-3.5 inline mr-1 text-[#2C4F3A]" />
                  Upload Portrait File
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Print Target Setup */}
          <div className="pt-2 border-t border-[#D4CEBA] space-y-3">
            <h3 className="font-extrabold text-base text-[#1D3527] flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#2C4F3A] text-[#FBF9F2] text-[11px] flex items-center justify-center font-bold">3</span>
              Printer Format
            </h3>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => setPrintMode('cr80')}
                className={`p-2.5 rounded-xl border text-left font-semibold ${
                  printMode === 'cr80'
                    ? 'bg-[#2C4F3A] text-[#FBF9F2] border-[#2C4F3A]'
                    : 'bg-white text-[#1F2D24] border-[#D4CEBA]'
                }`}
              >
                CR80 PVC Direct
              </button>
              <button
                onClick={() => setPrintMode('a4')}
                className={`p-2.5 rounded-xl border text-left font-semibold ${
                  printMode === 'a4'
                    ? 'bg-[#2C4F3A] text-[#FBF9F2] border-[#2C4F3A]'
                    : 'bg-white text-[#1F2D24] border-[#D4CEBA]'
                }`}
              >
                A4 Paper Sheet
              </button>
            </div>

            {/* Print Scale / Size Options */}
            <div>
              <span className="text-[11px] font-bold text-[#1F2D24] block mb-1">
                Print Card Size:
              </span>
              <div className="grid grid-cols-4 gap-1.5 text-xs">
                {[
                  { label: 'Pocket ID', val: 75, desc: '85.6mm' },
                  { label: 'Standard', val: 100, desc: '114mm' },
                  { label: 'Large Badge', val: 135, desc: '154mm' },
                  { label: 'Jumbo', val: 175, desc: '200mm' },
                ].map((preset) => (
                  <button
                    key={preset.val}
                    type="button"
                    onClick={() => setPrintScale(preset.val)}
                    className={`py-1.5 px-1 rounded-xl border text-center transition-all cursor-pointer ${
                      printScale === preset.val
                        ? 'bg-[#2C4F3A] text-white border-[#2C4F3A] font-extrabold shadow-xs'
                        : 'bg-white hover:bg-[#DFD9C4] text-[#1F2D24] border-[#D4CEBA] font-medium'
                    }`}
                  >
                    <div className="text-[10px] leading-tight">{preset.label}</div>
                    <div className="text-[8.5px] opacity-75">{preset.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Preview & Instant Print Button */}
        <div className="lg:col-span-6 space-y-6 flex flex-col items-center">
          <div className="w-full bg-[#F4F0E4] p-8 rounded-3xl border border-[#D4CEBA] shadow-sm flex flex-col items-center">
            <div className="w-full flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-[#52745D]">
                Real-Time Print Preview
              </span>
              <button
                onClick={() => onOpenEditor(quickCardState)}
                className="text-xs font-bold text-[#2C4F3A] hover:underline"
              >
                Open in Full Visual Editor →
              </button>
            </div>

            {/* Card Preview Frame */}
            <div className="p-3 bg-white rounded-3xl border border-[#D4CEBA] shadow-md">
              <CardRenderer
                id="quick-print-card-front"
                cardState={quickCardState}
                side="front"
                scale={quickCardState.orientation === 'landscape' ? 0.95 : 0.85}
                qrDataUrl={qrDataUrl}
              />
            </div>

            <div className="mt-5 text-center text-xs text-[#59645C] space-y-1">
              <p className="font-mono font-bold text-[#1D3527]">
                Format: {currentTemplate.orientation.toUpperCase()} ISO CR80 (85.60 × 53.98 mm)
              </p>
              <p>Direct PVC or A4 Sheet print layout</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="w-full space-y-3">
            <button
              id="btn-quick-print-instant"
              onClick={handleQuickPrint}
              className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-extrabold text-base uppercase tracking-wider text-[#FBF9F2] bg-[#2C4F3A] hover:bg-[#1D3527] shadow-lg hover:shadow-xl transition-all active:scale-98 cursor-pointer"
            >
              <Printer className="w-5 h-5 stroke-[2.5]" />
              Print Card Instantly
            </button>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleOpenStandalonePrint}
                className="flex items-center justify-center gap-2 py-3 px-3 rounded-2xl font-bold text-xs uppercase tracking-wider text-[#1D3527] bg-white hover:bg-[#DFD9C4] border border-[#D4CEBA] transition-all active:scale-98 cursor-pointer shadow-sm"
              >
                <ExternalLink className="w-4 h-4 text-[#2C4F3A]" />
                Open Print Tab
              </button>

              <button
                id="btn-quick-download-pdf"
                onClick={handleDownloadPdf}
                className="flex items-center justify-center gap-2 py-3 px-3 rounded-2xl font-bold text-xs uppercase tracking-wider text-[#2C4F3A] bg-[#E9E4D4] hover:bg-[#DFD9C4] border border-[#D4CEBA] transition-all active:scale-98 cursor-pointer"
              >
                Download PDF
              </button>
            </div>

            <button
              type="button"
              id="btn-quick-save-design"
              onClick={handleSaveToMyDesigns}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl font-bold text-xs uppercase tracking-wider text-[#1D3527] bg-[#DFD9C4]/80 hover:bg-[#DFD9C4] border border-[#D4CEBA] transition-all active:scale-98 cursor-pointer shadow-xs"
            >
              <Save className="w-4 h-4 text-[#2C4F3A]" />
              Save to My Designs
            </button>

            <p className="text-center text-[11px] text-[#59645C]">
              Physical CR80 PVC dimensions (85.60 × 53.98 mm) with bleed & hardware alignment.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
