import React, { useState, useEffect } from 'react';
import { Header, ActiveTab } from './components/Header';
import { Footer } from './components/Footer';
import { ToastContainer, ToastNotification } from './components/Toast';
import { HomeView } from './views/HomeView';
import { EditorView } from './views/EditorView';
import { TemplatesView } from './views/TemplatesView';
import { QuickPrintView } from './views/QuickPrintView';
import { MyDesignsView } from './views/MyDesignsView';
import { PrintPreviewModal } from './components/PrintPreviewModal';
import { CameraCaptureModal } from './components/CameraCaptureModal';
import { AiDesignAssistantModal } from './components/AiDesignAssistantModal';
import { CsvImportModal } from './components/CsvImportModal';
import { CardRenderer } from './components/CardRenderer';
import { CardState, PrintCalibration, SavedCard, ColorScheme, PatternType } from './types';
import { TEMPLATES, getTemplateCardState } from './data/templates';
import { 
  getSavedDesigns, 
  fetchSavedDesignsFromServer, 
  getPrintCalibration, 
  getCurrentDraft, 
  saveCurrentDraft, 
  setPrintTarget 
} from './utils/storage';
import { generateCardQrCode } from './utils/qrGenerator';
import { QrCardViewer } from './views/QrCardViewer';
import { PrintWindowView } from './views/PrintWindowView';

/**
 * Parses URL to immediately determine if the user entered Verification Viewer Mode.
 * Checks hash route (#/verify?d=... or #verify?d=...) and search query params.
 */
function parseVerificationRoute(): { isVerification: boolean; encodedData: string } {
  if (typeof window === 'undefined') {
    return { isVerification: false, encodedData: '' };
  }
  const hash = window.location.hash || '';
  const search = window.location.search || '';

  // 1. Primary: Hash-based routing #/verify?d=... or #verify?d=...
  if (hash.startsWith('#/verify') || hash.startsWith('#verify')) {
    const queryIdx = hash.indexOf('?');
    const queryString = queryIdx !== -1 ? hash.substring(queryIdx + 1) : '';
    const params = new URLSearchParams(queryString);
    const d = params.get('d') || params.get('verify') || params.get('v') || '';
    return { isVerification: true, encodedData: d };
  }

  // 2. Query param fallback: ?d=... or ?verify=...
  const urlParams = new URLSearchParams(search);
  const dParam = urlParams.get('d') || urlParams.get('verify') || urlParams.get('v');
  if (dParam !== null && dParam !== undefined) {
    return { isVerification: true, encodedData: dParam };
  }

  return { isVerification: false, encodedData: '' };
}

/**
 * =========================================================================
 * STUDIO MODE (SmartIDStudio)
 * Used exclusively by the card creator to design, edit, and print cards.
 * =========================================================================
 */
export function SmartIDStudio() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [savedDesigns, setSavedDesigns] = useState<SavedCard[]>([]);
  const [calibration, setCalibration] = useState<PrintCalibration>(getPrintCalibration());

  const [isStandalonePrint, setIsStandalonePrint] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('view') === 'print' || urlParams.get('print') === 'true';
  });

  // Modal open states
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);

  // Active working Card State in Editor: restore from draft if available
  const defaultTpl = TEMPLATES[0];
  const [cardState, setCardState] = useState<CardState>(() => {
    const draft = getCurrentDraft();
    return draft || getTemplateCardState(defaultTpl);
  });

  // Debounced auto-save of current draft to localStorage
  useEffect(() => {
    const timer = setTimeout(() => {
      saveCurrentDraft(cardState);
    }, 500);
    return () => clearTimeout(timer);
  }, [cardState]);

  // Dedicated print state
  const [printTargetCard, setPrintTargetCard] = useState<CardState>(cardState);
  const [printQrDataUrl, setPrintQrDataUrl] = useState<string>('');
  const [bulkPrintRecords, setBulkPrintRecords] = useState<any[] | null>(null);

  // Refresh saved cards from local storage and sync with server
  const refreshSavedDesigns = async () => {
    setSavedDesigns(getSavedDesigns());
    try {
      const serverDesigns = await fetchSavedDesignsFromServer();
      if (serverDesigns && serverDesigns.length > 0) {
        setSavedDesigns(serverDesigns);
      }
    } catch {}
  };

  useEffect(() => {
    refreshSavedDesigns();
  }, []);

  // Update print QR data URL whenever print target changes
  useEffect(() => {
    async function genQr() {
      if (!printTargetCard.qr.enabled) {
        setPrintQrDataUrl('');
        return;
      }
      const payload = {
        org: printTargetCard.header.orgName,
        name: printTargetCard.qr.includeName ? printTargetCard.details.fullName : undefined,
        id: printTargetCard.qr.includeId ? printTargetCard.details.uniqueId : undefined,
        department: printTargetCard.qr.includeDepartment ? printTargetCard.details.department : undefined,
        customText: printTargetCard.qr.customText || undefined,
      };
      const url = await generateCardQrCode(payload, 180, printTargetCard);
      setPrintQrDataUrl(url);
    }
    genQr();
  }, [printTargetCard]);

  // Toast Helper
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = 'toast_' + Date.now() + Math.random().toString(36).substring(2, 6);
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Switch template and go to editor
  const handleSelectTemplate = (templateId: string) => {
    const tpl = TEMPLATES.find((t) => t.id === templateId);
    if (!tpl) return;

    setCardState((prev) => ({
      ...getTemplateCardState(tpl),
      details: {
        ...getTemplateCardState(tpl).details,
        fullName: prev.details.fullName || 'Alexander Wright',
        uniqueId: prev.details.uniqueId || `ID-${Math.floor(1000 + Math.random() * 9000)}`,
      },
      photoUrl: prev.photoUrl || getTemplateCardState(tpl).photoUrl,
    }));
    setActiveTab('editor');
    showToast(`Loaded ${tpl.name} template into editor`, 'success');
  };

  // Direct print from template gallery
  const handleDirectPrintFromTemplate = (templateId: string) => {
    const tpl = TEMPLATES.find((t) => t.id === templateId);
    if (!tpl) return;

    const newCardState = getTemplateCardState(tpl);
    setPrintTargetCard(newCardState);
    setIsPrintModalOpen(true);
  };

  // Print from My Designs
  const handlePrintSavedDesign = (savedState: CardState) => {
    setPrintTargetCard(savedState);
    setIsPrintModalOpen(true);
  };

  // Open saved design in editor
  const handleOpenSavedInEditor = (savedState: CardState) => {
    setCardState(savedState);
    setActiveTab('editor');
    showToast(`Opened "${savedState.details.fullName || 'Card'}" in editor. QR upgraded to new SmartID verification format.`, 'info');
  };

  // Trigger real browser print (Ctrl+P / Cmd+P)
  const handleTriggerBrowserPrint = (customTarget?: CardState, customCal?: PrintCalibration) => {
    const cardToPrint = customTarget || cardState;
    if (customTarget) {
      setPrintTargetCard(customTarget);
    } else {
      setPrintTargetCard(cardState);
    }

    if (customCal) {
      setCalibration(customCal);
    }

    setPrintTarget(cardToPrint);

    // Eagerly pre-generate QR code if needed
    if (cardToPrint.qr.enabled) {
      generateCardQrCode(
        {
          org: cardToPrint.header.orgName,
          name: cardToPrint.qr.includeName ? cardToPrint.details.fullName : undefined,
          id: cardToPrint.qr.includeId ? cardToPrint.details.uniqueId : undefined,
          department: cardToPrint.qr.includeDepartment ? cardToPrint.details.department : undefined,
          customText: cardToPrint.qr.customText || undefined,
        },
        180,
        cardToPrint
      ).then((url) => setPrintQrDataUrl(url)).catch(() => {});
    }

    const isInIframe = typeof window !== 'undefined' && window.self !== window.top;
    if (isInIframe) {
      const base = import.meta.env.BASE_URL || '/';
      const printUrl = `${window.location.origin}${base}?view=print&autoprint=true`;
      window.open(printUrl, '_blank');
      showToast('Opened dedicated print tab for reliable browser printing', 'info');
      return;
    }

    showToast('Opening print dialog...', 'info');
    setTimeout(() => {
      try {
        window.print();
      } catch (e) {
        console.error('Print failed:', e);
        showToast('Print dialog failed to open automatically', 'error');
      }
    }, 350);
  };

  // Bulk print all CSV records
  const handleBulkPrintAll = (records: any[]) => {
    setBulkPrintRecords(records);
    setPrintTargetCard(cardState);
    setCalibration((prev) => ({ ...prev, printMode: 'a4' }));
    showToast(`Prepared ${records.length} cards for A4 sheet printing`, 'success');
    setTimeout(() => {
      try {
        window.print();
      } catch {
        showToast('Prepared cards for printing', 'info');
      }
    }, 450);
  };

  // Apply Gemini AI theme
  const handleApplyAiTheme = (colors: ColorScheme, pattern: PatternType, fontFamily: string) => {
    setCardState((prev) => ({
      ...prev,
      colors,
      pattern,
      fontFamily,
    }));
    showToast('Applied Gemini-inspired color palette and styling!', 'success');
  };

  if (isStandalonePrint) {
    return (
      <PrintWindowView
        cardState={cardState}
        calibration={calibration}
        onBack={() => {
          setIsStandalonePrint(false);
          if (typeof window !== 'undefined' && window.history) {
            const base = import.meta.env.BASE_URL || '/';
            window.history.replaceState({}, document.title, `${base}#/studio`);
          }
        }}
      />
    );
  }

  return (
    <>
      {/* Screen layout UI: completely hidden during browser print */}
      <div className="screen-layout min-h-screen flex flex-col bg-[#FBF9F2] text-[#1F2D24] selection:bg-[#2C4F3A] selection:text-[#FBF9F2] print:hidden">
        {/* Top Header */}
        <Header
          activeTab={activeTab}
          onNavigate={(tab) => {
            setActiveTab(tab);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onOpenAiAssistant={() => setIsAiModalOpen(true)}
          savedCount={savedDesigns.length}
        />

        {/* Main View Display */}
        <main className="flex-1">
          {activeTab === 'home' && (
            <HomeView
              onNavigate={(tab) => {
                setActiveTab(tab);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onSelectTemplate={handleSelectTemplate}
              onOpenAiAssistant={() => setIsAiModalOpen(true)}
            />
          )}

          {activeTab === 'editor' && (
            <EditorView
              cardState={cardState}
              onUpdateCardState={setCardState}
              onOpenPrintModal={() => {
                setPrintTargetCard(cardState);
                setIsPrintModalOpen(true);
              }}
              onOpenAiAssistant={() => setIsAiModalOpen(true)}
              onOpenCameraModal={() => setIsCameraModalOpen(true)}
              onOpenCsvModal={() => setIsCsvModalOpen(true)}
              onShowToast={showToast}
              onSavedDesignsChange={refreshSavedDesigns}
            />
          )}

          {activeTab === 'templates' && (
            <TemplatesView
              onSelectTemplate={handleSelectTemplate}
              onDirectPrint={handleDirectPrintFromTemplate}
              onOpenAiAssistant={() => setIsAiModalOpen(true)}
            />
          )}

          {activeTab === 'quickprint' && (
            <QuickPrintView
              onTriggerBrowserPrint={(target, cal) => handleTriggerBrowserPrint(target, cal)}
              onOpenEditor={(target) => {
                setCardState(target);
                setActiveTab('editor');
              }}
              onOpenCsvModal={() => setIsCsvModalOpen(true)}
              onOpenAiAssistant={() => setIsAiModalOpen(true)}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'mydesigns' && (
            <MyDesignsView
              savedDesigns={savedDesigns}
              onRefreshSavedDesigns={refreshSavedDesigns}
              onOpenInEditor={handleOpenSavedInEditor}
              onPrintCard={handlePrintSavedDesign}
              onCreateNew={() => {
                setActiveTab('editor');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onShowToast={showToast}
            />
          )}
        </main>

        {/* Footer */}
        <Footer
          onNavigate={(tab) => {
            setActiveTab(tab);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />

        {/* Global Modals */}
        <PrintPreviewModal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          cardState={printTargetCard}
          calibration={calibration}
          onUpdateCalibration={setCalibration}
          qrDataUrl={printQrDataUrl}
          onTriggerBrowserPrint={() => handleTriggerBrowserPrint(printTargetCard, calibration)}
          onShowToast={showToast}
        />

        <CameraCaptureModal
          isOpen={isCameraModalOpen}
          onClose={() => setIsCameraModalOpen(false)}
          onPhotoCaptured={(photoUrl) => {
            setCardState((prev) => ({ ...prev, photoUrl }));
            showToast('Photo captured and applied to ID card!', 'success');
          }}
        />

        <AiDesignAssistantModal
          isOpen={isAiModalOpen}
          onClose={() => setIsAiModalOpen(false)}
          onApplyTheme={handleApplyAiTheme}
          currentCategory={TEMPLATES.find((t) => t.id === cardState.templateId)?.category}
        />

        <CsvImportModal
          isOpen={isCsvModalOpen}
          onClose={() => setIsCsvModalOpen(false)}
          onApplyPerson={(person) => {
            setCardState((prev) => ({
              ...prev,
              details: {
                ...prev.details,
                ...person,
              },
            }));
            showToast(`Applied ${person.fullName || 'record'} to editor`, 'success');
            setActiveTab('editor');
          }}
          onBulkPrintAll={handleBulkPrintAll}
        />

        {/* Toast Notification Container */}
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </div>

      {/* =========================================================================
          PRINT-ONLY CONTAINER:
          Target of CSS @media print. Completely isolated outside of screen-layout.
          ========================================================================= */}
      <div 
        id="print-only-container" 
        className="print-only-container"
      >
        {bulkPrintRecords && bulkPrintRecords.length > 0 ? (
          // Bulk A4 sheet grid
          <div className="a4-print-sheet p-4 max-w-[190mm] mx-auto">
            <div className="grid grid-cols-2 gap-4">
              {bulkPrintRecords.map((rec, idx) => {
                const bulkCard: CardState = {
                  ...printTargetCard,
                  details: {
                    ...printTargetCard.details,
                    fullName: rec.name,
                    uniqueId: rec.id,
                    department: rec.department || printTargetCard.details.department,
                    designation: rec.designation || printTargetCard.details.designation,
                  },
                };
                return (
                  <div key={idx} className="print-card-wrapper mb-4 border border-dashed border-stone-400 p-1 flex justify-center">
                    <CardRenderer
                      cardState={bulkCard}
                      side="front"
                      scale={0.88}
                      showBleedMarks={true}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ) : calibration.printMode === 'a4' ? (
          // Standard A4 sheet: repeats card up to 8 times or copies
          <div className="a4-print-sheet p-4 max-w-[190mm] mx-auto">
            <div className="grid grid-cols-2 gap-6 justify-center">
              {Array.from({ length: Math.min(calibration.copies || 8, 8) }).map((_, idx) => (
                <div key={idx} className="print-card-wrapper border border-dashed border-stone-300 p-1 rounded-xl flex justify-center">
                  <CardRenderer
                    cardState={printTargetCard}
                    side={calibration.cardSide === 'back' ? 'back' : 'front'}
                    scale={0.75}
                    showBleedMarks={true}
                    qrDataUrl={printQrDataUrl}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          // CR80 Direct PVC Card: exact physical size (85.60mm x 53.98mm) with calibrated hardware offsets
          <div className="cr80-print-wrapper block m-0 p-0">
            {(calibration.cardSide === 'front' || calibration.cardSide === 'both') && (
              <div 
                className="print-card-page block m-0 p-0"
                style={{
                  pageBreakAfter: calibration.cardSide === 'both' ? 'always' : 'avoid',
                  breakAfter: calibration.cardSide === 'both' ? 'page' : 'avoid',
                }}
              >
                <div 
                  className="flex items-center justify-center p-0 m-0"
                  style={{
                    transform: `translate(${calibration.offsetX}mm, ${calibration.offsetY}mm)`,
                    transformOrigin: 'center center',
                  }}
                >
                  <CardRenderer
                    cardState={printTargetCard}
                    side="front"
                    scale={(calibration.scale || 100) / 100}
                    showBleedMarks={false}
                    qrDataUrl={printQrDataUrl}
                  />
                </div>
              </div>
            )}

            {(calibration.cardSide === 'back' || calibration.cardSide === 'both') && (
              <div 
                className="print-card-page block m-0 p-0"
                style={{
                  pageBreakAfter: 'avoid',
                  breakAfter: 'avoid',
                }}
              >
                <div 
                  className="flex items-center justify-center p-0 m-0"
                  style={{
                    transform: `translate(${calibration.offsetX}mm, ${calibration.offsetY}mm)`,
                    transformOrigin: 'center center',
                  }}
                >
                  <CardRenderer
                    cardState={printTargetCard}
                    side="back"
                    scale={(calibration.scale || 100) / 100}
                    showBleedMarks={false}
                    qrDataUrl={printQrDataUrl}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

/**
 * =========================================================================
 * ROOT APPLICATION
 * Enforces two strict mutually-exclusive application modes:
 * 1. VERIFICATION VIEWER MODE: when URL is #/verify?d=...
 *    Renders ONLY VerificationViewer, completely bypassing StudioApp layout.
 * 2. STUDIO MODE: default mode for card creators.
 * =========================================================================
 */
export default function App() {
  const [route, setRoute] = useState(parseVerificationRoute);

  useEffect(() => {
    const handleRouteChange = () => {
      setRoute(parseVerificationRoute());
    };
    window.addEventListener('hashchange', handleRouteChange);
    window.addEventListener('popstate', handleRouteChange);
    return () => {
      window.removeEventListener('hashchange', handleRouteChange);
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, []);

  // 1. READ-ONLY QR CARD VIEWER MODE: Isolated Card Preview for QR code scanners
  if (route.isVerification) {
    return <QrCardViewer encodedData={route.encodedData} />;
  }

  // 2. STUDIO MODE: Full card design and print studio
  return <SmartIDStudio />;
}
