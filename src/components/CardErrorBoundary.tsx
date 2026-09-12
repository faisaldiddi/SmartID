import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ShieldAlert } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class CardErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[SmartID ErrorBoundary] Uncaught rendering error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#173B2A] text-white flex flex-col items-center justify-between p-6 select-none">
          <header className="w-full text-center pt-3">
            <div className="text-sm font-black tracking-widest uppercase text-[#E7DEC8]">
              SmartID
            </div>
          </header>

          <main className="w-full max-w-sm bg-[#FBF9F2] text-[#173B2A] rounded-3xl border border-red-200 shadow-2xl p-7 text-center space-y-3.5 my-auto">
            <div className="w-13 h-13 mx-auto rounded-2xl bg-red-100 border border-red-200 flex items-center justify-center text-red-600 shadow-xs">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <h2 className="text-base font-black text-red-700 tracking-tight uppercase">
              Unable to display this ID card
            </h2>
            <p className="text-xs text-stone-600 leading-relaxed">
              An unexpected error occurred while rendering the digital credential.
            </p>
          </main>

          <footer className="w-full text-center pb-4">
            <p className="text-xs text-stone-400 tracking-wide font-medium">
              Verified using SmartID
            </p>
          </footer>
        </div>
      );
    }

    return this.props.children;
  }
}
