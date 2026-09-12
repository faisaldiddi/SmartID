import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  RotateCw, 
  FlipHorizontal, 
  Save, 
  Printer, 
  Download, 
  Sparkles, 
  Camera, 
  FileSpreadsheet, 
  RefreshCw, 
  Sliders, 
  Type, 
  Palette, 
  Image as ImageIcon, 
  QrCode, 
  Layers, 
  Eye, 
  Plus, 
  Trash2, 
  FileDown, 
  Check, 
  ChevronDown,
  Layout,
  Maximize2
} from 'lucide-react';
import { 
  CardState, 
  CardSide, 
  Orientation, 
  PatternType, 
  ColorScheme, 
  CustomField,
  PrintCalibration
} from '../types';
import { TEMPLATES } from '../data/templates';
import { CardRenderer } from '../components/CardRenderer';
import { generateFormattedId, getRandomId, IdGeneratorConfig } from '../utils/idGenerator';
import { generateCardQrCode } from '../utils/qrGenerator';
import { buildQrVerificationUrl, isLocalhostWithoutPublicUrl, getSmartIdBaseUrl } from '../utils/VerificationPayloadService';
import { saveDesign } from '../utils/storage';
import { optimizeImage } from '../utils/imageOptimizer';
import { PdfExportService } from '../utils/PdfExportService';
import { ImageExportService } from '../utils/ImageExportService';

interface EditorViewProps {
  cardState: CardState;
  onUpdateCardState: (updater: (prev: CardState) => CardState) => void;
  onOpenPrintModal: () => void;
  onOpenAiAssistant: () => void;
  onOpenCameraModal: () => void;
  onOpenCsvModal: () => void;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
  onSavedDesignsChange: () => void;
}

type EditorTab = 'details' | 'colors' | 'photo' | 'header' | 'qr' | 'templates';

export const EditorView: React.FC<EditorViewProps> = ({
  cardState,
  onUpdateCardState,
  onOpenPrintModal,
  onOpenAiAssistant,
  onOpenCameraModal,
  onOpenCsvModal,
  onShowToast,
  onSavedDesignsChange,
}) => {
  const [activeTab, setActiveTab] = useState<EditorTab>('details');
  const [activeSide, setActiveSide] = useState<CardSide>('front');
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [downloadDropdownOpen, setDownloadDropdownOpen] = useState(false);
  const [isSavedFeedback, setIsSavedFeedback] = useState(false);

  // ID generator helper state
  const [idConfig, setIdConfig] = useState<IdGeneratorConfig>({
    prefix: 'EMP',
    includeYear: true,
    year: new Date().getFullYear().toString(),
    separator: '-',
    numberLength: 4,
    sequenceNumber: 1042,
  });

  // Re-generate interactive QR Code and publish credential whenever cardState changes
  useEffect(() => {
    let isMounted = true;
    const timer = setTimeout(async () => {
      if (!cardState.qr.enabled) {
        if (isMounted) setQrDataUrl('');
        return;
      }

      const payload = {
        org: cardState.header.orgName,
        name: cardState.qr.includeName ? cardState.details.fullName : undefined,
        id: cardState.qr.includeId ? cardState.details.uniqueId : undefined,
        department: cardState.qr.includeDepartment ? cardState.details.department : undefined,
        customText: cardState.qr.customText || undefined,
      };

      const url = await generateCardQrCode(payload, 180, cardState);
      if (isMounted) {
        setQrDataUrl(url);
      }
    }, 250);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [cardState]);

  // Handle updates to card details
  const updateDetails = (field: keyof CardState['details'], value: any) => {
    onUpdateCardState((prev) => ({
      ...prev,
      details: {
        ...prev.details,
        [field]: value,
      },
    }));
  };

  // Toggle orientation
  const handleToggleOrientation = () => {
    const newOri: Orientation = cardState.orientation === 'landscape' ? 'portrait' : 'landscape';
    onUpdateCardState((prev) => ({
      ...prev,
      orientation: newOri,
    }));
    onShowToast(`Orientation switched to ${newOri}`, 'info');
  };

  // Switch template
  const handleSelectTemplate = (templateId: string) => {
    const tpl = TEMPLATES.find((t) => t.id === templateId);
    if (!tpl) return;

    onUpdateCardState((prev) => ({
      ...prev,
      templateId: tpl.id,
      orientation: tpl.orientation,
      colors: { ...tpl.colors },
      pattern: tpl.pattern,
      fontFamily: tpl.fontFamily,
      header: {
        ...prev.header,
        bgColor: tpl.colors.headerBg,
      },
      footer: {
        ...prev.footer,
        bgColor: tpl.colors.footerBg,
      },
    }));
    onShowToast(`Applied "${tpl.name}" template`, 'success');
  };

  // Save Dialog state
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [cardSaveTitle, setCardSaveTitle] = useState('');

  // Photo upload with instant auto-compression
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onShowToast('Optimizing photo...', 'info');
      try {
        const optimized = await optimizeImage(file, { maxWidth: 500, maxHeight: 650, quality: 0.88, format: 'image/jpeg' });
        onUpdateCardState((prev) => ({ ...prev, photoUrl: optimized }));
        onShowToast('Cardholder photo updated & optimized', 'success');
      } catch (err) {
        console.error('Photo optimization error:', err);
        onShowToast('Could not optimize photo', 'error');
      }
    }
  };

  // Primary Logo upload with compression
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const optimized = await optimizeImage(file, { maxWidth: 400, maxHeight: 200, format: 'image/png' });
        onUpdateCardState((prev) => ({
          ...prev,
          primaryLogo: { ...prev.primaryLogo, url: optimized },
          header: { ...prev.header, showLogo: true },
        }));
        onShowToast('Organization logo updated', 'success');
      } catch (err) {
        console.error('Logo upload error:', err);
      }
    }
  };

  // Signature upload with compression
  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const optimized = await optimizeImage(file, { maxWidth: 350, maxHeight: 150, format: 'image/png' });
        onUpdateCardState((prev) => ({
          ...prev,
          signature: { ...prev.signature, url: optimized },
          footer: { ...prev.footer, showSignature: true },
        }));
        onShowToast('Signature file uploaded', 'success');
      } catch (err) {
        console.error('Signature upload error:', err);
      }
    }
  };

  // Generate unique formatted ID
  const handleGenerateId = () => {
    const newId = generateFormattedId(idConfig);
    updateDetails('uniqueId', newId);
    setIdConfig((prev) => ({ ...prev, sequenceNumber: prev.sequenceNumber + 1 }));
    onShowToast(`Generated ID: ${newId}`, 'success');
  };

  // Quick 1-click Save to My Designs
  const handleQuickSave = () => {
    const defaultName = cardState.details.fullName 
      ? `${cardState.details.fullName} (${cardState.details.uniqueId || 'ID'})` 
      : 'Untitled ID Card';
    const res = saveDesign(cardState, cardSaveTitle || defaultName);
    onSavedDesignsChange();
    setIsSavedFeedback(true);
    setTimeout(() => setIsSavedFeedback(false), 2000);
    if (res.error) {
      onShowToast(res.error, 'info');
    } else {
      onShowToast(`Saved "${res.card.name}" to My Designs!`, 'success');
    }
  };

  // Open Save Modal (for custom title)
  const handleOpenSaveModal = () => {
    const defaultName = cardState.details.fullName 
      ? `${cardState.details.fullName} (${cardState.details.uniqueId || 'ID'})` 
      : 'Untitled ID Card';
    setCardSaveTitle(defaultName);
    setSaveModalOpen(true);
  };

  // Confirm Save to My Designs
  const handleConfirmSave = () => {
    const res = saveDesign(cardState, cardSaveTitle);
    onSavedDesignsChange();
    setSaveModalOpen(false);
    if (res.error) {
      onShowToast(res.error, 'info');
    } else {
      onShowToast(`Card "${res.card.name}" saved to My Designs!`, 'success');
    }
  };

  // Download utilities
  const handleDownload = async (format: 'png' | 'jpeg' | 'pdf_single' | 'pdf_both') => {
    setDownloadDropdownOpen(false);
    const frontElem = document.getElementById('main-editor-card-front');
    const backElem = document.getElementById('main-editor-card-back');
    const filename = `${cardState.details.fullName || 'SmartID'}_${cardState.details.uniqueId}`;

    try {
      if (format === 'png' || format === 'jpeg') {
        const target = activeSide === 'front' ? frontElem : backElem;
        if (target) {
          await ImageExportService.exportCardImage(target, format, filename);
          onShowToast(`Downloaded ${format.toUpperCase()}`, 'success');
        }
      } else if (format === 'pdf_single') {
        if (frontElem) {
          await PdfExportService.exportSingleSidePdf(frontElem, cardState.orientation, filename);
          onShowToast('Downloaded Single CR80 PDF', 'success');
        }
      } else if (format === 'pdf_both') {
        if (frontElem && backElem) {
          await PdfExportService.exportFrontBackPdf(frontElem, backElem, cardState.orientation, filename);
          onShowToast('Downloaded Front & Back CR80 PDF', 'success');
        }
      }
    } catch (err) {
      console.error('Download error:', err);
      onShowToast('Export failed', 'error');
    }
  };

  // Preset Color Palettes
  const colorPresets: { name: string; colors: ColorScheme }[] = [
    {
      name: 'Forest Emerald',
      colors: {
        primary: '#2C4F3A',
        secondary: '#52745D',
        accent: '#DFD9C4',
        background: '#FBF9F2',
        textDark: '#1D3527',
        textLight: '#FBF9F2',
        headerBg: '#2C4F3A',
        footerBg: '#DFD9C4',
      },
    },
    {
      name: 'Navy Executive',
      colors: {
        primary: '#0F172A',
        secondary: '#2563EB',
        accent: '#60A5FA',
        background: '#FFFFFF',
        textDark: '#0F172A',
        textLight: '#FFFFFF',
        headerBg: '#0F172A',
        footerBg: '#F1F5F9',
      },
    },
    {
      name: 'Crimson Sovereign',
      colors: {
        primary: '#881337',
        secondary: '#BE123C',
        accent: '#FDE047',
        background: '#FFF1F2',
        textDark: '#4C0519',
        textLight: '#FFFFFF',
        headerBg: '#881337',
        footerBg: '#FFE4E6',
      },
    },
    {
      name: 'Obsidian Cyber',
      colors: {
        primary: '#18181B',
        secondary: '#06B6D4',
        accent: '#22D3EE',
        background: '#FAFAFA',
        textDark: '#09090B',
        textLight: '#FFFFFF',
        headerBg: '#18181B',
        footerBg: '#F4F4F5',
      },
    },
    {
      name: 'Champagne Luxury',
      colors: {
        primary: '#44403C',
        secondary: '#B45309',
        accent: '#FCD34D',
        background: '#FAF8F5',
        textDark: '#292524',
        textLight: '#FFFFFF',
        headerBg: '#44403C',
        footerBg: '#F5EBE1',
      },
    },
  ];

  // Font options
  const fontOptions = [
    'Plus Jakarta Sans',
    'Outfit',
    'Playfair Display',
    'Space Mono',
    'Inter',
  ];

  return (
    <div className="flex flex-col min-h-[calc(100vh-5rem)]">
      {/* Top Editor Toolbar */}
      <div className="bg-[#F4F0E4] border-b border-[#D4CEBA] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 sticky top-20 z-30 shadow-xs">
        {/* Left Toolbar Controls */}
        <div className="flex items-center gap-2">
          {/* Flip Side Button */}
          <button
            id="btn-flip-card-side"
            onClick={() => setActiveSide((prev) => (prev === 'front' ? 'back' : 'front'))}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#D4CEBA] text-[#1D3527] font-bold text-xs hover:bg-[#DFD9C4] transition-colors shadow-xs"
          >
            <RotateCw className="w-3.5 h-3.5 text-[#2C4F3A]" />
            Side: <span className="uppercase text-[#2C4F3A]">{activeSide}</span>
          </button>

          {/* Orientation Toggle */}
          <button
            id="btn-toggle-orientation"
            onClick={handleToggleOrientation}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#D4CEBA] text-[#1D3527] font-bold text-xs hover:bg-[#DFD9C4] transition-colors shadow-xs"
          >
            <Layout className="w-3.5 h-3.5 text-[#2C4F3A]" />
            <span className="capitalize">{cardState.orientation}</span>
          </button>

          {/* Zoom Slider */}
          <div className="hidden sm:flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-[#D4CEBA] text-xs font-semibold">
            <span className="text-stone-400 text-[10px]">Scale:</span>
            <input
              type="range"
              min="80"
              max="130"
              value={zoomLevel}
              onChange={(e) => setZoomLevel(parseInt(e.target.value))}
              className="w-16 accent-[#2C4F3A]"
            />
            <span className="font-mono text-[11px] text-[#2C4F3A] w-7">{zoomLevel}%</span>
          </div>
        </div>

        {/* Center Quick Tools */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenCameraModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#D4CEBA] text-[#1D3527] font-bold text-xs hover:bg-[#DFD9C4] transition-colors"
            title="Capture photo using webcam"
          >
            <Camera className="w-3.5 h-3.5 text-[#2C4F3A]" />
            <span className="hidden md:inline">Camera</span>
          </button>

          <button
            onClick={onOpenCsvModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#D4CEBA] text-[#1D3527] font-bold text-xs hover:bg-[#DFD9C4] transition-colors"
            title="Import names and IDs from CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#2C4F3A]" />
            <span className="hidden md:inline">CSV Import</span>
          </button>

          <button
            onClick={onOpenAiAssistant}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#DFD9C4]/70 border border-[#D4CEBA] text-[#2C4F3A] font-bold text-xs hover:bg-[#DFD9C4] transition-colors"
            title="Search unique designs with Gemini"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">AI Styles</span>
          </button>
        </div>

        {/* Right Output Actions */}
        <div className="flex items-center gap-2">
          {/* Save Button Group */}
          <div className="flex items-center">
            <button
              id="btn-save-design-editor"
              onClick={handleQuickSave}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-l-xl border text-xs font-bold transition-all shadow-xs ${
                isSavedFeedback
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-400'
                  : 'bg-white border-[#D4CEBA] text-[#1D3527] hover:bg-[#DFD9C4]'
              }`}
              title="Save to My Designs"
            >
              {isSavedFeedback ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Saved!</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5 text-[#2C4F3A]" />
                  <span>Save</span>
                </>
              )}
            </button>
            <button
              onClick={handleOpenSaveModal}
              className="px-2 py-1.5 rounded-r-xl bg-white border-y border-r border-[#D4CEBA] text-[#1D3527] hover:bg-[#DFD9C4] transition-colors text-xs"
              title="Save As (Custom title)"
            >
              <ChevronDown className="w-3 h-3" />
            </button>
          </div>

          {/* Download Dropdown */}
          <div className="relative">
            <button
              onClick={() => setDownloadDropdownOpen(!downloadDropdownOpen)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white border border-[#D4CEBA] text-[#1D3527] font-bold text-xs hover:bg-[#DFD9C4] transition-colors shadow-xs"
            >
              <Download className="w-3.5 h-3.5 text-[#2C4F3A]" />
              <span>Export</span>
              <ChevronDown className="w-3 h-3" />
            </button>

            {downloadDropdownOpen && (
              <div className="absolute right-0 mt-1.5 w-48 bg-[#FBF9F2] rounded-2xl border border-[#D4CEBA] shadow-xl p-1.5 z-50 text-xs font-semibold space-y-1">
                <button
                  onClick={() => handleDownload('png')}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#DFD9C4] text-[#1D3527] flex items-center gap-2"
                >
                  <Download className="w-3.5 h-3.5 text-stone-500" />
                  PNG Image ({activeSide.toUpperCase()})
                </button>
                <button
                  onClick={() => handleDownload('jpeg')}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#DFD9C4] text-[#1D3527] flex items-center gap-2"
                >
                  <Download className="w-3.5 h-3.5 text-stone-500" />
                  JPG Image ({activeSide.toUpperCase()})
                </button>
                <div className="border-t border-[#D4CEBA] my-1" />
                <button
                  onClick={() => handleDownload('pdf_single')}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#DFD9C4] text-[#1D3527] flex items-center gap-2"
                >
                  <FileDown className="w-3.5 h-3.5 text-red-600" />
                  CR80 PDF (Front Only)
                </button>
                <button
                  onClick={() => handleDownload('pdf_both')}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#DFD9C4] text-[#1D3527] flex items-center gap-2"
                >
                  <FileDown className="w-3.5 h-3.5 text-red-600" />
                  CR80 PDF (Front + Back)
                </button>
              </div>
            )}
          </div>

          {/* Master Print Button */}
          <button
            id="btn-print-modal-trigger"
            onClick={onOpenPrintModal}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#2C4F3A] hover:bg-[#1D3527] text-[#FBF9F2] font-bold text-xs uppercase tracking-wider shadow-sm transition-all active:scale-95"
          >
            <Printer className="w-4 h-4" />
            Print ID
          </button>
        </div>
      </div>

      {/* Main Workspace Layout: Left Sidebar + Center Stage */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Sidebar Customization Tabs (440px wide on desktop) */}
        <aside className="w-full lg:w-[460px] bg-[#FBF9F2] border-r border-[#D4CEBA] flex flex-col flex-shrink-0">
          {/* Tabs Nav Header */}
          <div className="flex items-center border-b border-[#D4CEBA] bg-[#F4F0E4] overflow-x-auto no-scrollbar px-2 pt-2">
            {[
              { id: 'details' as EditorTab, label: 'Details', icon: Type },
              { id: 'colors' as EditorTab, label: 'Design', icon: Palette },
              { id: 'photo' as EditorTab, label: 'Photos', icon: ImageIcon },
              { id: 'header' as EditorTab, label: 'Header', icon: Layout },
              { id: 'qr' as EditorTab, label: 'QR Code', icon: QrCode },
              { id: 'templates' as EditorTab, label: 'Templates', icon: Layers },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold whitespace-nowrap rounded-t-xl transition-colors border-t border-l border-r ${
                    isActive
                      ? 'bg-[#FBF9F2] text-[#1D3527] border-[#D4CEBA]'
                      : 'border-transparent text-[#59645C] hover:text-[#1D3527] hover:bg-[#DFD9C4]/40'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#2C4F3A]' : 'text-stone-400'}`} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Sidebar Tab Content Area */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6 max-h-[calc(100vh-10rem)]">
            {/* TAB 1: DETAILS */}
            {activeTab === 'details' && (
              <div className="space-y-4">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-[#59645C] mb-1">
                    Cardholder Full Name
                  </label>
                  <input
                    type="text"
                    value={cardState.details.fullName}
                    onChange={(e) => updateDetails('fullName', e.target.value)}
                    placeholder="e.g. Eleanor Vance"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#D4CEBA] bg-white font-bold text-sm text-[#1D3527] focus:ring-2 focus:ring-[#2C4F3A] focus:outline-hidden"
                  />
                </div>

                {/* Unique ID & Generator */}
                <div className="p-3.5 rounded-2xl bg-[#F4F0E4] border border-[#D4CEBA] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-extrabold uppercase tracking-wider text-[#59645C]">
                      Unique Card ID
                    </label>
                    <button
                      onClick={handleGenerateId}
                      className="text-[11px] font-bold text-[#2C4F3A] hover:underline flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" /> Auto-Generate
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={cardState.details.uniqueId}
                      onChange={(e) => updateDetails('uniqueId', e.target.value)}
                      className="flex-1 px-3 py-2 rounded-xl border border-[#D4CEBA] bg-white font-mono font-bold text-xs text-[#2C4F3A]"
                    />
                  </div>

                  {/* ID Format Config */}
                  <div className="grid grid-cols-3 gap-2 text-[11px] pt-1">
                    <div>
                      <span className="text-[10px] text-stone-500 font-bold block">Prefix</span>
                      <input
                        type="text"
                        value={idConfig.prefix}
                        onChange={(e) => setIdConfig({ ...idConfig, prefix: e.target.value })}
                        className="w-full p-1.5 rounded-lg border border-[#D4CEBA] bg-white uppercase font-mono text-xs"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-500 font-bold block">Year</span>
                      <input
                        type="text"
                        value={idConfig.year}
                        onChange={(e) => setIdConfig({ ...idConfig, year: e.target.value })}
                        className="w-full p-1.5 rounded-lg border border-[#D4CEBA] bg-white font-mono text-xs"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-500 font-bold block">Next Num</span>
                      <input
                        type="number"
                        value={idConfig.sequenceNumber}
                        onChange={(e) => setIdConfig({ ...idConfig, sequenceNumber: parseInt(e.target.value) || 1 })}
                        className="w-full p-1.5 rounded-lg border border-[#D4CEBA] bg-white font-mono text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Designation / Role */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-extrabold uppercase tracking-wider text-[#59645C]">
                      Designation / Role
                    </label>
                    <input
                      type="checkbox"
                      checked={cardState.details.showDesignation}
                      onChange={(e) => updateDetails('showDesignation', e.target.checked)}
                      className="rounded text-[#2C4F3A]"
                    />
                  </div>
                  <input
                    type="text"
                    value={cardState.details.designation}
                    onChange={(e) => updateDetails('designation', e.target.value)}
                    placeholder="e.g. Senior Security Director"
                    className="w-full px-3.5 py-2 rounded-xl border border-[#D4CEBA] bg-white text-xs font-semibold"
                  />
                </div>

                {/* Department & Secondary ID */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-extrabold uppercase tracking-wider text-[#59645C]">
                        Department
                      </label>
                      <input
                        type="checkbox"
                        checked={cardState.details.showDepartment}
                        onChange={(e) => updateDetails('showDepartment', e.target.checked)}
                        className="rounded text-[#2C4F3A]"
                      />
                    </div>
                    <input
                      type="text"
                      value={cardState.details.department}
                      onChange={(e) => updateDetails('department', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#D4CEBA] bg-white text-xs"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-extrabold uppercase tracking-wider text-[#59645C]">
                        Emp / Roll No.
                      </label>
                      <input
                        type="checkbox"
                        checked={cardState.details.showSecondaryId}
                        onChange={(e) => updateDetails('showSecondaryId', e.target.checked)}
                        className="rounded text-[#2C4F3A]"
                      />
                    </div>
                    <input
                      type="text"
                      value={cardState.details.secondaryId || ''}
                      onChange={(e) => updateDetails('secondaryId', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#D4CEBA] bg-white text-xs font-mono"
                    />
                  </div>
                </div>

                {/* Blood Group & Validity */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-extrabold uppercase tracking-wider text-[#59645C]">
                        Blood Group
                      </label>
                      <input
                        type="checkbox"
                        checked={cardState.details.showBloodGroup}
                        onChange={(e) => updateDetails('showBloodGroup', e.target.checked)}
                        className="rounded text-[#2C4F3A]"
                      />
                    </div>
                    <select
                      value={cardState.details.bloodGroup || 'O+'}
                      onChange={(e) => updateDetails('bloodGroup', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#D4CEBA] bg-white text-xs font-bold"
                    >
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-extrabold uppercase tracking-wider text-[#59645C]">
                        Valid Until
                      </label>
                      <input
                        type="checkbox"
                        checked={cardState.details.showValidity}
                        onChange={(e) => updateDetails('showValidity', e.target.checked)}
                        className="rounded text-[#2C4F3A]"
                      />
                    </div>
                    <input
                      type="text"
                      value={cardState.details.validUntil || 'DEC 2028'}
                      onChange={(e) => updateDetails('validUntil', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#D4CEBA] bg-white text-xs font-semibold"
                    />
                  </div>
                </div>

                {/* Phone & Emergency Contact */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#59645C] mb-1">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      value={cardState.details.phone || ''}
                      onChange={(e) => updateDetails('phone', e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="w-full px-3 py-2 rounded-xl border border-[#D4CEBA] bg-white text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#59645C] mb-1">
                      Emergency Contact
                    </label>
                    <input
                      type="text"
                      value={cardState.details.emergencyContact || ''}
                      onChange={(e) => updateDetails('emergencyContact', e.target.value)}
                      placeholder="+1 (555) 911-0000"
                      className="w-full px-3 py-2 rounded-xl border border-[#D4CEBA] bg-white text-xs"
                    />
                  </div>
                </div>

                {/* Cardholder Address */}
                <div>
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#59645C] mb-1">
                    Facility / Campus Address
                  </label>
                  <input
                    type="text"
                    value={cardState.details.address || ''}
                    onChange={(e) => updateDetails('address', e.target.value)}
                    placeholder="742 Evergreen Terrace, Sector 4"
                    className="w-full px-3 py-2 rounded-xl border border-[#D4CEBA] bg-white text-xs"
                  />
                </div>
              </div>
            )}

            {/* TAB 2: DESIGN & COLORS */}
            {activeTab === 'colors' && (
              <div className="space-y-5">
                {/* One-Click Presets */}
                <div>
                  <span className="text-xs font-extrabold uppercase tracking-wider text-[#59645C] block mb-2">
                    Harmonized Color Schemes
                  </span>
                  <div className="grid grid-cols-1 gap-2">
                    {colorPresets.map((preset) => (
                      <button
                        key={preset.name}
                        onClick={() => {
                          onUpdateCardState((prev) => ({
                            ...prev,
                            colors: { ...preset.colors },
                          }));
                          onShowToast(`Applied ${preset.name} palette`, 'info');
                        }}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-[#D4CEBA] hover:bg-[#DFD9C4] transition-colors text-left"
                      >
                        <span className="text-xs font-bold text-[#1D3527]">{preset.name}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full border border-black/10" style={{ backgroundColor: preset.colors.primary }} />
                          <span className="w-4 h-4 rounded-full border border-black/10" style={{ backgroundColor: preset.colors.secondary }} />
                          <span className="w-4 h-4 rounded-full border border-black/10" style={{ backgroundColor: preset.colors.accent }} />
                          <span className="w-4 h-4 rounded-full border border-black/10" style={{ backgroundColor: preset.colors.background }} />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Individual Color Pickers */}
                <div className="space-y-3 pt-2 border-t border-[#D4CEBA]">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-[#59645C] block">
                    Custom Color Fine-Tuning
                  </span>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-[#D4CEBA]">
                      <span className="font-semibold text-stone-700">Primary Color</span>
                      <input
                        type="color"
                        value={cardState.colors.primary}
                        onChange={(e) => onUpdateCardState((prev) => ({
                          ...prev,
                          colors: { ...prev.colors, primary: e.target.value, headerBg: e.target.value },
                        }))}
                        className="w-7 h-7 rounded border-none cursor-pointer"
                      />
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-[#D4CEBA]">
                      <span className="font-semibold text-stone-700">Secondary Accent</span>
                      <input
                        type="color"
                        value={cardState.colors.secondary}
                        onChange={(e) => onUpdateCardState((prev) => ({
                          ...prev,
                          colors: { ...prev.colors, secondary: e.target.value },
                        }))}
                        className="w-7 h-7 rounded border-none cursor-pointer"
                      />
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-[#D4CEBA]">
                      <span className="font-semibold text-stone-700">Card Canvas</span>
                      <input
                        type="color"
                        value={cardState.colors.background}
                        onChange={(e) => onUpdateCardState((prev) => ({
                          ...prev,
                          colors: { ...prev.colors, background: e.target.value },
                        }))}
                        className="w-7 h-7 rounded border-none cursor-pointer"
                      />
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-[#D4CEBA]">
                      <span className="font-semibold text-stone-700">Text Dark</span>
                      <input
                        type="color"
                        value={cardState.colors.textDark}
                        onChange={(e) => onUpdateCardState((prev) => ({
                          ...prev,
                          colors: { ...prev.colors, textDark: e.target.value },
                        }))}
                        className="w-7 h-7 rounded border-none cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* Background Patterns */}
                <div className="pt-2 border-t border-[#D4CEBA]">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-[#59645C] block mb-2">
                    Security Background Pattern
                  </span>
                  <div className="grid grid-cols-4 gap-1.5 text-xs font-semibold">
                    {(['none', 'dots', 'lines', 'geometric', 'wave', 'gradient', 'abstract'] as PatternType[]).map((pat) => (
                      <button
                        key={pat}
                        onClick={() => onUpdateCardState((prev) => ({ ...prev, pattern: pat }))}
                        className={`py-2 rounded-xl border capitalize transition-colors ${
                          cardState.pattern === pat
                            ? 'bg-[#2C4F3A] text-[#FBF9F2] border-[#2C4F3A]'
                            : 'bg-white text-[#1D3527] border-[#D4CEBA] hover:bg-[#DFD9C4]'
                        }`}
                      >
                        {pat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Typography Selection */}
                <div className="pt-2 border-t border-[#D4CEBA]">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-[#59645C] block mb-2">
                    Cardholder Typography
                  </span>
                  <select
                    value={cardState.fontFamily}
                    onChange={(e) => onUpdateCardState((prev) => ({ ...prev, fontFamily: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#D4CEBA] bg-white text-sm font-medium"
                  >
                    {fontOptions.map((font) => (
                      <option key={font} value={font} style={{ fontFamily: font }}>
                        {font}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* TAB 3: PHOTOS & LOGOS */}
            {activeTab === 'photo' && (
              <div className="space-y-5">
                {/* Photo Upload & Webcam */}
                <div>
                  <span className="text-xs font-extrabold uppercase tracking-wider text-[#59645C] block mb-2">
                    Cardholder Portrait Photo
                  </span>

                  <div className="flex items-center gap-4 p-3 bg-white rounded-2xl border border-[#D4CEBA]">
                    <div className="w-16 h-20 rounded-xl overflow-hidden border border-[#D4CEBA] bg-stone-100 flex-shrink-0">
                      {cardState.photoUrl ? (
                        <img
                          src={cardState.photoUrl}
                          alt="Photo"
                          className="w-full h-full object-cover"
                          style={{
                            transform: `scale(${cardState.photoZoom / 100}) rotate(${cardState.photoRotate}deg)`,
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] text-stone-400 font-bold">
                          None
                        </div>
                      )}
                    </div>

                    <div className="flex-1 space-y-2">
                      <label className="block w-full py-2 px-3 text-center bg-[#2C4F3A] hover:bg-[#1D3527] text-[#FBF9F2] text-xs font-bold rounded-xl cursor-pointer shadow-xs transition-colors">
                        Upload Image File
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          className="hidden"
                        />
                      </label>

                      <button
                        onClick={onOpenCameraModal}
                        className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-[#DFD9C4] hover:bg-[#D4CEBA] text-[#1D3527] text-xs font-bold rounded-xl transition-colors"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        Capture with Webcam
                      </button>
                    </div>
                  </div>

                  {/* Photo Zoom & Rotate Sliders */}
                  <div className="mt-3 p-3 bg-[#F4F0E4] rounded-2xl border border-[#D4CEBA] space-y-2 text-xs">
                    <div className="flex justify-between items-center font-semibold">
                      <span>Photo Zoom:</span>
                      <span className="font-mono text-[#2C4F3A] font-bold">{cardState.photoZoom}%</span>
                    </div>
                    <input
                      type="range"
                      min="80"
                      max="160"
                      value={cardState.photoZoom}
                      onChange={(e) => onUpdateCardState((prev) => ({ ...prev, photoZoom: parseInt(e.target.value) }))}
                      className="w-full accent-[#2C4F3A]"
                    />

                    <div className="flex justify-between items-center font-semibold pt-1">
                      <span>Photo Rotation:</span>
                      <span className="font-mono text-[#2C4F3A] font-bold">{cardState.photoRotate}°</span>
                    </div>
                    <input
                      type="range"
                      min="-90"
                      max="90"
                      value={cardState.photoRotate}
                      onChange={(e) => onUpdateCardState((prev) => ({ ...prev, photoRotate: parseInt(e.target.value) }))}
                      className="w-full accent-[#2C4F3A]"
                    />
                  </div>
                </div>

                {/* Organization Logo */}
                <div className="pt-2 border-t border-[#D4CEBA]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-[#59645C]">
                      Organization Logo
                    </span>
                    <input
                      type="checkbox"
                      checked={cardState.header.showLogo}
                      onChange={(e) => onUpdateCardState((prev) => ({
                        ...prev,
                        header: { ...prev.header, showLogo: e.target.checked },
                      }))}
                      className="rounded text-[#2C4F3A]"
                    />
                  </div>

                  <label className="block border border-dashed border-[#2C4F3A] rounded-xl p-3 text-center cursor-pointer bg-white hover:bg-[#F4F0E4] transition-colors">
                    <span className="text-xs font-bold text-[#1D3527]">
                      {cardState.primaryLogo.url ? 'Replace Organization Logo' : 'Upload Organization Logo'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Authorized Signature */}
                <div className="pt-2 border-t border-[#D4CEBA]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-[#59645C]">
                      Authorized Signature
                    </span>
                    <input
                      type="checkbox"
                      checked={cardState.footer.showSignature}
                      onChange={(e) => onUpdateCardState((prev) => ({
                        ...prev,
                        footer: { ...prev.footer, showSignature: e.target.checked },
                      }))}
                      className="rounded text-[#2C4F3A]"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block border border-dashed border-[#2C4F3A] rounded-xl p-3 text-center cursor-pointer bg-white hover:bg-[#F4F0E4] transition-colors">
                      <span className="text-xs font-bold text-[#1D3527]">Upload Signature PNG</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleSignatureUpload}
                        className="hidden"
                      />
                    </label>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-stone-500 font-bold block">Signatory Name</span>
                        <input
                          type="text"
                          value={cardState.signature.signatoryName || ''}
                          onChange={(e) => onUpdateCardState((prev) => ({
                            ...prev,
                            signature: { ...prev.signature, signatoryName: e.target.value },
                          }))}
                          placeholder="Dr. S. Miller"
                          className="w-full px-2 py-1.5 border border-[#D4CEBA] rounded-lg bg-white"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-stone-500 font-bold block">Signatory Title</span>
                        <input
                          type="text"
                          value={cardState.signature.signatoryTitle || ''}
                          onChange={(e) => onUpdateCardState((prev) => ({
                            ...prev,
                            signature: { ...prev.signature, signatoryTitle: e.target.value },
                          }))}
                          placeholder="Registrar"
                          className="w-full px-2 py-1.5 border border-[#D4CEBA] rounded-lg bg-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: HEADER & FOOTER */}
            {activeTab === 'header' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-[#59645C] mb-1">
                    Organization / Institution Name
                  </label>
                  <input
                    type="text"
                    value={cardState.header.orgName}
                    onChange={(e) => onUpdateCardState((prev) => ({
                      ...prev,
                      header: { ...prev.header, orgName: e.target.value },
                    }))}
                    placeholder="e.g. ST. JUDE MEDICAL CENTER"
                    className="w-full px-3.5 py-2 rounded-xl border border-[#D4CEBA] bg-white font-bold text-xs"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-extrabold uppercase tracking-wider text-[#59645C]">
                      Header Subtitle
                    </label>
                    <input
                      type="checkbox"
                      checked={cardState.header.showSubtitle}
                      onChange={(e) => onUpdateCardState((prev) => ({
                        ...prev,
                        header: { ...prev.header, showSubtitle: e.target.checked },
                      }))}
                      className="rounded text-[#2C4F3A]"
                    />
                  </div>
                  <input
                    type="text"
                    value={cardState.header.subtitle || ''}
                    onChange={(e) => onUpdateCardState((prev) => ({
                      ...prev,
                      header: { ...prev.header, subtitle: e.target.value },
                    }))}
                    placeholder="e.g. Department of Clinical Sciences"
                    className="w-full px-3.5 py-2 rounded-xl border border-[#D4CEBA] bg-white text-xs"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-extrabold uppercase tracking-wider text-[#59645C]">
                      Header Tagline / Badge
                    </label>
                    <input
                      type="checkbox"
                      checked={cardState.header.showTagline}
                      onChange={(e) => onUpdateCardState((prev) => ({
                        ...prev,
                        header: { ...prev.header, showTagline: e.target.checked },
                      }))}
                      className="rounded text-[#2C4F3A]"
                    />
                  </div>
                  <input
                    type="text"
                    value={cardState.header.tagline || ''}
                    onChange={(e) => onUpdateCardState((prev) => ({
                      ...prev,
                      header: { ...prev.header, tagline: e.target.value },
                    }))}
                    placeholder="e.g. STAFF PASS"
                    className="w-full px-3.5 py-2 rounded-xl border border-[#D4CEBA] bg-white text-xs font-bold"
                  />
                </div>

                <div className="pt-2 border-t border-[#D4CEBA]">
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-[#59645C] mb-1">
                    Footer Text / Notice
                  </label>
                  <input
                    type="text"
                    value={cardState.footer.text || ''}
                    onChange={(e) => onUpdateCardState((prev) => ({
                      ...prev,
                      footer: { ...prev.footer, text: e.target.value },
                    }))}
                    placeholder="e.g. Official Identification Credential"
                    className="w-full px-3.5 py-2 rounded-xl border border-[#D4CEBA] bg-white text-xs"
                  />
                </div>
              </div>
            )}

            {/* TAB 5: QR CODE */}
            {activeTab === 'qr' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-[#F4F0E4] border border-[#D4CEBA]">
                  <div>
                    <h4 className="font-extrabold text-xs text-[#1D3527]">Scannable QR Code</h4>
                    <p className="text-[10px] text-[#59645C]">Offline scannable public credential payload</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={cardState.qr.enabled}
                    onChange={(e) => onUpdateCardState((prev) => ({
                      ...prev,
                      qr: { ...prev.qr, enabled: e.target.checked },
                    }))}
                    className="w-4 h-4 rounded text-[#2C4F3A] focus:ring-[#2C4F3A]"
                  />
                </div>

                {cardState.qr.enabled && (
                  <div className="space-y-3">
                    <span className="text-xs font-bold text-[#1D3527] block">Include in QR Payload:</span>

                    <div className="space-y-2 text-xs">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={cardState.qr.includeName}
                          onChange={(e) => onUpdateCardState((prev) => ({
                            ...prev,
                            qr: { ...prev.qr, includeName: e.target.checked },
                          }))}
                          className="rounded text-[#2C4F3A]"
                        />
                        <span>Cardholder Full Name</span>
                      </label>

                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={cardState.qr.includeId}
                          onChange={(e) => onUpdateCardState((prev) => ({
                            ...prev,
                            qr: { ...prev.qr, includeId: e.target.checked },
                          }))}
                          className="rounded text-[#2C4F3A]"
                        />
                        <span>Unique Credential ID Number</span>
                      </label>

                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={cardState.qr.includeDepartment}
                          onChange={(e) => onUpdateCardState((prev) => ({
                            ...prev,
                            qr: { ...prev.qr, includeDepartment: e.target.checked },
                          }))}
                          className="rounded text-[#2C4F3A]"
                        />
                        <span>Department / Branch</span>
                      </label>
                    </div>

                    <div className="pt-2">
                      <label className="block text-xs font-bold text-[#59645C] uppercase tracking-wider mb-1">
                        Custom Note / Verification URL (Optional)
                      </label>
                      <input
                        type="text"
                        value={cardState.qr.customText || ''}
                        onChange={(e) => onUpdateCardState((prev) => ({
                          ...prev,
                          qr: { ...prev.qr, customText: e.target.value },
                        }))}
                        placeholder="https://mycompany.org/verify"
                        className="w-full px-3 py-2 rounded-xl border border-[#D4CEBA] bg-white text-xs"
                      />
                    </div>

                    {qrDataUrl && (
                      <div className="p-4 bg-white rounded-2xl border border-[#D4CEBA] flex flex-col items-center justify-center space-y-3">
                        <img src={qrDataUrl} alt="QR Preview" className="w-28 h-28 object-contain" />
                        <span className="text-[10px] text-stone-500 font-mono">Scan with your phone camera</span>

                        {/* Localhost Warning Notice */}
                        {isLocalhostWithoutPublicUrl() && (
                          <div className="w-full bg-amber-50 border border-amber-300 text-amber-800 p-2.5 rounded-xl text-[11px] leading-relaxed text-center">
                            <span className="font-bold block mb-0.5">⚠️ Localhost Device Notice:</span>
                            QR scanning from another device requires SmartID to be deployed (e.g. Vercel) or a public URL configured via <code className="font-mono bg-amber-100 px-1 rounded">VITE_PUBLIC_SMARTID_URL</code>.
                          </div>
                        )}

                        {/* Direct Action Buttons: TEST QR and COPY URL */}
                        <div className="flex items-center gap-2 w-full pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              const verifyUrl = buildQrVerificationUrl(cardState);
                              window.open(verifyUrl, '_blank');
                              onShowToast('Opened Verification Portal', 'info');
                            }}
                            className="flex-1 py-2 px-3 rounded-xl bg-[#2C4F3A] hover:bg-[#1D3527] text-white font-extrabold text-xs transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <span>TEST QR</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const verifyUrl = buildQrVerificationUrl(cardState);
                              navigator.clipboard.writeText(verifyUrl);
                              onShowToast('Copied Verification URL to clipboard!', 'success');
                            }}
                            className="flex-1 py-2 px-3 rounded-xl bg-[#DFD9C4] hover:bg-[#D4CEBA] text-[#1D3527] font-bold text-xs border border-[#BDB6A0] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <span>COPY URL</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB 6: TEMPLATES */}
            {activeTab === 'templates' && (
              <div className="space-y-3">
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#59645C] block">
                  Switch Template Layout
                </span>
                <div className="grid grid-cols-1 gap-2 max-h-[500px] overflow-y-auto pr-1">
                  {TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.id}
                      onClick={() => handleSelectTemplate(tpl.id)}
                      className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all ${
                        cardState.templateId === tpl.id
                          ? 'bg-[#2C4F3A] text-[#FBF9F2] border-[#2C4F3A]'
                          : 'bg-white text-[#1D3527] border-[#D4CEBA] hover:bg-[#F4F0E4]'
                      }`}
                    >
                      <div>
                        <div className="font-extrabold text-xs">{tpl.name}</div>
                        <div className="text-[10px] opacity-75 capitalize">
                          {tpl.category} • {tpl.orientation}
                        </div>
                      </div>
                      <span className="w-3 h-3 rounded-full border" style={{ backgroundColor: tpl.colors.primary }} />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Center Canvas Stage Area */}
        <main className="flex-1 bg-[#F4F0E4]/50 p-6 lg:p-10 flex flex-col items-center justify-center min-h-[500px] overflow-auto relative">
          {/* Active Side Switcher Pills */}
          <div className="mb-6 flex items-center gap-2 bg-[#DFD9C4] p-1.5 rounded-2xl shadow-xs">
            <button
              onClick={() => setActiveSide('front')}
              className={`px-5 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                activeSide === 'front'
                  ? 'bg-[#2C4F3A] text-[#FBF9F2] shadow-sm'
                  : 'text-[#1D3527] hover:bg-black/5'
              }`}
            >
              Front Side
            </button>
            <button
              onClick={() => setActiveSide('back')}
              className={`px-5 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                activeSide === 'back'
                  ? 'bg-[#2C4F3A] text-[#FBF9F2] shadow-sm'
                  : 'text-[#1D3527] hover:bg-black/5'
              }`}
            >
              Back Side
            </button>
          </div>

          {/* Interactive Card Stage */}
          <div className="p-4 bg-white rounded-3xl shadow-xl border border-[#D4CEBA] relative transition-all">
            {/* Hidden DOM front & back for instant high-dpi capture */}
            <div style={{ display: activeSide === 'front' ? 'block' : 'none' }}>
              <CardRenderer
                id="main-editor-card-front"
                cardState={cardState}
                side="front"
                scale={(zoomLevel / 100) * (cardState.orientation === 'landscape' ? 1.05 : 0.95)}
                qrDataUrl={qrDataUrl}
              />
            </div>

            <div style={{ display: activeSide === 'back' ? 'block' : 'none' }}>
              <CardRenderer
                id="main-editor-card-back"
                cardState={cardState}
                side="back"
                scale={(zoomLevel / 100) * (cardState.orientation === 'landscape' ? 1.05 : 0.95)}
                qrDataUrl={qrDataUrl}
              />
            </div>
          </div>

          {/* Bottom Card Specs Banner */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-[#59645C]">
            <span className="font-mono font-bold text-[#1D3527]">
              {cardState.orientation === 'landscape' ? '85.60 × 53.98 mm' : '53.98 × 85.60 mm'}
            </span>
            <span>•</span>
            <span className="capitalize">{cardState.orientation} CR80</span>
            <span>•</span>
            <span>Scale: {zoomLevel}%</span>
            <span>•</span>
            <button
              onClick={() => setActiveSide((prev) => (prev === 'front' ? 'back' : 'front'))}
              className="text-[#2C4F3A] font-bold hover:underline flex items-center gap-1"
            >
              <FlipHorizontal className="w-3.5 h-3.5" />
              Flip Card
            </button>
          </div>
        </main>
      </div>

      {/* Save to My Designs Modal */}
      {saveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[#FBF9F2] rounded-3xl border border-[#D4CEBA] shadow-2xl max-w-md w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#D4CEBA]">
              <div className="flex items-center gap-2 text-[#1D3527]">
                <Save className="w-5 h-5 text-[#2C4F3A]" />
                <h3 className="font-bold text-base">Save Design to Storage</h3>
              </div>
              <button
                onClick={() => setSaveModalOpen(false)}
                className="text-[#59645C] hover:text-[#1D3527] text-lg font-bold px-2 py-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#59645C] mb-1.5">
                  Design Name
                </label>
                <input
                  type="text"
                  value={cardSaveTitle}
                  onChange={(e) => setCardSaveTitle(e.target.value)}
                  placeholder="e.g. Acme Corp - John Doe"
                  className="w-full px-3.5 py-2.5 bg-white border border-[#D4CEBA] rounded-xl text-sm font-medium text-[#1D3527] focus:outline-none focus:border-[#2C4F3A] focus:ring-1 focus:ring-[#2C4F3A]"
                  autoFocus
                />
                <p className="text-[11px] text-[#59645C] mt-1">
                  Card is saved in browser storage with optimized images to protect storage quota.
                </p>
              </div>

              <div className="bg-[#F4F0E4] rounded-xl p-3 border border-[#D4CEBA] space-y-1.5 text-xs text-[#28382C]">
                <div className="flex justify-between">
                  <span className="text-[#59645C]">Cardholder:</span>
                  <span className="font-semibold">{cardState.details.fullName || 'Not specified'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#59645C]">ID Number:</span>
                  <span className="font-mono font-semibold">{cardState.details.uniqueId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#59645C]">Orientation:</span>
                  <span className="capitalize">{cardState.orientation} CR80</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#D4CEBA]">
              <button
                onClick={() => setSaveModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-[#59645C] hover:bg-[#DFD9C4] rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSave}
                className="px-5 py-2 text-xs font-bold uppercase tracking-wider text-[#FBF9F2] bg-[#2C4F3A] hover:bg-[#1D3527] rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                Confirm & Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
