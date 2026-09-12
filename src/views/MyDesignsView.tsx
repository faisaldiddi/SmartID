import React, { useState } from 'react';
import { 
  FolderHeart, 
  Plus, 
  Printer, 
  Trash2, 
  Copy, 
  ExternalLink, 
  Download, 
  Calendar, 
  User, 
  CreditCard,
  FileDown
} from 'lucide-react';
import { SavedCard, CardState } from '../types';
import { CardRenderer } from '../components/CardRenderer';
import { deleteSavedDesign, duplicateSavedDesign } from '../utils/storage';
import { downloadSingleCardPdf, downloadCardImage } from '../utils/pdfExport';

interface MyDesignsViewProps {
  savedDesigns: SavedCard[];
  onRefreshSavedDesigns: () => void;
  onOpenInEditor: (cardState: CardState) => void;
  onPrintCard: (cardState: CardState) => void;
  onCreateNew: () => void;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const MyDesignsView: React.FC<MyDesignsViewProps> = ({
  savedDesigns,
  onRefreshSavedDesigns,
  onOpenInEditor,
  onPrintCard,
  onCreateNew,
  onShowToast,
}) => {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const confirmDelete = () => {
    if (deleteTarget) {
      deleteSavedDesign(deleteTarget.id);
      onRefreshSavedDesigns();
      onShowToast(`Deleted "${deleteTarget.name}"`, 'info');
      setDeleteTarget(null);
    }
  };

  const handleDuplicate = (id: string) => {
    const dup = duplicateSavedDesign(id);
    if (dup) {
      onRefreshSavedDesigns();
      onShowToast(`Duplicated as "${dup.name}"`, 'success');
    }
  };

  const handleDownloadPdf = async (card: SavedCard) => {
    setDownloadingId(card.id);
    try {
      const elem = document.getElementById(`my-design-card-${card.id}`);
      if (elem) {
        await downloadSingleCardPdf(
          elem,
          card.cardState.orientation,
          `${card.personName || 'Card'}_${card.uniqueId}`
        );
        onShowToast('CR80 PDF downloaded', 'success');
      }
    } catch (err) {
      console.error('PDF error:', err);
      onShowToast('Download failed', 'error');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadPng = async (card: SavedCard) => {
    try {
      const elem = document.getElementById(`my-design-card-${card.id}`);
      if (elem) {
        await downloadCardImage(
          elem,
          'png',
          `${card.personName || 'Card'}_${card.uniqueId}`
        );
        onShowToast('PNG image downloaded', 'success');
      }
    } catch (err) {
      console.error('PNG error:', err);
      onShowToast('Download failed', 'error');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="bg-[#F4F0E4] p-6 sm:p-8 rounded-3xl border border-[#D4CEBA] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-extrabold tracking-wider px-2.5 py-0.5 rounded-full bg-[#2C4F3A] text-[#FBF9F2]">
              Local Storage
            </span>
            <span className="text-xs text-[#59645C] font-semibold">100% Private to this browser</span>
          </div>
          <h1 className="text-3xl font-extrabold text-[#1D3527] tracking-tight">
            My Saved ID Cards ({savedDesigns.length})
          </h1>
          <p className="text-xs sm:text-sm text-[#59645C]">
            All cards you save are preserved locally in your browser for instant printing and editing.
          </p>
        </div>

        <button
          onClick={onCreateNew}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#2C4F3A] hover:bg-[#1D3527] text-[#FBF9F2] font-bold text-xs uppercase tracking-wider shadow-sm transition-all flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          Create New ID
        </button>
      </div>

      {/* Content */}
      {savedDesigns.length === 0 ? (
        <div className="text-center py-20 bg-[#F4F0E4]/40 rounded-3xl border border-[#D4CEBA] space-y-4 max-w-xl mx-auto">
          <div className="w-16 h-16 rounded-3xl bg-[#DFD9C4] flex items-center justify-center text-[#2C4F3A] mx-auto">
            <CreditCard className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="font-extrabold text-xl text-[#1D3527]">No saved designs yet</h3>
            <p className="text-xs text-[#59645C] max-w-sm mx-auto">
              Whenever you create or customize an ID card, click "Save to My Designs" to store it here for future reprinting.
            </p>
          </div>
          <button
            onClick={onCreateNew}
            className="px-6 py-3 rounded-2xl bg-[#2C4F3A] hover:bg-[#1D3527] text-[#FBF9F2] font-bold text-xs uppercase tracking-wider shadow-sm transition-all"
          >
            Start Creating Your First Card
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {savedDesigns.map((saved) => {
            const formattedDate = new Date(saved.savedAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });

            return (
              <div
                key={saved.id}
                className="bg-[#FBF9F2] p-4 rounded-3xl border border-[#D4CEBA] shadow-xs flex flex-col justify-between hover:shadow-md transition-all group"
              >
                <div>
                  {/* Card Metadata Top */}
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-extrabold text-sm text-[#1D3527] truncate max-w-[200px]">
                      {saved.name}
                    </h3>
                    <span className="text-[10px] font-mono font-bold text-[#2C4F3A] bg-[#DFD9C4] px-2 py-0.5 rounded-full">
                      {saved.uniqueId}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-[#59645C] mb-3">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {formattedDate}
                    </span>
                    <span>•</span>
                    <span className="capitalize">{saved.templateName}</span>
                  </div>

                  {/* Thumbnail / Live Card Container */}
                  <div className="p-3 bg-white rounded-2xl border border-[#D4CEBA] shadow-xs flex items-center justify-center min-h-[210px] w-full mb-3 overflow-hidden">
                    <CardRenderer
                      id={`my-design-card-${saved.id}`}
                      cardState={saved.cardState}
                      side="front"
                      scale={saved.cardState.orientation === 'landscape' ? 0.70 : 0.60}
                    />
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-2 border-t border-[#D4CEBA] space-y-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onOpenInEditor(saved.cardState)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold bg-[#2C4F3A] hover:bg-[#1D3527] text-[#FBF9F2] transition-colors shadow-xs"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Open in Editor
                    </button>
                    <button
                      onClick={() => onPrintCard(saved.cardState)}
                      className="px-3 py-2 rounded-xl text-xs font-bold bg-[#DFD9C4] hover:bg-[#D4CEBA] text-[#1D3527] transition-colors flex items-center gap-1"
                      title="Print this card"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Print
                    </button>
                  </div>

                  {/* Secondary Tools: Duplicate, Download, Delete */}
                  <div className="flex items-center justify-between text-xs pt-1 px-1">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDownloadPng(saved)}
                        className="p-1.5 rounded-lg hover:bg-[#DFD9C4] text-[#1F2D24] transition-colors"
                        title="Download PNG"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDownloadPdf(saved)}
                        disabled={downloadingId === saved.id}
                        className="p-1.5 rounded-lg hover:bg-[#DFD9C4] text-[#1F2D24] transition-colors"
                        title="Download CR80 PDF"
                      >
                        <FileDown className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDuplicate(saved.id)}
                        className="p-1.5 rounded-lg hover:bg-[#DFD9C4] text-[#1F2D24] transition-colors"
                        title="Duplicate this card"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>

                    <button
                      onClick={() => setDeleteTarget({ id: saved.id, name: saved.name })}
                      className="p-1.5 rounded-lg hover:bg-red-100 text-stone-400 hover:text-red-700 transition-colors"
                      title="Delete card"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[#FBF9F2] rounded-3xl border border-[#D4CEBA] shadow-2xl max-w-sm w-full p-6 space-y-4">
            <h3 className="font-bold text-base text-[#1D3527]">Delete Saved Design?</h3>
            <p className="text-xs text-[#59645C]">
              Are you sure you want to remove <span className="font-semibold text-[#1D3527]">"{deleteTarget.name}"</span> from your saved designs? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-xs font-bold text-[#59645C] hover:bg-[#DFD9C4] rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all shadow-xs"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
