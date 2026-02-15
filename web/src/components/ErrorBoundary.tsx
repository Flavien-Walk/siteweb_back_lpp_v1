import React from 'react';
import { couleurs } from '../styles/theme';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error.message, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={styles.container}>
          <div style={styles.iconWrapper}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={couleurs.danger} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <h2 style={styles.title}>Oups, quelque chose a plante</h2>
          <p style={styles.message}>
            {this.state.error?.message || 'Une erreur inattendue est survenue.'}
          </p>
          <button style={styles.button} onClick={this.handleRetry}>
            Reessayer
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '2rem',
    backgroundColor: couleurs.fond,
    color: couleurs.texte,
  },
  iconWrapper: {
    width: 80,
    height: 80,
    borderRadius: '50%',
    backgroundColor: couleurs.dangerLight,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '1.5rem',
  },
  title: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: couleurs.texte,
    marginBottom: '0.5rem',
    textAlign: 'center' as const,
  },
  message: {
    fontSize: '0.875rem',
    color: couleurs.texteSecondaire,
    textAlign: 'center' as const,
    marginBottom: '2rem',
    maxWidth: 400,
    lineHeight: 1.5,
  },
  button: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    backgroundColor: couleurs.primaire,
    color: couleurs.blanc,
    border: 'none',
    padding: '0.75rem 1.5rem',
    borderRadius: 8,
    fontSize: '0.9rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
};

export default ErrorBoundary;
