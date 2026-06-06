import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("App Crash:", error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
              borderRadius: 20,
              padding: 30,
              textAlign: 'center',
              maxWidth: 400
            }}
          >
            <h2 style={{ marginBottom: 10 }}>Something went wrong</h2>
            <p style={{ fontSize: 12, color: 'var(--txt-muted)' }}>
              The app crashed. Reload to continue.
            </p>

            <button
              onClick={this.handleReload}
              style={{
                marginTop: 20,
                padding: '10px 16px',
                borderRadius: 10,
                border: '1px solid var(--card-border)',
                background: 'var(--accent-indian-dim)',
                cursor: 'pointer'
              }}
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}