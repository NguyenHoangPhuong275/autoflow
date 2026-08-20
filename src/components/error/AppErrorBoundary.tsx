import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  showDetails: boolean;
  copied: boolean;
}

const IS_DEV = import.meta.env.DEV;

export class AppErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: IS_DEV,
      copied: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    this.setState({ errorInfo });

    console.error(
      '[AppErrorBoundary] Uncaught component exception:',
      '\nMessage:', error.message,
      '\nStack:', error.stack,
      '\nComponent Stack:', errorInfo.componentStack
    );

    if (this.props.onError) {
      try {
        this.props.onError(error, errorInfo);
      } catch (err) {
        console.error('[AppErrorBoundary] Error in custom onError handler:', err);
      }
    }
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  private handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: IS_DEV,
      copied: false,
    });
  };

  private handleToggleDetails = (): void => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  private handleCopyError = async (): Promise<void> => {
    const { error, errorInfo } = this.state;
    const errorReport = [
      `=== AUTOFLOW ERROR REPORT ===`,
      `Time: ${new Date().toISOString()}`,
      `URL: ${window.location.href}`,
      `Error: ${error?.name}: ${error?.message}`,
      `\n--- Stack Trace ---`,
      error?.stack || '(No stack trace available)',
      `\n--- Component Stack ---`,
      errorInfo?.componentStack || '(No component stack available)',
    ].join('\n');

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(errorReport);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = errorReport;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2500);
    } catch (copyErr) {
      console.warn('[AppErrorBoundary] Failed to copy error to clipboard:', copyErr);
    }
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, errorInfo, showDetails, copied } = this.state;

      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#080c14',
            color: '#f1f5f9',
            fontFamily: "'JetBrains Mono', monospace, -apple-system, sans-serif",
            padding: '20px',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              maxWidth: 560,
              width: '100%',
              textAlign: 'center',
              padding: '36px 28px',
              border: '1px solid #1a2336',
              borderRadius: 16,
              background: '#0e1422',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                margin: '0 auto 16px',
                borderRadius: 12,
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24,
              }}
            >
              ⚠️
            </div>

            <h1
              style={{
                fontSize: 17,
                fontWeight: 800,
                letterSpacing: '0.04em',
                margin: '0 0 8px',
                color: '#f8fafc',
              }}
            >
              AUTOFLOW — LỖI GIAO DIỆN
            </h1>

            <p
              style={{
                fontSize: 12,
                color: '#94a3b8',
                margin: '0 0 20px',
                lineHeight: 1.6,
              }}
            >
              Một thành phần giao diện vừa gặp ngoại lệ không mong muốn.
              <br />
              Dữ liệu của bạn không bị mất, bạn có thể thử khôi phục hoặc tải lại trang.
            </p>

            {error && (
              <div
                style={{
                  textAlign: 'left',
                  marginBottom: 20,
                  borderRadius: 8,
                  background: '#070a12',
                  border: '1px solid #1e2a42',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: '#101726',
                    borderBottom: showDetails ? '1px solid #1e2a42' : 'none',
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#e2e8f0',
                  }}
                >
                  <span style={{ color: '#f87171' }}>
                    {error.name}: {error.message}
                  </span>
                  <button
                    onClick={this.handleToggleDetails}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#38bdf8',
                      fontSize: 10,
                      cursor: 'pointer',
                      padding: '2px 6px',
                    }}
                  >
                    {showDetails ? 'Thu gọn ▲' : 'Chi tiết ▼'}
                  </button>
                </div>

                {showDetails && (
                  <div
                    style={{
                      padding: '12px 14px',
                      fontSize: 10,
                      lineHeight: 1.65,
                      color: '#ef4444',
                      maxHeight: 180,
                      overflowY: 'auto',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {error.stack && (
                      <div>
                        <div style={{ color: '#64748b', fontWeight: 600, marginBottom: 2 }}>
                          Stack Trace:
                        </div>
                        <span style={{ color: '#cbd5e1' }}>{error.stack}</span>
                      </div>
                    )}
                    {errorInfo?.componentStack && (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ color: '#64748b', fontWeight: 600, marginBottom: 2 }}>
                          Component Stack:
                        </div>
                        <span style={{ color: '#94a3b8' }}>{errorInfo.componentStack}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                flexWrap: 'wrap',
              }}
            >
              <button
                onClick={this.handleReload}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '9px 20px',
                  borderRadius: 8,
                  border: 'none',
                  background: '#4f46e5',
                  color: '#ffffff',
                  fontSize: 11,
                  fontWeight: 700,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                }}
              >
                ↻ Tải lại trang
              </button>

              <button
                onClick={this.handleReset}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '9px 16px',
                  borderRadius: 8,
                  border: '1px solid #2a3854',
                  background: '#131b2e',
                  color: '#cbd5e1',
                  fontSize: 11,
                  fontWeight: 600,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                }}
              >
                Thử khôi phục
              </button>

              <button
                onClick={this.handleCopyError}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '9px 14px',
                  borderRadius: 8,
                  border: '1px solid #1e2a42',
                  background: '#090d16',
                  color: copied ? '#34d399' : '#94a3b8',
                  fontSize: 11,
                  fontWeight: 600,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                }}
              >
                {copied ? '✓ Đã chép' : '📋 Chép lỗi'}
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
