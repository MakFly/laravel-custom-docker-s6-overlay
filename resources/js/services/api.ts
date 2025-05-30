import type { Contract, ContractFilters } from '../types/contract';

// Helper function for making authenticated requests
async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
  
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      ...(csrfToken && { 'X-CSRF-TOKEN': csrfToken }),
    },
    credentials: 'same-origin',
  };

  const mergedOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  };

  const response = await fetch(`/api${url}`, mergedOptions);
  
  if (!response.ok) {
    if (response.status === 401) {
      window.location.href = '/login';
      throw new Error('Non authentifié');
    }
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  return response;
}

export const contractApi = {
  async getAll(filters?: ContractFilters) {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, String(value));
        }
      });
    }
    
    const response = await fetchWithAuth(`/contracts?${params}`);
    return response.json();
  },

  async getById(id: number) {
    const response = await fetchWithAuth(`/contracts/${id}`);
    return response.json();
  },

  async upload(data: FormData) {
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    
    const response = await fetch('/api/contracts', {
      method: 'POST',
      body: data,
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': 'application/json',
        ...(csrfToken && { 'X-CSRF-TOKEN': csrfToken }),
      },
      credentials: 'same-origin',
    });

    if (!response.ok) {
      if (response.status === 401) {
        window.location.href = '/login';
        throw new Error('Non authentifié');
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  },

  async update(id: number, data: Partial<Contract>) {
    const response = await fetchWithAuth(`/contracts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.json();
  },

  async delete(id: number) {
    await fetchWithAuth(`/contracts/${id}`, {
      method: 'DELETE',
    });
  },

  async getStatus(id: number) {
    const response = await fetchWithAuth(`/contracts/${id}/status`);
    return response.json();
  },

  async reprocess(id: number) {
    const response = await fetchWithAuth(`/contracts/${id}/reprocess`, {
      method: 'POST',
    });
    return response.json();
  },

  async getDashboardStats() {
    const response = await fetchWithAuth('/dashboard/stats');
    return response.json();
  },

  async getUpcomingRenewals() {
    const response = await fetchWithAuth('/dashboard/upcoming');
    return response.json();
  },
};

export const alertApi = {
  async getAll() {
    const response = await fetchWithAuth('/alerts');
    return response.json();
  },

  async dismiss(id: number) {
    const response = await fetchWithAuth(`/alerts/${id}/dismiss`, {
      method: 'POST',
    });
    return response.json();
  },

  async snooze(id: number, until: string) {
    const response = await fetchWithAuth(`/alerts/${id}/snooze`, {
      method: 'POST',
      body: JSON.stringify({ snooze_until: until }),
    });
    return response.json();
  },
}; 