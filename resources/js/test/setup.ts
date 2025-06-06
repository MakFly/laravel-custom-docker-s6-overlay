import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { TextEncoder, TextDecoder } from 'util';

// Polyfills for jsdom
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock Inertia.js
vi.mock('@inertiajs/react', () => ({
  router: {
    visit: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  Link: vi.fn(({ children, href, ...props }) => 
    React.createElement('a', { href, ...props }, children)
  ),
  Head: vi.fn(({ title }) => 
    React.createElement('title', {}, title)
  ),
  usePage: vi.fn(() => ({
    props: {},
    url: '/',
    component: 'Test',
  })),
}));

// Mock TanStack Query
vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({
    data: null,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  })),
  useMutation: vi.fn(() => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
    error: null,
  })),
  QueryClient: vi.fn(() => ({
    invalidateQueries: vi.fn(),
  })),
  QueryClientProvider: vi.fn(({ children }) => children),
}));

// Mock React Hot Toast
vi.mock('react-hot-toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
  },
  Toaster: vi.fn(() => null),
}));

// Mock Lucide React icons
vi.mock('lucide-react', () => 
  new Proxy({}, {
    get: (target, prop) => {
      if (typeof prop === 'string') {
        return vi.fn((props) => 
          React.createElement('svg', { 
            'data-testid': `${prop}-icon`,
            ...props 
          })
        );
      }
      return target[prop];
    }
  })
);

// Setup fake timers
beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});