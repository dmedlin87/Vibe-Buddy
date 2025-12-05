import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen bg-zinc-950 flex flex-col items-center justify-center text-zinc-300 p-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 max-w-lg w-full shadow-2xl flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-red-900/20 rounded-full flex items-center justify-center mb-6">
              <AlertTriangle className="text-red-500" size={32} />
            </div>
            
            <h1 className="text-xl font-bold text-zinc-100 mb-2">Something went wrong</h1>
            <p className="text-zinc-500 text-sm mb-6">
              The application encountered an unexpected error.
            </p>
            
            {this.state.error && (
              <div className="w-full bg-black/50 p-4 rounded border border-zinc-800/50 text-left mb-6 overflow-auto max-h-48 custom-scrollbar">
                <code className="text-xs text-red-400 font-mono break-all whitespace-pre-wrap">
                  {this.state.error.message || this.state.error.toString()}
                </code>
                {this.state.error.stack && (
                   <div className="mt-2 text-[10px] text-zinc-600 font-mono whitespace-pre overflow-x-auto">
                      {this.state.error.stack.split('\n').slice(0, 3).join('\n')}...
                   </div>
                )}
              </div>
            )}

            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 px-5 py-2.5 bg-zinc-100 hover:bg-white text-zinc-900 rounded-md font-medium text-sm transition-colors shadow-lg shadow-zinc-900/20"
            >
              <RefreshCw size={16} />
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}