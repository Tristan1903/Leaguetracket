import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
    this.handleReset = this.handleReset.bind(this);
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, info);
  }

  handleReset() {
    this.setState({ hasError: false, error: null });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center p-12 text-center border border-red-500/20 bg-red-500/5 rounded-2xl max-w-lg mx-auto my-8">
          <AlertTriangle className="h-10 w-10 text-red-400 mb-4" />
          <h3 className="font-display font-black text-white tracking-tight text-base uppercase">
            Rites of War Interrupted
          </h3>
          <p className="text-xs text-zinc-400 mt-2 max-w-sm leading-relaxed">
            The arcane weave has fractured. A critical error occurred in this panel.
          </p>
          {this.state.error && (
            <p className="text-[10px] font-mono text-red-400/70 mt-3 bg-red-950/30 px-3 py-2 rounded border border-red-900/30 max-w-full overflow-auto">
              {this.state.error.message}
            </p>
          )}
          <button
            onClick={this.handleReset}
            className="mt-5 px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs tracking-wider transition cursor-pointer flex items-center gap-1.5"
          >
            <RefreshCw className="h-4 w-4" /> Restore the Realms
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
