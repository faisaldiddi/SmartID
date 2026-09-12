import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  RotateCw, 
  CreditCard, 
  Plus, 
  Printer, 
  Sparkles,
  ArrowRight,
  Layers
} from 'lucide-react';
import { TEMPLATES, getTemplateCardState } from '../data/templates';
import { CardRenderer } from '../components/CardRenderer';
import { CardState, TemplateCategory, Orientation } from '../types';

interface TemplatesViewProps {
  onSelectTemplate: (templateId: string) => void;
  onDirectPrint: (templateId: string) => void;
  onOpenAiAssistant: () => void;
}

export const TemplatesView: React.FC<TemplatesViewProps> = ({
  onSelectTemplate,
  onDirectPrint,
  onOpenAiAssistant,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedOrientation, setSelectedOrientation] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = [
    'All',
    'Corporate',
    'College',
    'Hospital',
    'Event',
    'Security',
    'Modern',
    'Minimal',
    'VIP',
    'Press',
  ];

  const filteredTemplates = useMemo(() => {
    return TEMPLATES.filter((tpl) => {
      // Category match
      if (selectedCategory !== 'All' && tpl.category !== selectedCategory) {
        return false;
      }
      // Orientation match
      if (selectedOrientation !== 'All' && tpl.orientation !== selectedOrientation) {
        return false;
      }
      // Search match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inTitle = (tpl.name || '').toLowerCase().includes(q);
        const inDesc = (tpl.description || '').toLowerCase().includes(q);
        const inCat = (tpl.category || '').toLowerCase().includes(q);
        if (!inTitle && !inDesc && !inCat) return false;
      }
      return true;
    });
  }, [selectedCategory, selectedOrientation, searchQuery]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-[#F4F0E4] p-6 sm:p-8 rounded-3xl border border-[#D4CEBA] flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-extrabold tracking-wider px-2.5 py-0.5 rounded-full bg-[#2C4F3A] text-[#FBF9F2]">
              50+ Ready Designs
            </span>
            <span className="text-xs text-[#59645C] font-semibold">ISO CR80 Compliant</span>
          </div>
          <h1 className="text-3xl font-extrabold text-[#1D3527] tracking-tight">
            ID Card Template Directory
          </h1>
          <p className="text-xs sm:text-sm text-[#59645C] max-w-xl">
            Choose from corporate, university, healthcare, VIP, and high-clearance security passes.
            Every template is 100% customizable and printable.
          </p>
        </div>

        <button
          onClick={onOpenAiAssistant}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#2C4F3A] hover:bg-[#1D3527] text-[#FBF9F2] font-bold text-xs uppercase tracking-wider shadow-sm transition-all flex-shrink-0"
        >
          <Sparkles className="w-4 h-4 text-[#DFD9C4]" />
          Gemini Style Explorer
        </button>
      </div>

      {/* Filter Controls & Search */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by title, organization, or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#D4CEBA] bg-white text-sm text-[#1F2D24] placeholder-stone-400 focus:outline-hidden focus:ring-2 focus:ring-[#2C4F3A]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-xs font-bold text-stone-400 hover:text-stone-600 absolute right-3 top-1/2 -translate-y-1/2"
              >
                Clear
              </button>
            )}
          </div>

          {/* Orientation Filter */}
          <div className="flex items-center gap-2 bg-[#F4F0E4] p-1 rounded-xl border border-[#D4CEBA]">
            {['All', 'portrait', 'landscape'].map((ori) => (
              <button
                key={ori}
                onClick={() => setSelectedOrientation(ori)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-colors ${
                  selectedOrientation === ori
                    ? 'bg-[#2C4F3A] text-[#FBF9F2]'
                    : 'text-[#1F2D24] hover:bg-black/5'
                }`}
              >
                {ori === 'All' ? 'All Orientations' : ori}
              </button>
            ))}
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-[#2C4F3A] text-[#FBF9F2] shadow-sm'
                  : 'bg-[#F4F0E4] text-[#1F2D24] hover:bg-[#DFD9C4] border border-[#D4CEBA]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Templates */}
      {filteredTemplates.length === 0 ? (
        <div className="text-center py-16 bg-[#F4F0E4]/40 rounded-3xl border border-[#D4CEBA] space-y-3">
          <CreditCard className="w-10 h-10 text-stone-400 mx-auto" />
          <h3 className="font-extrabold text-lg text-[#1D3527]">No templates matched your search</h3>
          <p className="text-xs text-[#59645C]">Try adjusting the category filter or clearing the search query</p>
          <button
            onClick={() => {
              setSelectedCategory('All');
              setSelectedOrientation('All');
              setSearchQuery('');
            }}
            className="px-4 py-2 rounded-xl bg-[#2C4F3A] text-[#FBF9F2] text-xs font-bold"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => {
            const cardState = getTemplateCardState(template);

            return (
              <div
                key={template.id}
                className="bg-[#FBF9F2] hover:bg-[#F4F0E4] p-4 rounded-3xl border border-[#D4CEBA] transition-all hover:shadow-md flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-extrabold text-[#1D3527] truncate max-w-[190px]">
                      {template.name}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#DFD9C4] text-[#2C4F3A] uppercase">
                      {template.category}
                    </span>
                  </div>

                  {/* Card Thumbnail Stage */}
                  <div className="p-3 bg-white rounded-2xl border border-[#D4CEBA] shadow-xs flex items-center justify-center min-h-[220px] w-full mb-3">
                    <CardRenderer
                      cardState={cardState}
                      side="front"
                      scale={template.orientation === 'landscape' ? 0.72 : 0.62}
                    />
                  </div>

                  <p className="text-[11px] text-[#59645C] line-clamp-1 mb-3">
                    {template.description}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-[#D4CEBA]">
                  <button
                    onClick={() => onSelectTemplate(template.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold bg-[#2C4F3A] hover:bg-[#1D3527] text-[#FBF9F2] transition-colors shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Customize in Editor
                  </button>
                  <button
                    onClick={() => onDirectPrint(template.id)}
                    className="px-3 py-2 rounded-xl text-xs font-bold bg-[#DFD9C4] hover:bg-[#D4CEBA] text-[#1D3527] transition-colors flex items-center gap-1"
                    title="Quick Print this card"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Print
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
