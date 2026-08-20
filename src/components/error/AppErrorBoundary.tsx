import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

const IS_DEV = import.meta.env.DEV;

export class AppErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private hasLogged = false;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    if (!this.hasLogged) {
      console.error('[AppErrorBoundary] Uncaught error:', error, errorInfo.componentStack);
      this.hasLogged = true;
    }
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
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
            padding: '24px',
          }}
        >
          <div
            style={{
              maxWidth: 480,
              width: '100%',
              textAlign: 'center',
              padding: '40px 32px',
              border: '1px solid #1a2336',
              borderRadius: 16,
              background: '#0e1422',
            }}
          >
            {/* Icon */}
            <div
              style={{
                width: 56,
                height: 56,
                margin: '0 auto 20px',
                borderRadius: 12,
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
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
                fontSize: 18,
                fontWeight: 800,
                letterSpacing: '0.05em',
                margin: '0 0 8px',
                color: '#f1f5f9',
              }}
            >
              AUTOFLOW — LỖI HỆ THỐNG
            </h1>

            <p
              style={{
                fontSize: 12,
                color: '#94a3b8',
                margin: '0 0 24px',
                lineHeight: 1.6,
              }}
            >
              Một thành phần giao diện đã gặp lỗi không mong muốn.
              <br />
              Vui lòng tải lại trang để tiếp tục sử dụng.
            </p>

            {/* Dev-only error detail */}
            {IS_DEV && this.state.error && (
              <div
                style={{
                  textAlign: 'left',
                  padding: '12px 16px',
                  marginBottom: 24,
                  borderRadius: 8,
                  background: '#070a12',
                  border: '1px solid #2a3854',
                  fontSize: 10,
                  lineHeight: 1.7,
                  color: '#ef4444',
                  overflowX: 'auto',
                  maxHeight: 160,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                <div style={{ color: '#64748b', marginBottom: 4, fontWeight: 600 }}>
                  [DEV] Error Details:
                </div>
                {this.state.error.name}: {this.state.error.message}
                {this.state.error.stack && (
                  <>
                    {'\n\n'}
                    <span style={{ color: '#64748b' }}>{this.state.error.stack}</span>
                  </>
                )}
              </div>
            )}

            <button
              onClick={this.handleReload}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 28px',
                borderRadius: 8,
                border: 'none',
                background: '#4f46e5',
                color: '#ffffff',
                fontSize: 12,
                fontWeight: 700,
                fontFamily: 'inherit',
                letterSpacing: '0.04em',
                cursor: 'pointer',
                transition: 'background 180ms ease',
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLButtonElement).style.background = '#4338ca';
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLButtonElement).style.background = '#4f46e5';
              }}
            >
              ↻ Tải lại trang
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
