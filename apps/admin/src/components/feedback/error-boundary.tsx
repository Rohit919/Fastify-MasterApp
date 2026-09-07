import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * App-level error boundary. Catches render/runtime errors in a subtree and
 * shows a controlled fallback instead of a blank white screen (§53). A crash in
 * one feature shouldn't destroy the whole shell.
 *
 * This is a class component because React only supports error boundaries via
 * componentDidCatch / getDerivedStateFromError. It never renders a stack trace
 * to the user; details go to the console for developers.
 */
interface Props {
  children: ReactNode;
  /** Optional custom fallback. */
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Developer-facing only. In production wire this to an error reporter.
    console.error('ErrorBoundary caught an error:', error, info.componentStack);
  }

  private reset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <div>
          <h1 className="text-xl font-semibold">Something went wrong</h1>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            An unexpected error occurred while rendering this page. You can try again, or reload
            the app.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={this.reset}
            className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </button>
          <button
            type="button"
            onClick={() => window.location.assign('/')}
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}
