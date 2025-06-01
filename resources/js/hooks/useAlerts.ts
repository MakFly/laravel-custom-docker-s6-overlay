import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// API functions for alerts
const alertsApi = {
  async getAll() {
    const response = await fetch('/api/alerts', {
      headers: {
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      credentials: 'same-origin',
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch alerts');
    }
    
    return response.json();
  },

  async dismiss(id: number) {
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    
    const response = await fetch(`/api/alerts/${id}/dismiss`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        ...(csrfToken && { 'X-CSRF-TOKEN': csrfToken }),
      },
      credentials: 'same-origin',
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to dismiss alert');
    }
    
    return response.json();
  },

  async snooze(id: number, until: string) {
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    
    const response = await fetch(`/api/alerts/${id}/snooze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        ...(csrfToken && { 'X-CSRF-TOKEN': csrfToken }),
      },
      credentials: 'same-origin',
      body: JSON.stringify({ until }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to snooze alert');
    }
    
    return response.json();
  },

  async delete(id: number) {
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    
    const response = await fetch(`/api/alerts/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        ...(csrfToken && { 'X-CSRF-TOKEN': csrfToken }),
      },
      credentials: 'same-origin',
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to delete alert');
    }
    
    return response.json();
  },
};

// Hooks
export function useAlerts() {
  return useQuery({
    queryKey: ['alerts'],
    queryFn: alertsApi.getAll,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

export function useDismissAlert() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id }: { id: number }) => alertsApi.dismiss(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
}

export function useSnoozeAlert() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, until }: { id: number; until: string }) => alertsApi.snooze(id, until),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
}

export function useDeleteAlert() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id }: { id: number }) => alertsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
} 