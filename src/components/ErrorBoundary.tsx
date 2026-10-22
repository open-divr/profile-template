import { Component, type ErrorInfo, type ReactNode } from 'react';
import { errorFields, log } from '../log';

interface Props {
  /** Where the error is reported (the SDK forwards it to the platform's error telemetry). */
  onError: (error: unknown) => void;
  children: ReactNode;
}

/** Keeps one broken section from blanking the whole profile; shows a reload button instead. */
export class ErrorBoundary extends Component<Props, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  override componentDidCatch(error: unknown, info: ErrorInfo): void {
    log('error', 'profile.render', 'render failed', { ...errorFields(error), componentStack: info.componentStack?.slice(0, 2000), recovery: 'showed the reload fallback' });
    try {
      this.props.onError(error);
    } catch (reportErr) {
      log('warn', 'profile.render', 'error report failed', { ...errorFields(reportErr), recovery: 'none; the fallback is still shown' });
    }
  }

  override render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert" className="panel p-5 text-center">
        <p className="font-bold">This part of the profile could not be shown.</p>
        <button type="button" className="btn-secondary mt-3" onClick={() => this.setState({ failed: false })}>
          Try again
        </button>
      </div>
    );
  }
}
