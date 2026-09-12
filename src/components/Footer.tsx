import React from 'react';
import { CreditCard, Printer, Sparkles, ShieldCheck } from 'lucide-react';
import { ActiveTab } from './Header';

interface FooterProps {
  onNavigate: (tab: ActiveTab) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="bg-[#1D3527] text-[#DFD9C4] border-t border-[#2C4F3A] site-footer no-print mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand & Purpose */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#2C4F3A] flex items-center justify-center text-[#DFD9C4] border border-[#52745D]/40">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <span className="font-extrabold text-2xl tracking-tight text-[#FBF9F2]">SmartID</span>
                <p className="text-[11px] font-bold tracking-widest text-[#DFD9C4]/80 uppercase">
                  CREATE • CUSTOMIZE • PRINT
                </p>
              </div>
            </div>
            <p className="text-sm text-[#DFD9C4]/80 max-w-md leading-relaxed">
              Create professional ID cards instantly in your browser. Standard CR80 PVC & A4 printing formats,
              high-resolution PDF exports, scannable QR codes, and 50+ hand-crafted designer templates.
            </p>
            <div className="flex items-center gap-2 text-xs text-[#DFD9C4]/70 pt-1">
              <ShieldCheck className="w-4 h-4 text-[#DFD9C4]" />
              <span>100% Client-Side Privacy: No login, no cloud databases, all data stays in your browser.</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs uppercase font-extrabold tracking-wider text-[#FBF9F2] mb-4">
              Quick Links
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button 
                  onClick={() => onNavigate('home')} 
                  className="hover:text-[#FBF9F2] transition-colors text-left"
                >
                  Home
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onNavigate('editor')} 
                  className="hover:text-[#FBF9F2] transition-colors text-left"
                >
                  Create ID
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onNavigate('templates')} 
                  className="hover:text-[#FBF9F2] transition-colors text-left"
                >
                  Templates (50+)
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onNavigate('quickprint')} 
                  className="hover:text-[#FBF9F2] transition-colors text-left"
                >
                  Quick Print Studio
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onNavigate('mydesigns')} 
                  className="hover:text-[#FBF9F2] transition-colors text-left"
                >
                  My Saved Designs
                </button>
              </li>
            </ul>
          </div>

          {/* Card Dimensions & Specifications */}
          <div>
            <h4 className="text-xs uppercase font-extrabold tracking-wider text-[#FBF9F2] mb-4">
              Standards & Formats
            </h4>
            <div className="space-y-3 text-xs text-[#DFD9C4]/80">
              <div className="bg-[#2C4F3A]/60 p-3 rounded-xl border border-[#52745D]/30 space-y-1">
                <div className="font-bold text-[#FBF9F2]">CR80 Physical Dimension:</div>
                <div>85.60 mm × 53.98 mm (3.375″ × 2.125″)</div>
                <div className="text-[10px] text-[#DFD9C4]/60">ISO/IEC 7810 Standard Format</div>
              </div>
              <p className="text-[11px] leading-relaxed">
                Compatible with all thermal PVC card printers (Evolis, Zebra, Fargo, Datacard) and standard inkjet/laser A4 sheets.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-[#2C4F3A] mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-[#DFD9C4]/60 gap-4">
          <p>© {new Date().getFullYear()} SmartID Studio. All rights reserved. Built with SmartID.</p>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1 text-[#DFD9C4]/80">
              <Printer className="w-3.5 h-3.5" /> Direct Browser Printing Ready
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
