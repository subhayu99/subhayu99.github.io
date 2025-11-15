import { Component, ReactNode, ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error Boundary caught error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
    });
    // Reload the page to reset everything
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-terminal-black flex items-center justify-center p-4">
          <div className="max-w-2xl w-full">
            <div className="border border-terminal-red p-6 rounded-lg shadow-[0_0_20px_rgba(255,0,0,0.3)]">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-4xl">💥</span>
                <h1 className="text-2xl font-bold text-terminal-red">
                  Terminal Crashed
                </h1>
              </div>

              <div className="bg-terminal-black/50 border border-terminal-red/30 p-4 rounded mb-4">
                <p className="text-terminal-red font-mono text-sm mb-2">
                  Error: {this.state.error?.message || 'Unknown error occurred'}
                </p>
                {this.state.error?.stack && (
                  <pre className="text-terminal-green/70 font-mono text-xs overflow-x-auto">
                    {this.state.error.stack}
                  </pre>
                )}
              </div>

              <div className="space-y-3">
                <p className="text-terminal-green">
                  Don't worry! You can try these options:
                </p>
                <ul className="list-disc list-inside text-terminal-green/80 space-y-1 ml-2">
                  <li>Click the button below to reload the terminal</li>
                  <li>Clear your browser cache and cookies</li>
                  <li>If the problem persists, check the browser console for more details</li>
                </ul>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={this.handleReset}
                  className="px-6 py-2 bg-terminal-green text-terminal-black font-semibold rounded hover:bg-terminal-bright-green transition-colors"
                >
                  🔄 Reload Terminal
                </button>
                <button
                  onClick={() => window.location.href = '/'}
                  className="px-6 py-2 border border-terminal-green text-terminal-green rounded hover:bg-terminal-green/10 transition-colors"
                >
                  🏠 Go Home
                </button>
              </div>

              <div className="mt-6 pt-6 border-t border-terminal-green/20">
                <p className="text-terminal-green/60 text-sm">
                  If you keep seeing this error, please report it to the developer.
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
