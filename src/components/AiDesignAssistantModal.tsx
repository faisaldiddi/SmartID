import React, { useState } from 'react';
import { Sparkles, Palette, RefreshCw, X, Check, Lightbulb } from 'lucide-react';
import { ColorScheme, PatternType } from '../types';

interface AiIdeaResult {
  themeName?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  textColor?: string;
  backgroundColor?: string;
  pattern?: PatternType;
  fontFamily?: string;
  headerStyle?: string;
  footerStyle?: string;
  layoutStyle?: 'portrait' | 'landscape';
  suggestedFields?: string[];
  designTips?: string[];
}

interface AiDesignAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyTheme: (colors: ColorScheme, pattern: PatternType, fontFamily: string) => void;
  currentCategory?: string;
}

export const AiDesignAssistantModal: React.FC<AiDesignAssistantModalProps> = ({
  isOpen,
  onClose,
  onApplyTheme,
  currentCategory = 'Corporate',
}) => {
  const [category, setCategory] = useState(currentCategory);
  const [promptQuery, setPromptQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [ideaResult, setIdeaResult] = useState<AiIdeaResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const presetQueries = [
    'Ultra-modern FinTech executive in navy and neon mint',
    'Minimalist Swiss architectural credential with high contrast',
    'Regal university research fellowship in burgundy and gold',
    'Cybersecurity incident response badge in obsidian and cyan',
    'Eco-friendly botanical research pass in olive and sage',
  ];

  const handleGenerate = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/gemini/design-ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          query: promptQuery || 'distinctive, highly professional modern ID card styling',
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to communicate with Gemini design service.');
      }

      setIdeaResult(data.idea);
    } catch (err: any) {
      console.error('Gemini design assistant error:', err);
      setErrorMsg(err.message || 'Could not generate design idea. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!ideaResult) return;
    const colors: ColorScheme = {
      primary: ideaResult.primaryColor || '#1E293B',
      secondary: ideaResult.secondaryColor || '#059669',
      accent: ideaResult.accentColor || '#34D399',
      background: ideaResult.backgroundColor || '#FFFFFF',
      textDark: ideaResult.textColor || '#0F172A',
      textLight: '#FFFFFF',
      headerBg: ideaResult.primaryColor || '#1E293B',
      footerBg: ideaResult.backgroundColor || '#F8FAFC',
    };

    const validPatterns: PatternType[] = ['none', 'solid', 'gradient', 'wave', 'geometric', 'dots', 'lines', 'abstract'];
    const pattern = validPatterns.includes(ideaResult.pattern as any) 
      ? (ideaResult.pattern as PatternType) 
      : 'geometric';

    const fontFamily = ideaResult.fontFamily || 'Plus Jakarta Sans';

    onApplyTheme(colors, pattern, fontFamily);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-[#FBF9F2] rounded-3xl border border-[#D4CEBA] shadow-2xl max-w-xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#D4CEBA] flex items-center justify-between bg-[#F4F0E4]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#2C4F3A] text-[#DFD9C4]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-[#1D3527]">Gemini Design Assistant</h3>
              <p className="text-xs text-[#59645C]">Explore unique ID card design aesthetics and palettes</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-[#DFD9C4] text-[#1F2D24] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Controls */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#59645C] mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#D4CEBA] bg-white text-sm font-medium text-[#1F2D24] focus:outline-hidden focus:ring-2 focus:ring-[#2C4F3A]"
              >
                <option value="Corporate">Corporate & Executive</option>
                <option value="College">University & Higher Ed</option>
                <option value="Hospital">Hospital & Medical Care</option>
                <option value="Event">VIP & Tech Conference Pass</option>
                <option value="Security">Security & High Clearance Badge</option>
                <option value="Modern">Cyberpunk & Digital Tech</option>
                <option value="Minimal">Minimalist Swiss Design</option>
                <option value="Premium">Luxury & Gold Sovereign</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#59645C] mb-1">
                Describe the Vibe or Style (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Deep emerald and brushed bronze with clean sans-serif typography"
                value={promptQuery}
                onChange={(e) => setPromptQuery(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#D4CEBA] bg-white text-sm text-[#1F2D24] placeholder-stone-400 focus:outline-hidden focus:ring-2 focus:ring-[#2C4F3A]"
              />
            </div>

            {/* Quick Inspiration Pills */}
            <div>
              <span className="text-[11px] font-semibold text-[#59645C] block mb-1.5">Try asking for:</span>
              <div className="flex flex-wrap gap-1.5">
                {presetQueries.map((pq, i) => (
                  <button
                    key={i}
                    onClick={() => setPromptQuery(pq)}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-[#F4F0E4] hover:bg-[#DFD9C4] text-[#1D3527] border border-[#D4CEBA] transition-colors text-left"
                  >
                    {pq}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-[#FBF9F2] bg-[#2C4F3A] hover:bg-[#1D3527] disabled:opacity-50 transition-colors shadow-sm"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Generating Design Ideas with Gemini...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Unique Design
                </>
              )}
            </button>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800">
              {errorMsg}
            </div>
          )}

          {/* AI Result Showcase */}
          {ideaResult && (
            <div className="p-5 rounded-2xl bg-[#F4F0E4] border border-[#D4CEBA] space-y-4">
              <div className="flex items-center justify-between border-b border-[#D4CEBA] pb-3">
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-bold text-[#59645C]">Generated Concept</span>
                  <h4 className="text-base font-extrabold text-[#1D3527]">{ideaResult.themeName || 'Custom Aesthetic'}</h4>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full bg-[#2C4F3A] text-[#FBF9F2] font-semibold">
                  {ideaResult.pattern || 'geometric'} pattern
                </span>
              </div>

              {/* Color Swatches */}
              <div>
                <span className="text-xs font-bold text-[#1F2D24] block mb-2">Palette Harmonies:</span>
                <div className="grid grid-cols-4 gap-2">
                  <div className="flex flex-col items-center">
                    <div 
                      className="w-full h-9 rounded-lg border border-black/10 shadow-xs" 
                      style={{ backgroundColor: ideaResult.primaryColor }} 
                    />
                    <span className="text-[10px] font-mono mt-1 text-stone-600">{ideaResult.primaryColor}</span>
                    <span className="text-[9px] text-stone-400">Primary</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div 
                      className="w-full h-9 rounded-lg border border-black/10 shadow-xs" 
                      style={{ backgroundColor: ideaResult.secondaryColor }} 
                    />
                    <span className="text-[10px] font-mono mt-1 text-stone-600">{ideaResult.secondaryColor}</span>
                    <span className="text-[9px] text-stone-400">Secondary</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div 
                      className="w-full h-9 rounded-lg border border-black/10 shadow-xs" 
                      style={{ backgroundColor: ideaResult.accentColor }} 
                    />
                    <span className="text-[10px] font-mono mt-1 text-stone-600">{ideaResult.accentColor}</span>
                    <span className="text-[9px] text-stone-400">Accent</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div 
                      className="w-full h-9 rounded-lg border border-black/10 shadow-xs" 
                      style={{ backgroundColor: ideaResult.backgroundColor }} 
                    />
                    <span className="text-[10px] font-mono mt-1 text-stone-600">{ideaResult.backgroundColor}</span>
                    <span className="text-[9px] text-stone-400">Background</span>
                  </div>
                </div>
              </div>

              {/* Typography & Tips */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 rounded-xl bg-white border border-[#D4CEBA]">
                  <span className="text-[10px] uppercase font-bold text-stone-400 block">Recommended Font</span>
                  <span className="font-bold text-[#1D3527]">{ideaResult.fontFamily || 'Plus Jakarta Sans'}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-[#D4CEBA]">
                  <span className="text-[10px] uppercase font-bold text-stone-400 block">Layout Archetype</span>
                  <span className="font-bold text-[#1D3527] capitalize">{ideaResult.layoutStyle || 'portrait'}</span>
                </div>
              </div>

              {ideaResult.designTips && ideaResult.designTips.length > 0 && (
                <div className="space-y-1 text-xs text-stone-700 bg-white/70 p-3 rounded-xl border border-[#D4CEBA]">
                  <span className="font-bold text-[#1D3527] flex items-center gap-1.5 mb-1">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-600" /> Designer Tips:
                  </span>
                  {ideaResult.designTips.map((tip, idx) => (
                    <p key={idx} className="text-[11px] leading-relaxed">• {tip}</p>
                  ))}
                </div>
              )}

              <button
                onClick={handleApply}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-[#FBF9F2] bg-[#2C4F3A] hover:bg-[#1D3527] transition-all shadow-md"
              >
                <Palette className="w-4 h-4" />
                Apply Theme to Current Card
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
