import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// API functions for credits
const creditsApi = {
  async getCreditsInfo() {
    const response = await fetch('/api/credits', {
      headers: {
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      credentials: 'same-origin',
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch credits info');
    }
    
    return response.json();
  },

  async checkAiAvailability() {
    const response = await fetch('/api/credits/check-ai', {
      headers: {
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      credentials: 'same-origin',
    });
    
    if (!response.ok) {
      throw new Error('Failed to check AI availability');
    }
    
    return response.json();
  },

  async changeSubscription(plan: 'basic' | 'premium') {
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    
    const response = await fetch('/api/credits/change-subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        ...(csrfToken && { 'X-CSRF-TOKEN': csrfToken }),
      },
      credentials: 'same-origin',
      body: JSON.stringify({ plan }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to change subscription');
    }
    
    return response.json();
  },

  async purchaseCredits(credits: number, paymentMethod: string) {
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    
    const response = await fetch('/api/credits/purchase', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        ...(csrfToken && { 'X-CSRF-TOKEN': csrfToken }),
      },
      credentials: 'same-origin',
      body: JSON.stringify({ 
        credits, 
        payment_method: paymentMethod 
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to purchase credits');
    }
    
    return response.json();
  },

  async getHistory() {
    const response = await fetch('/api/credits/history', {
      headers: {
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      credentials: 'same-origin',
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch credits history');
    }
    
    return response.json();
  },
};

// Hooks
export function useCreditsInfo() {
  return useQuery({
    queryKey: ['credits'],
    queryFn: creditsApi.getCreditsInfo,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useAiAvailability() {
  return useQuery({
    queryKey: ['credits', 'ai-availability'],
    queryFn: creditsApi.checkAiAvailability,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

export function useChangeSubscription() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ plan }: { plan: 'basic' | 'premium' }) => creditsApi.changeSubscription(plan),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credits'] });
    },
  });
}

export function usePurchaseCredits() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ credits, paymentMethod }: { credits: number; paymentMethod: string }) => 
      creditsApi.purchaseCredits(credits, paymentMethod),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credits'] });
    },
  });
}

export function useCreditsHistory() {
  return useQuery({
    queryKey: ['credits', 'history'],
    queryFn: creditsApi.getHistory,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
} 