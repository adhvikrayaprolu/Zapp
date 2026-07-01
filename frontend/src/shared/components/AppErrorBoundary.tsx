import * as React from "react";

type State = { error: Error | null };

/**
 * Catches render errors so a failed import or component tree still shows diagnostics
 * instead of a blank page (default empty #root on white body).
 */
export class AppErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("AppErrorBoundary:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--app-color-background-canvas)] p-8 font-sans text-[var(--app-color-text-primary)]">
          <p className="text-xs font-black uppercase tracking-widest text-[var(--app-color-status-danger)]">Something went wrong</p>
          <pre className="mt-4 max-w-2xl whitespace-pre-wrap rounded-2xl border border-[color:color-mix(in_srgb,var(--app-color-status-danger)_32%,transparent)] bg-[var(--app-color-surface-inset)] p-4 text-sm text-[var(--app-color-text-secondary)]">
            {this.state.error.message}
          </pre>
          <button
            type="button"
            className="mt-6 rounded-xl border border-[var(--app-color-border-strong)] px-4 py-2 text-sm font-bold transition-colors hover:bg-[var(--app-color-surface-inset)]"
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
