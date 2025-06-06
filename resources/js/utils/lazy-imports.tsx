import React, { Suspense, ComponentType } from 'react';
import * as LoadingSkeletons from '@/components/LoadingSkeletons';

// ===== LAZY LOADING UTILITIES =====

/**
 * Enhanced lazy loading with error boundary and loading states
 */
export function createLazyComponent<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  fallback?: React.ComponentType
) {
  const LazyComponent = React.lazy(importFunc);
  
  return React.forwardRef<any, React.ComponentProps<T>>((props, ref) => {
    const FallbackComponent = fallback || (() => <LoadingSkeletons.Page />);
    
    return (
      <Suspense fallback={<FallbackComponent />}>
        <LazyComponent {...props} ref={ref} />
      </Suspense>
    );
  });
}

/**
 * Preload a lazy component for better UX
 */
export function preloadComponent(importFunc: () => Promise<any>) {
  const componentImport = importFunc();
  return componentImport;
}

// ===== LAZY PAGE COMPONENTS =====

// Dashboard
export const LazyDashboard = createLazyComponent(
  () => import('@/pages/Dashboard'),
  () => <LoadingSkeletons.Dashboard />
);

// Contracts  
export const LazyContractsIndex = createLazyComponent(
  () => import('@/pages/Contracts/Index'),
  () => <LoadingSkeletons.Table />
);

export const LazyContractsShow = createLazyComponent(
  () => import('@/pages/Contracts/Show'),
  () => <LoadingSkeletons.ContractDetail />
);

export const LazyContractsShowRefactored = createLazyComponent(
  () => import('@/pages/Contracts/ShowRefactored'),
  () => <LoadingSkeletons.ContractDetail />
);

export const LazyContractsCreate = createLazyComponent(
  () => import('@/pages/Contracts/Create'),
  () => <LoadingSkeletons.Form />
);

export const LazyContractsEdit = createLazyComponent(
  () => import('@/pages/Contracts/Edit'),
  () => <LoadingSkeletons.Form />
);

// Alerts
export const LazyAlertsIndex = createLazyComponent(
  () => import('@/pages/Alerts/Index'),
  () => <LoadingSkeletons.Table />
);

// Billing
export const LazyBillingIndex = createLazyComponent(
  () => import('@/pages/Billing/Index'),
  () => <LoadingSkeletons.Billing />
);

export const LazyBillingInvoices = createLazyComponent(
  () => import('@/pages/Billing/Invoices'),
  () => <LoadingSkeletons.Table />
);

// Account
export const LazyAccountIndex = createLazyComponent(
  () => import('@/pages/Account/Index'),
  () => <LoadingSkeletons.Profile />
);

// Settings
export const LazySettingsProfile = createLazyComponent(
  () => import('@/pages/settings/profile'),
  () => <LoadingSkeletons.Form />
);

export const LazySettingsPassword = createLazyComponent(
  () => import('@/pages/settings/password'),
  () => <LoadingSkeletons.Form />
);

export const LazySettingsAppearance = createLazyComponent(
  () => import('@/pages/settings/appearance'),
  () => <LoadingSkeletons.Form />
);

// ===== LAZY UI COMPONENTS =====

export const LazyPdfViewer = createLazyComponent(
  () => import('@/components/ui/pdf-viewer'),
  () => <div className="h-96 animate-pulse bg-muted rounded-md" />
);

export const LazySimplePdfViewer = createLazyComponent(
  () => import('@/components/ui/simple-pdf-viewer'),
  () => <div className="h-96 animate-pulse bg-muted rounded-md" />
);

export const LazyDataTable = createLazyComponent(
  () => import('@/components/contracts/data-table'),
  () => <LoadingSkeletons.Table />
);

// New decomposed contract components (now with default exports)
export const LazyContractHeader = createLazyComponent(
  () => import('@/components/contracts/ContractHeader'),
  () => <div className="h-32 animate-pulse bg-muted rounded-md" />
);

export const LazyContractProcessingStatus = createLazyComponent(
  () => import('@/components/contracts/ContractProcessingStatus'),
  () => <LoadingSkeletons.ContractDetail />
);

export const LazyContractActions = createLazyComponent(
  () => import('@/components/contracts/ContractActions'),
  () => <div className="h-24 animate-pulse bg-muted rounded-md" />
);

export const LazyContractAnalysisCard = createLazyComponent(
  () => import('@/components/contracts/ContractAnalysisCard'),
  () => <LoadingSkeletons.ContractDetail />
);

export const LazyContractCreditsInfo = createLazyComponent(
  () => import('@/components/contracts/ContractCreditsInfo'),
  () => <LoadingSkeletons.Profile />
);

// ===== PRELOADING STRATEGIES =====

/**
 * Preload critical components on app mount
 */
export function preloadCriticalComponents() {
  // Preload most likely next pages
  preloadComponent(() => import('@/pages/Contracts/Index'));
  preloadComponent(() => import('@/pages/Dashboard'));
}

/**
 * Preload components on hover (prefetch strategy)
 */
export function useHoverPreload() {
  const preloadOnHover = React.useCallback((importFunc: () => Promise<any>) => {
    return {
      onMouseEnter: () => preloadComponent(importFunc),
      onFocus: () => preloadComponent(importFunc),
    };
  }, []);

  return preloadOnHover;
}

/**
 * Preload components based on route
 */
export function preloadByRoute(route: string) {
  const preloadMap: Record<string, () => Promise<any>> = {
    '/contracts': () => import('@/pages/Contracts/Index'),
    '/contracts/create': () => import('@/pages/Contracts/Create'),
    '/alerts': () => import('@/pages/Alerts/Index'),
    '/billing': () => import('@/pages/Billing/Index'),
    '/account': () => import('@/pages/Account/Index'),
  };

  const preloadFunc = preloadMap[route];
  if (preloadFunc) {
    preloadComponent(preloadFunc);
  }
}

// ===== PROGRESSIVE ENHANCEMENT =====

/**
 * Component that loads heavier features progressively
 */
export function ProgressiveComponent({ 
  children, 
  fallback,
  delay = 0 
}: {
  children: React.ReactNode;
  fallback: React.ReactNode;
  delay?: number;
}) {
  const [shouldRender, setShouldRender] = React.useState(delay === 0);

  React.useEffect(() => {
    if (delay > 0) {
      const timer = setTimeout(() => setShouldRender(true), delay);
      return () => clearTimeout(timer);
    }
  }, [delay]);

  if (!shouldRender) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

// ===== INTERSECTION OBSERVER LAZY LOADING =====

/**
 * Lazy load component when it enters viewport
 */
export function LazyOnVisible({
  children,
  fallback,
  threshold = 0.1,
  rootMargin = '50px'
}: {
  children: React.ReactNode;
  fallback: React.ReactNode;
  threshold?: number;
  rootMargin?: string;
}) {
  const [isVisible, setIsVisible] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  return (
    <div ref={ref}>
      {isVisible ? children : fallback}
    </div>
  );
}