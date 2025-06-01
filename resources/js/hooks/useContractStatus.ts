import { useState, useEffect, useRef } from 'react';
import { contractApi } from '../services/api';

interface ContractStatus {
  id: number;
  ocr_status: string;
  ai_status: string; // Plus optionnel maintenant
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
  return contractApi.getStatus(contractId);
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

  // Méthode pour forcer le démarrage du polling (utilisée après retraitement)
  const forceStartPolling = () => {
    stopPolling(); // Arrêter le polling existant s'il y en a un
    startPolling(); // Redémarrer le polling
  };

  // Nettoyage à la destruction du composant
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, []);

  // Auto-start polling si le statut initial indique un traitement en cours
  // ou si le statut change pour indiquer un traitement
  useEffect(() => {
    if (status && (
      status.ocr_status === 'processing' || 
      status.ocr_status === 'pending' ||
      status.ai_status === 'processing' ||
      status.ai_status === 'pending'
    )) {
      startPolling();
    }
  }, [contractId, status?.ocr_status, status?.ai_status]);

  return {
    status,
    isPolling,
    error,
    startPolling,
    stopPolling,
    forceStartPolling, // Nouvelle méthode exposée
    refetch: fetchStatus
  };
} 