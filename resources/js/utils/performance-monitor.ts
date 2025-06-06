import { Profiler, ProfilerOnRenderCallback } from 'react';

// ===== REACT 19 PERFORMANCE MONITORING =====

interface PerformanceMetric {
  id: string;
  phase: 'mount' | 'update';
  actualDuration: number;
  baseDuration: number;
  startTime: number;
  commitTime: number;
  interactions: Set<any>;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private observers: PerformanceObserver[] = [];
  private vitals: Map<string, number> = new Map();

  constructor() {
    this.initializeWebVitals();
    this.initializeResourceObserver();
  }

  // ===== REACT PROFILER INTEGRATION =====

  createProfilerCallback = (id: string): ProfilerOnRenderCallback => {
    return (id, phase, actualDuration, baseDuration, startTime, commitTime, interactions) => {
      const metric: PerformanceMetric = {
        id,
        phase,
        actualDuration,
        baseDuration,
        startTime,
        commitTime,
        interactions,
      };

      this.metrics.push(metric);
      this.analyzePerformance(metric);

      // Send to analytics in production
      if (process.env.NODE_ENV === 'production') {
        this.reportToAnalytics(metric);
      }
    };
  };

  // ===== CORE WEB VITALS =====

  private initializeWebVitals() {
    // Largest Contentful Paint (LCP)
    if ('PerformanceObserver' in window) {
      const lcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.vitals.set('LCP', lastEntry.startTime);
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.push(lcpObserver);

      // First Input Delay (FID)
      const fidObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        entries.forEach((entry: any) => {
          this.vitals.set('FID', entry.processingStart - entry.startTime);
        });
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
      this.observers.push(fidObserver);

      // Cumulative Layout Shift (CLS)
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
            this.vitals.set('CLS', clsValue);
          }
        });
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
      this.observers.push(clsObserver);
    }
  }

  private initializeResourceObserver() {
    if ('PerformanceObserver' in window) {
      const resourceObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        entries.forEach((entry) => {
          if (entry.name.includes('chunk') || entry.name.includes('.js')) {
            this.analyzeResourceTiming(entry);
          }
        });
      });
      resourceObserver.observe({ entryTypes: ['resource'] });
      this.observers.push(resourceObserver);
    }
  }

  // ===== PERFORMANCE ANALYSIS =====

  private analyzePerformance(metric: PerformanceMetric) {
    // Warning thresholds for React 19
    const SLOW_RENDER_THRESHOLD = 16; // ms (60fps)
    const VERY_SLOW_RENDER_THRESHOLD = 50; // ms

    if (metric.actualDuration > VERY_SLOW_RENDER_THRESHOLD) {
      console.warn(`🐌 Very slow render detected: ${metric.id}`, {
        duration: `${metric.actualDuration.toFixed(2)}ms`,
        phase: metric.phase,
        baseline: `${metric.baseDuration.toFixed(2)}ms`,
        overhead: `${(metric.actualDuration - metric.baseDuration).toFixed(2)}ms`,
      });
    } else if (metric.actualDuration > SLOW_RENDER_THRESHOLD) {
      console.info(`⚠️ Slow render: ${metric.id} (${metric.actualDuration.toFixed(2)}ms)`);
    }

    // Detect unnecessary re-renders
    if (metric.phase === 'update' && metric.actualDuration > metric.baseDuration * 2) {
      console.warn(`🔄 Possible unnecessary re-render: ${metric.id}`, {
        actualDuration: metric.actualDuration,
        baseDuration: metric.baseDuration,
        ratio: (metric.actualDuration / metric.baseDuration).toFixed(2),
      });
    }
  }

  private analyzeResourceTiming(entry: PerformanceEntry) {
    const resource = entry as PerformanceResourceTiming;
    const totalTime = resource.responseEnd - resource.startTime;
    
    if (totalTime > 1000) { // > 1 second
      console.warn(`🐌 Slow resource load: ${resource.name}`, {
        totalTime: `${totalTime.toFixed(2)}ms`,
        dns: `${(resource.domainLookupEnd - resource.domainLookupStart).toFixed(2)}ms`,
        tcp: `${(resource.connectEnd - resource.connectStart).toFixed(2)}ms`,
        request: `${(resource.responseStart - resource.requestStart).toFixed(2)}ms`,
        response: `${(resource.responseEnd - resource.responseStart).toFixed(2)}ms`,
      });
    }
  }

  // ===== REACT 19 CONCURRENT FEATURES MONITORING =====

  measureConcurrentRender<T>(
    name: string,
    renderFn: () => T,
    priority: 'urgent' | 'normal' | 'low' = 'normal'
  ): T {
    const start = performance.now();
    
    const result = renderFn();
    
    const duration = performance.now() - start;
    
    console.log(`⚡ Concurrent render: ${name}`, {
      duration: `${duration.toFixed(2)}ms`,
      priority,
      timestamp: new Date().toISOString(),
    });

    return result;
  }

  // ===== BUNDLE ANALYSIS =====

  analyzeBundlePerformance() {
    if ('getEntriesByType' in performance) {
      const navigationEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
      const resourceEntries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];

      if (navigationEntries.length > 0) {
        const nav = navigationEntries[0];
        const metrics = {
          // Time to Interactive
          tti: nav.domInteractive - nav.navigationStart,
          // DOM Content Loaded
          dcl: nav.domContentLoadedEventEnd - nav.navigationStart,
          // Page Load Complete
          load: nav.loadEventEnd - nav.navigationStart,
          // First Byte
          ttfb: nav.responseStart - nav.navigationStart,
        };

        console.table(metrics);
      }

      // JavaScript bundle analysis
      const jsResources = resourceEntries.filter(entry => 
        entry.name.endsWith('.js') || entry.name.includes('chunk')
      );

      const bundleMetrics = jsResources.map(resource => ({
        name: resource.name.split('/').pop(),
        size: resource.transferSize,
        loadTime: resource.responseEnd - resource.startTime,
        cached: resource.transferSize === 0,
      }));

      console.table(bundleMetrics);
    }
  }

  // ===== MEMORY MONITORING =====

  monitorMemoryUsage() {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        used: Math.round(memory.usedJSHeapSize / 1048576), // MB
        total: Math.round(memory.totalJSHeapSize / 1048576), // MB
        limit: Math.round(memory.jsHeapSizeLimit / 1048576), // MB
        usage: Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100), // %
      };
    }
    return null;
  }

  // ===== REPORTING =====

  private reportToAnalytics(metric: PerformanceMetric) {
    // Send to Laravel backend or analytics service
    fetch('/api/analytics/performance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        component: metric.id,
        phase: metric.phase,
        duration: metric.actualDuration,
        baseline: metric.baseDuration,
        timestamp: Date.now(),
        url: window.location.pathname,
        userAgent: navigator.userAgent,
        vitals: Object.fromEntries(this.vitals),
        memory: this.monitorMemoryUsage(),
      }),
    }).catch(console.error);
  }

  getReport() {
    return {
      metrics: this.metrics,
      vitals: Object.fromEntries(this.vitals),
      memory: this.monitorMemoryUsage(),
      slowComponents: this.metrics
        .filter(m => m.actualDuration > 16)
        .sort((a, b) => b.actualDuration - a.actualDuration)
        .slice(0, 10),
    };
  }

  cleanup() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.metrics = [];
    this.vitals.clear();
  }
}

// ===== SINGLETON INSTANCE =====

export const performanceMonitor = new PerformanceMonitor();

// ===== REACT PROFILER WRAPPER COMPONENT =====

interface PerformanceProfilerProps {
  id: string;
  children: React.ReactNode;
  enabled?: boolean;
}

export const PerformanceProfiler: React.FC<PerformanceProfilerProps> = ({
  id,
  children,
  enabled = process.env.NODE_ENV === 'development',
}) => {
  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <Profiler id={id} onRender={performanceMonitor.createProfilerCallback(id)}>
      {children}
    </Profiler>
  );
};

// ===== HOOKS =====

export function usePerformanceMetrics() {
  const [metrics, setMetrics] = React.useState(performanceMonitor.getReport());

  React.useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(performanceMonitor.getReport());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return metrics;
}

export function useMemoryMonitor() {
  const [memory, setMemory] = React.useState(performanceMonitor.monitorMemoryUsage());

  React.useEffect(() => {
    const interval = setInterval(() => {
      setMemory(performanceMonitor.monitorMemoryUsage());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return memory;
}