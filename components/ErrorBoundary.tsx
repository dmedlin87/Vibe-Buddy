import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, Clipboard, ClipboardCheck, RefreshCw, RotateCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
  /** Optional callback when user wants to recover without full reload */
  onReset?: () => void;
  /** Optional reporter (e.g., Sentry) */
  reportError?: (error: Error, info: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  copied: boolean;
  showDetails: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    copied: false,
    showDetails: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, copied: false, showDetails: false };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    this.props.reportError?.(error, errorInfo);
  }

  private handleReset = () => {
    if (this.props.onReset) {
      this.props.onReset();
      this.setState({ hasError: false, error: null, copied: false, showDetails: false });
      return;
    }
    window.location.reload();
  };

  private copyDetails = async () => {
    const details = this.formatErrorDetails();
    try {
      await navigator.clipboard.writeText(details);
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 1500);
    } catch (err) {
      console.error('Failed to copy error details', err);
    }
  };

  private formatErrorDetails() {
    const { error } = this.state;
    if (!error) return 'No error details available.';
    return [
      `Message: ${error.message || error.toString()}`,
      error.stack ? `Stack:\n${error.stack}` : '',
    ].filter(Boolean).join('\n\n');
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
              <div className="w-full bg-black/50 p-4 rounded border border-zinc-800/50 text-left mb-6">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-red-400 font-mono break-all whitespace-pre-wrap">
                    {this.state.error.message || this.state.error.toString()}
                  </p>
                  <button
                    onClick={this.copyDetails}
                    className="flex items-center gap-1 text-[11px] px-2 py-1 border border-zinc-800 rounded hover:border-zinc-700 transition-colors"
                  >
                    {this.state.copied ? <ClipboardCheck size={14} /> : <Clipboard size={14} />}
                    {this.state.copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <button
                  onClick={() => this.setState((prev) => ({ showDetails: !prev.showDetails }))}
                  className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1 mb-2"
                >
                  <RotateCw size={12} className={this.state.showDetails ? 'rotate-90 transition-transform' : 'transition-transform'} />
                  {this.state.showDetails ? 'Hide details' : 'Show details'}
                </button>
                {this.state.showDetails && this.state.error.stack && (
                  <div className="bg-black/40 p-3 rounded border border-zinc-800/60 text-[11px] text-zinc-400 font-mono whitespace-pre overflow-x-auto max-h-48 custom-scrollbar">
                    {this.state.error.stack}
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={this.handleReset}
                className="flex items-center gap-2 px-5 py-2.5 bg-zinc-100 hover:bg-white text-zinc-900 rounded-md font-medium text-sm transition-colors shadow-lg shadow-zinc-900/20"
              >
                <RefreshCw size={16} />
                {this.props.onReset ? 'Try Again' : 'Reload Application'}
              </button>
              {this.props.onReset && (
                <button
                  onClick={() => window.location.reload()}
                  className="flex items-center gap-2 px-5 py-2.5 border border-zinc-700 hover:border-zinc-600 text-zinc-200 rounded-md font-medium text-sm transition-colors"
                >
                  <RotateCw size={16} />
                  Hard Reload
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}