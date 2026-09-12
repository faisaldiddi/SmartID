import React, { useState } from 'react';
import { 
  CreditCard, 
  Plus, 
  LayoutGrid, 
  Printer, 
  FolderHeart, 
  Menu, 
  X,
  Sparkles
} from 'lucide-react';

export type ActiveTab = 'home' | 'editor' | 'templates' | 'quickprint' | 'mydesigns';

interface HeaderProps {
  activeTab: ActiveTab;
  onNavigate: (tab: ActiveTab) => void;
  onOpenAiAssistant?: () => void;
  savedCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onNavigate,
  onOpenAiAssistant,
  savedCount = 0,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'home' as ActiveTab, label: 'Home' },
    { id: 'editor' as ActiveTab, label: 'Create ID' },
    { id: 'templates' as ActiveTab, label: 'Templates' },
    { id: 'quickprint' as ActiveTab, label: 'Quick Print' },
    { 
      id: 'mydesigns' as ActiveTab, 
      label: 'My Designs',
      badge: savedCount > 0 ? savedCount : undefined 
    },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#FBF9F2]/95 backdrop-blur-md border-b border-[#D4CEBA] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo & Brand */}
          <div 
            id="smartid-logo-brand" 
            onClick={() => onNavigate('home')} 
            className="flex items-center gap-3.5 cursor-pointer group"
          >
            <div className="w-11 h-11 rounded-xl bg-[#2C4F3A] flex items-center justify-center text-[#DFD9C4] shadow-sm transition-transform duration-200 group-hover:scale-105">
              <CreditCard className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-2xl tracking-tight text-[#1D3527]">SmartID</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#DFD9C4]/60 text-[#2C4F3A] border border-[#D4CEBA]/70">Studio</span>
              </div>
              <p className="text-[10px] tracking-widest font-semibold uppercase text-[#59645C]">
                CREATE • CUSTOMIZE • PRINT
              </p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1.5 bg-[#F4F0E4]/80 p-1.5 rounded-2xl border border-[#D4CEBA]">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-link-${item.id}`}
                  onClick={() => onNavigate(item.id)}
                  className={`relative px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-150 flex items-center gap-2 ${
                    isActive
                      ? 'bg-[#2C4F3A] text-[#FBF9F2] shadow-sm'
                      : 'text-[#1F2D24] hover:text-[#1D3527] hover:bg-[#DFD9C4]/50'
                  }`}
                >
                  {item.label}
                  {item.badge !== undefined && (
                    <span
                      className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold ${
                        isActive
                          ? 'bg-[#DFD9C4] text-[#1D3527]'
                          : 'bg-[#2C4F3A] text-[#FBF9F2]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Action Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {onOpenAiAssistant && (
              <button
                id="btn-ai-assistant-nav"
                onClick={onOpenAiAssistant}
                className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-[#2C4F3A] bg-[#DFD9C4]/50 hover:bg-[#DFD9C4] border border-[#D4CEBA] rounded-xl transition-all"
                title="Search unique ID design styles with Gemini AI"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#2C4F3A]" />
                AI Ideas
              </button>
            )}

            <button
              id="btn-primary-create-id"
              onClick={() => onNavigate('editor')}
              className="flex items-center gap-2 bg-[#2C4F3A] hover:bg-[#1D3527] text-[#FBF9F2] font-semibold text-sm px-5 py-2.5 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              Create ID
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <div className="flex md:hidden items-center gap-2">
            <button
              id="btn-mobile-menu"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2.5 rounded-xl text-[#1F2D24] bg-[#F4F0E4] border border-[#D4CEBA]"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#D4CEBA] bg-[#FBF9F2] px-4 pt-3 pb-5 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onNavigate(item.id);
                setMobileMenuOpen(false);
              }}
              className={`w-full text-left px-4 py-2.5 rounded-xl font-medium text-sm flex items-center justify-between ${
                activeTab === item.id
                  ? 'bg-[#2C4F3A] text-[#FBF9F2]'
                  : 'text-[#1F2D24] hover:bg-[#F4F0E4]'
              }`}
            >
              <span>{item.label}</span>
              {item.badge !== undefined && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#DFD9C4] text-[#1D3527] font-bold">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
          <div className="pt-2 flex flex-col gap-2">
            {onOpenAiAssistant && (
              <button
                onClick={() => {
                  onOpenAiAssistant();
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-xs uppercase tracking-wider text-[#2C4F3A] bg-[#DFD9C4]/60 border border-[#D4CEBA]"
              >
                <Sparkles className="w-4 h-4" />
                Gemini Design Ideas
              </button>
            )}
            <button
              onClick={() => {
                onNavigate('editor');
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm bg-[#2C4F3A] text-[#FBF9F2]"
            >
              <Plus className="w-4 h-4" />
              Create ID
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
