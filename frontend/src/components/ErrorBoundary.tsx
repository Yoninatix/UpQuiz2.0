import { Component, ErrorInfo, ReactNode } from 'react';

interface Props { children: ReactNode; }
interface State { error: Error | null; }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="bg-white border border-red-200 rounded-2xl p-8 max-w-lg w-full shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-red-600 text-lg font-bold">!</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900">Something went wrong</h1>
                <p className="text-sm text-slate-500">A rendering error occurred</p>
              </div>
            </div>
            <div className="bg-slate-900 rounded-xl p-4 text-xs font-mono text-red-400 overflow-auto max-h-64">
              <p className="text-slate-300 font-semibold mb-1">{this.state.error.name}</p>
              <p className="text-red-300">{this.state.error.message}</p>
              {this.state.error.stack && (
                <pre className="text-slate-400 mt-2 whitespace-pre-wrap text-xs leading-relaxed">
                  {this.state.error.stack.split('\n').slice(1, 8).join('\n')}
                </pre>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-4">
              Open DevTools (F12 → Console) for the full stack trace.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 w-full py-2 px-4 bg-slate-800 text-white text-sm rounded-xl hover:bg-slate-700 transition-colors"
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
