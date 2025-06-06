import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Bug, Home } from 'lucide-react';
import { router } from '@inertiajs/react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  level?: 'page' | 'component' | 'action';
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

/**
 * React 19 Enhanced Error Boundary with retry logic and detailed reporting
 */
export class React19ErrorBoundary extends Component<Props, State> {
  private retryTimeoutId: number | null = null;
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });

    // Enhanced error reporting for React 19
    this.reportError(error, errorInfo);
    
    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
  }

  private reportError = (error: Error, errorInfo: ErrorInfo) => {
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      level: this.props.level || 'component',
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      retryCount: this.state.retryCount,
    };

    // Send to Laravel backend for logging
    fetch('/api/errors/client', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify(errorReport),
    }).catch(() => {
      // Fallback: log to console if reporting fails
      console.error('Failed to report error:', errorReport);
    });

    // Development mode: show detailed error in console
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 React 19 Error Boundary');
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.error('Props:', this.props);
      console.error('State:', this.state);
      console.groupEnd();
    }
  };

  private handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1,
      }));
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    router.visit('/dashboard');
  };

  private getErrorLevel = () => {
    const { level = 'component' } = this.props;
    return {
      page: { 
        title: 'Erreur de page', 
        description: 'La page a rencontré une erreur critique',
        icon: AlertTriangle,
        color: 'destructive' as const
      },
      component: { 
        title: 'Erreur de composant', 
        description: 'Un composant a rencontré une erreur',
        icon: Bug,
        color: 'secondary' as const  
      },
      action: { 
        title: 'Erreur d\\'action', 
        description: 'L\\'action demandée a échoué',
        icon: RefreshCw,
        color: 'outline' as const
      },
    }[level];
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const errorLevel = this.getErrorLevel();
      const canRetry = this.state.retryCount < this.maxRetries;
      const IconComponent = errorLevel.icon;

      // Enhanced React 19 error UI
      return (
        <Card className=\"border-destructive/50 bg-destructive/5 max-w-lg mx-auto mt-8\">
          <CardHeader>
            <CardTitle className=\"flex items-center gap-2 text-destructive\">
              <IconComponent className=\"h-5 w-5\" />
              {errorLevel.title}
            </CardTitle>
          </CardHeader>
          <CardContent className=\"space-y-4\">
            <p className=\"text-sm text-muted-foreground\">
              {errorLevel.description}
            </p>

            {/* Error details in development */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className=\"text-xs bg-muted p-3 rounded\">
                <summary className=\"cursor-pointer font-medium mb-2\">
                  Détails techniques
                </summary>
                <pre className=\"whitespace-pre-wrap break-words\">
                  {this.state.error.message}
                  {this.state.error.stack && `\\n\\n${this.state.error.stack}`}
                </pre>
              </details>
            )}

            {/* Retry count indicator */}
            {this.state.retryCount > 0 && (
              <p className=\"text-xs text-muted-foreground\">
                Tentatives : {this.state.retryCount}/{this.maxRetries}
              </p>
            )}

            {/* Action buttons */}
            <div className=\"flex flex-wrap gap-2\">
              {canRetry && (
                <Button
                  onClick={this.handleRetry}
                  variant=\"outline\"
                  size=\"sm\"
                  className=\"gap-2\"
                >
                  <RefreshCw className=\"h-4 w-4\" />
                  Réessayer
                </Button>
              )}
              
              <Button
                onClick={this.handleReload}
                variant=\"outline\"
                size=\"sm\"
                className=\"gap-2\"
              >
                <RefreshCw className=\"h-4 w-4\" />
                Recharger
              </Button>

              {this.props.level === 'page' && (
                <Button
                  onClick={this.handleGoHome}
                  variant=\"default\"
                  size=\"sm\"
                  className=\"gap-2\"
                >
                  <Home className=\"h-4 w-4\" />
                  Accueil
                </Button>
              )}
            </div>

            {/* Contact support for critical errors */}
            {!canRetry && (
              <div className=\"pt-2 border-t text-center\">
                <p className=\"text-xs text-muted-foreground\">
                  Si le problème persiste, contactez le support technique.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

// ===== CONVENIENCE WRAPPERS =====

/**
 * Page-level error boundary
 */
export const PageErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <React19ErrorBoundary level=\"page\">{children}</React19ErrorBoundary>
);

/**
 * Component-level error boundary
 */
export const ComponentErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <React19ErrorBoundary level=\"component\">{children}</React19ErrorBoundary>
);

/**
 * Action-level error boundary for forms and mutations
 */
export const ActionErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <React19ErrorBoundary level=\"action\">{children}</React19ErrorBoundary>
);

// ===== REACT 19 ERROR CONTEXT =====

interface ErrorContextType {
  reportError: (error: Error, context?: string) => void;
  clearErrors: () => void;
  errors: Error[];
}

const ErrorContext = React.createContext<ErrorContextType | null>(null);

export const ErrorProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [errors, setErrors] = React.useState<Error[]>([]);

  const reportError = React.useCallback((error: Error, context?: string) => {
    setErrors(prev => [...prev, error]);
    
    // Enhanced error reporting
    console.error('Error reported:', { error, context });
  }, []);

  const clearErrors = React.useCallback(() => {
    setErrors([]);
  }, []);

  const value = React.useMemo(() => ({
    reportError,
    clearErrors,
    errors,
  }), [reportError, clearErrors, errors]);

  return (
    <ErrorContext.Provider value={value}>
      <React19ErrorBoundary onError={reportError}>
        {children}
      </React19ErrorBoundary>
    </ErrorContext.Provider>
  );
};

export const useErrorReporting = () => {
  const context = React.useContext(ErrorContext);
  if (!context) {
    throw new Error('useErrorReporting must be used within ErrorProvider');
  }
  return context;
};