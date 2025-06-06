import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

// ===== APP STATE MANAGEMENT =====

interface AppState {
  theme: 'light' | 'dark' | 'system';
  sidebarOpen: boolean;
  processingStatus: Record<string, 'idle' | 'processing' | 'completed' | 'error'>;
  notifications: Array<{
    id: string;
    type: 'info' | 'success' | 'warning' | 'error';
    message: string;
    timestamp: Date;
  }>;
}

type AppAction =
  | { type: 'SET_THEME'; payload: AppState['theme'] }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'SET_PROCESSING_STATUS'; payload: { id: string; status: AppState['processingStatus'][string] } }
  | { type: 'ADD_NOTIFICATION'; payload: Omit<AppState['notifications'][0], 'id' | 'timestamp'> }
  | { type: 'REMOVE_NOTIFICATION'; payload: string };

const initialState: AppState = {
  theme: 'system',
  sidebarOpen: false,
  processingStatus: {},
  notifications: [],
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_THEME':
      return { ...state, theme: action.payload };
    
    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarOpen: !state.sidebarOpen };
    
    case 'SET_PROCESSING_STATUS':
      return {
        ...state,
        processingStatus: {
          ...state.processingStatus,
          [action.payload.id]: action.payload.status,
        },
      };
    
    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [
          ...state.notifications,
          {
            ...action.payload,
            id: crypto.randomUUID(),
            timestamp: new Date(),
          },
        ],
      };
    
    case 'REMOVE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.payload),
      };
    
    default:
      return state;
  }
}

// ===== CONTEXT SETUP =====

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  // Convenience methods
  setTheme: (theme: AppState['theme']) => void;
  toggleSidebar: () => void;
  setProcessingStatus: (id: string, status: AppState['processingStatus'][string]) => void;
  addNotification: (notification: Omit<AppState['notifications'][0], 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
}

const AppContext = createContext<AppContextType | null>(null);

// ===== QUERY CLIENT SETUP =====

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30 seconds
      gcTime: 5 * 60 * 1000, // 5 minutes
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        return failureCount < 3;
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

// ===== PROVIDERS =====

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Convenience methods
  const setTheme = React.useCallback((theme: AppState['theme']) => {
    dispatch({ type: 'SET_THEME', payload: theme });
  }, []);

  const toggleSidebar = React.useCallback(() => {
    dispatch({ type: 'TOGGLE_SIDEBAR' });
  }, []);

  const setProcessingStatus = React.useCallback((id: string, status: AppState['processingStatus'][string]) => {
    dispatch({ type: 'SET_PROCESSING_STATUS', payload: { id, status } });
  }, []);

  const addNotification = React.useCallback((notification: Omit<AppState['notifications'][0], 'id' | 'timestamp'>) => {
    dispatch({ type: 'ADD_NOTIFICATION', payload: notification });
  }, []);

  const removeNotification = React.useCallback((id: string) => {
    dispatch({ type: 'REMOVE_NOTIFICATION', payload: id });
  }, []);

  const contextValue = React.useMemo((): AppContextType => ({
    state,
    dispatch,
    setTheme,
    toggleSidebar,
    setProcessingStatus,
    addNotification,
    removeNotification,
  }), [state, setTheme, toggleSidebar, setProcessingStatus, addNotification, removeNotification]);

  return (
    <QueryClientProvider client={queryClient}>
      <AppContext.Provider value={contextValue}>
        {children}
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: 'var(--background)',
              color: 'var(--foreground)',
              border: '1px solid var(--border)',
            },
          }}
        />
      </AppContext.Provider>
    </QueryClientProvider>
  );
}

// ===== HOOKS =====

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProviders');
  }
  return context;
}

export function useTheme() {
  const { state, setTheme } = useAppContext();
  return {
    theme: state.theme,
    setTheme,
  };
}

export function useSidebar() {
  const { state, toggleSidebar } = useAppContext();
  return {
    isOpen: state.sidebarOpen,
    toggle: toggleSidebar,
  };
}

export function useProcessingStatus() {
  const { state, setProcessingStatus } = useAppContext();
  return {
    statuses: state.processingStatus,
    setStatus: setProcessingStatus,
    getStatus: (id: string) => state.processingStatus[id] || 'idle',
  };
}

export function useNotifications() {
  const { state, addNotification, removeNotification } = useAppContext();
  return {
    notifications: state.notifications,
    addNotification,
    removeNotification,
    // Convenience methods
    success: (message: string) => addNotification({ type: 'success', message }),
    error: (message: string) => addNotification({ type: 'error', message }),
    warning: (message: string) => addNotification({ type: 'warning', message }),
    info: (message: string) => addNotification({ type: 'info', message }),
  };
}