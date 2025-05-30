import { useState, useEffect, useRef } from 'react';

interface ContractStatus {
  id: number;
  ocr_status: string;
  ai_status?: string;
  has_ocr_text: boolean;
  has_ai_analysis: boolean;
  updated_at: string;
}

interface UseContractStatusOptions {
  contractId: number;
  initialStatus?: ContractStatus;
  pollInterval?: number; // en millisecondes
  stopPollingWhen?: (status: ContractStatus) => boolean;
}

async function fetchContractStatus(contractId: number): Promise<ContractStatus> {
  const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
  
  const response = await fetch(`/api/contracts/${contractId}/status`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      ...(csrfToken && { 'X-CSRF-TOKEN': csrfToken }),
    },
    credentials: 'same-origin',
  });

  if (!response.ok) {
    if (response.status === 401) {
      // Redirect to login using Inertia
      window.location.href = '/login';
      throw new Error('Non authentifié');
    }
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

export function useContractStatus({
  contractId,
  initialStatus,
  pollInterval = 3000, // 3 secondes par défaut
  stopPollingWhen
}: UseContractStatusOptions) {
  const [status, setStatus] = useState<ContractStatus | null>(initialStatus || null);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchStatus = async () => {
    try {
      const newStatus = await fetchContractStatus(contractId);
      
      setStatus(newStatus);
      setError(null);
      
      // Arrêter le polling si la condition est remplie
      if (stopPollingWhen && stopPollingWhen(newStatus)) {
        stopPolling();
      }
      
      return newStatus;
    } catch (err) {
      console.error('Error fetching contract status:', err);
      setError('Erreur lors de la récupération du statut');
      stopPolling(); // Arrêter le polling en cas d'erreur persistante
      throw err;
    }
  };

  const startPolling = () => {
    if (intervalRef.current) return; // Déjà en cours
    
    setIsPolling(true);
    
    // Première requête immédiate
    fetchStatus();
    
    // Puis polling périodique
    intervalRef.current = setInterval(() => {
      fetchStatus();
    }, pollInterval);
  };

  const stopPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPolling(false);
  };

  // Nettoyage à la destruction du composant
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, []);

  // Auto-start polling si le statut initial indique un traitement en cours
  useEffect(() => {
    if (status && (status.ocr_status === 'processing' || status.ai_status === 'processing')) {
      startPolling();
    }
  }, [contractId]);

  return {
    status,
    isPolling,
    error,
    startPolling,
    stopPolling,
    refetch: fetchStatus
  };
} 