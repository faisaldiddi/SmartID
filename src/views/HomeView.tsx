import React, { useState } from 'react';
import { 
  CreditCard, 
  Plus, 
  LayoutGrid, 
  Printer, 
  ShieldCheck, 
  QrCode, 
  Sliders, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  Layers, 
  FileSpreadsheet, 
  Camera,
  RotateCw
} from 'lucide-react';
import { ActiveTab } from '../components/Header';
import { CardRenderer } from '../components/CardRenderer';
import { TEMPLATES, getTemplateCardState } from '../data/templates';
import { CardState, CardSide } from '../types';

interface HomeViewProps {
  onNavigate: (tab: ActiveTab) => void;
  onSelectTemplate: (templateId: string) => void;
  onOpenAiAssistant: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onNavigate,
  onSelectTemplate,
  onOpenAiAssistant,
}) => {
  const [demoSide, setDemoSide] = useState<CardSide>('front');
  const demoTemplate = TEMPLATES[0]; // Nexus Executive
  const [demoCardState] = useState<CardState>(getTemplateCardState(demoTemplate));

  const featuredTemplates = TEMPLATES.slice(0, 6);

  const categories = [
    { name: 'Corporate & Executive', count: 12, id: 'Corporate' },
    { name: 'University & Higher Ed', count: 10, id: 'College' },
    { name: 'Hospital & Healthcare', count: 8, id: 'Hospital' },
    { name: 'VIP Pass & Conference', count: 10, id: 'Event' },
    { name: 'Security & Clearance', count: 8, id: 'Security' },
    { name: 'Tech & Creative Studio', count: 12, id: 'Modern' },
  ];

  return (
    <div className="space-y-16 pb-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-8 lg:pt-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Headline (7 Cols) */}
            <div className="lg:col-span-7 space-y-6 text-left">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#DFD9C4]/70 border border-[#D4CEBA] text-xs font-extrabold tracking-wider uppercase text-[#2C4F3A]">
                <Sparkles className="w-3.5 h-3.5 text-[#2C4F3A]" />
                <span>Level 1 Pure Frontend Studio • 100% Client-Side</span>
              </div>

              {/* Tagline & Main Title */}
              <div className="space-y-2">
                <p className="text-xs sm:text-sm font-extrabold uppercase tracking-widest text-[#52745D]">
                  CREATE • CUSTOMIZE • PRINT
                </p>
                <h1 className="font-extrabold text-4xl sm:text-5xl lg:text-6xl text-[#1D3527] tracking-tight leading-[1.1]">
                  Instant Browser ID Card Generator & Printing Studio
                </h1>
              </div>

              {/* Subtext */}
              <p className="text-base sm:text-lg text-[#1F2D24]/85 max-w-2xl leading-relaxed">
                Design and print pixel-perfect, ISO CR80 PVC identity credentials directly in your browser.
                No login, no database, zero server requirements. Complete with scannable QR codes, webcam capture,
                and physical hardware calibration for Evolis, Zebra, and A4 printers.
              </p>

              {/* Primary CTA Buttons */}
              <div className="flex flex-wrap items-center gap-3.5 pt-2">
                <button
                  id="hero-btn-create-id"
                  onClick={() => onNavigate('editor')}
                  className="flex items-center gap-2 bg-[#2C4F3A] hover:bg-[#1D3527] text-[#FBF9F2] font-extrabold text-sm sm:text-base px-7 py-3.5 rounded-2xl shadow-md hover:shadow-lg transition-all duration-200 active:scale-95"
                >
                  <Plus className="w-5 h-5 stroke-[2.5]" />
                  Create ID Card
                </button>

                <button
                  id="hero-btn-browse-templates"
                  onClick={() => onNavigate('templates')}
                  className="flex items-center gap-2 bg-[#F4F0E4] hover:bg-[#DFD9C4] text-[#1D3527] border border-[#D4CEBA] font-bold text-sm sm:text-base px-6 py-3.5 rounded-2xl transition-all duration-200"
                >
                  <LayoutGrid className="w-5 h-5 text-[#2C4F3A]" />
                  Explore 50+ Templates
                </button>

                <button
                  id="hero-btn-ai-ideas"
                  onClick={onOpenAiAssistant}
                  className="flex items-center gap-2 bg-white hover:bg-[#F4F0E4] text-[#2C4F3A] border border-[#D4CEBA] font-bold text-sm px-5 py-3.5 rounded-2xl transition-all"
                  title="Generate unique design styles with Gemini AI"
                >
                  <Sparkles className="w-4 h-4 text-[#2C4F3A]" />
                  AI Ideas
                </button>
              </div>

              {/* Privacy & Spec Checklist */}
              <div className="pt-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs text-[#1F2D24]/80">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#2C4F3A]" />
                  <span>100% Private (No Login)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Printer className="w-4 h-4 text-[#2C4F3A]" />
                  <span>CR80 PVC & A4 Formats</span>
                </div>
                <div className="flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-[#2C4F3A]" />
                  <span>Offline Scannable QR</span>
                </div>
              </div>
            </div>

            {/* Right Interactive Card Showcase (5 Cols) */}
            <div className="lg:col-span-5 flex flex-col items-center">
              <div className="bg-[#F4F0E4] p-6 sm:p-8 rounded-3xl border border-[#D4CEBA] shadow-lg flex flex-col items-center w-full max-w-md">
                <div className="w-full flex items-center justify-between mb-4">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#52745D]">
                    Live Interactive Preview
                  </span>
                  <button
                    onClick={() => setDemoSide(demoSide === 'front' ? 'back' : 'front')}
                    className="flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-lg bg-white border border-[#D4CEBA] text-[#1D3527] hover:bg-[#DFD9C4] transition-colors"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    Flip to {demoSide === 'front' ? 'Back' : 'Front'}
                  </button>
                </div>

                {/* Card Container */}
                <div className="p-2 bg-white rounded-3xl border border-[#D4CEBA] shadow-sm">
                  <CardRenderer
                    cardState={demoCardState}
                    side={demoSide}
                    scale={0.92}
                    qrDataUrl="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><rect width='100' height='100' fill='white'/><rect x='10' y='10' width='30' height='30' fill='black'/><rect x='60' y='10' width='30' height='30' fill='black'/><rect x='10' y='60' width='30' height='30' fill='black'/></svg>"
                  />
                </div>

                <div className="mt-5 w-full flex items-center justify-between pt-3 border-t border-[#D4CEBA] text-xs">
                  <div>
                    <span className="font-bold text-[#1D3527] block">Nexus Executive Card</span>
                    <span className="text-[11px] text-[#59645C]">ISO/IEC 7810 CR80 Standard</span>
                  </div>
                  <button
                    onClick={() => onSelectTemplate(demoTemplate.id)}
                    className="flex items-center gap-1 text-xs font-bold text-[#2C4F3A] hover:underline"
                  >
                    Customize This <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Category Navigation Pills */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#F4F0E4]/70 p-6 rounded-3xl border border-[#D4CEBA]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-extrabold text-[#1D3527]">Explore Templates by Category</h2>
              <p className="text-xs text-[#59645C]">Over 50 ready-to-print designs for every sector and organization</p>
            </div>
            <button
              onClick={() => onNavigate('templates')}
              className="text-xs font-bold uppercase tracking-wider text-[#2C4F3A] hover:underline flex items-center gap-1"
            >
              View All 50+ Templates <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  onNavigate('templates');
                }}
                className="p-3.5 rounded-2xl bg-white hover:bg-[#DFD9C4] border border-[#D4CEBA] text-left transition-all group"
              >
                <span className="text-xs font-bold text-[#1D3527] block group-hover:text-[#1D3527] line-clamp-1">
                  {cat.name}
                </span>
                <span className="text-[10px] font-semibold text-[#52745D]">
                  {cat.count} Designs
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Core Studio Feature Highlights */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
          <span className="text-xs font-extrabold uppercase tracking-widest text-[#52745D]">
            Crafted for Printing Precision
          </span>
          <h2 className="text-3xl font-extrabold text-[#1D3527]">
            Everything Needed to Generate Professional ID Cards
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#FBF9F2] p-6 rounded-3xl border border-[#D4CEBA] space-y-3 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-[#2C4F3A] text-[#DFD9C4] flex items-center justify-center">
              <Camera className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-lg text-[#1D3527]">Photo & Camera Studio</h3>
            <p className="text-xs text-[#59645C] leading-relaxed">
              Upload existing passport photos or capture instant headshots directly using your computer webcam.
              Includes fine zoom, rotate, and aspect crop controls.
            </p>
          </div>

          <div className="bg-[#FBF9F2] p-6 rounded-3xl border border-[#D4CEBA] space-y-3 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-[#2C4F3A] text-[#DFD9C4] flex items-center justify-center">
              <Printer className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-lg text-[#1D3527]">Printer Alignment Studio</h3>
            <p className="text-xs text-[#59645C] leading-relaxed">
              Calibrate horizontal and vertical printer offsets (-10mm to +10mm) for Evolis, Zebra, Fargo,
              or direct A4 sheet printing with 8 cards per page and cutting crop marks.
            </p>
          </div>

          <div className="bg-[#FBF9F2] p-6 rounded-3xl border border-[#D4CEBA] space-y-3 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-[#2C4F3A] text-[#DFD9C4] flex items-center justify-center">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-lg text-[#1D3527]">Bulk CSV Generation</h3>
            <p className="text-xs text-[#59645C] leading-relaxed">
              Import a CSV spreadsheet of employees or students to rapidly preview, cycle through,
              and bulk-print batches without needing an external database.
            </p>
          </div>
        </div>
      </section>

      {/* Featured Templates Showcase */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-extrabold text-[#1D3527]">Featured Designer Cards</h2>
            <p className="text-xs text-[#59645C]">Hand-crafted layouts tuned for both PVC dye-sublimation and laser printing</p>
          </div>
          <button
            onClick={() => onNavigate('templates')}
            className="text-xs font-bold uppercase tracking-wider text-[#2C4F3A] hover:underline"
          >
            All 50+ Templates →
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredTemplates.map((template) => {
            const cardState = getTemplateCardState(template);

            return (
              <div
                key={template.id}
                className="bg-[#F4F0E4]/60 hover:bg-[#F4F0E4] p-4 rounded-3xl border border-[#D4CEBA] transition-all hover:shadow-md flex flex-col items-center group"
              >
                <div className="w-full flex items-center justify-between mb-3">
                  <span className="text-xs font-extrabold text-[#1D3527] truncate max-w-[180px]">
                    {template.name}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#DFD9C4] text-[#2C4F3A] uppercase">
                    {template.category}
                  </span>
                </div>

                {/* Card Canvas Thumbnail */}
                <div className="p-2 bg-white rounded-2xl border border-[#D4CEBA] shadow-xs flex items-center justify-center min-h-[190px] w-full">
                  <CardRenderer
                    cardState={cardState}
                    side="front"
                    scale={template.orientation === 'landscape' ? 0.68 : 0.60}
                  />
                </div>

                <div className="w-full mt-4 flex items-center gap-2">
                  <button
                    onClick={() => onSelectTemplate(template.id)}
                    className="flex-1 py-2 rounded-xl text-xs font-bold bg-[#2C4F3A] hover:bg-[#1D3527] text-[#FBF9F2] transition-colors text-center shadow-xs"
                  >
                    Use Template
                  </button>
                  <button
                    onClick={() => onSelectTemplate(template.id)}
                    className="px-3 py-2 rounded-xl text-xs font-bold bg-[#DFD9C4] hover:bg-[#D4CEBA] text-[#1D3527] transition-colors"
                    title="Customize details"
                  >
                    Edit
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
