import React, { Component, ErrorInfo, ReactNode } from "react";

interface State {
  error: Error | null;
}

class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Log to console for now (Dev can replace with Sentry, etc.)
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary]", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-red-50">
          <div className="max-w-xl bg-white rounded-lg p-6 shadow">
            <h2 className="text-lg font-bold mb-2">Something went wrong</h2>
            <pre className="text-xs text-red-700 mb-4">{this.state.error?.message}</pre>
            <div className="flex gap-2">
              <button onClick={() => window.location.reload()} className="px-3 py-2 bg-primary text-white rounded">Reload</button>
              <button onClick={() => this.setState({ error: null })} className="px-3 py-2 border rounded">Dismiss</button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children as JSX.Element;
  }
}

export default ErrorBoundary;
