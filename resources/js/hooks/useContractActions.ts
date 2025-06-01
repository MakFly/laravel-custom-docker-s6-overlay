import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';

interface UseContractActionsProps {
  contractId: number;
  onSuccess?: () => void;
  onStartPolling?: () => void;
}

interface ActionProgress {
  ocr: boolean;
  ai: boolean;
}

export function useContractActions({ contractId, onSuccess, onStartPolling }: UseContractActionsProps) {
  const [isProcessing, setIsProcessing] = useState<ActionProgress>({
    ocr: false,
    ai: false
  });
  
  const queryClient = useQueryClient();

  const reprocessOCR = async () => {
    if (isProcessing.ocr) return;
    
    setIsProcessing(prev => ({ ...prev, ocr: true }));
    
    const toastId = toast.loading('Retraitement OCR en cours...', {
      duration: 0,
    });

    try {
      const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
      
      const response = await fetch(`/api/contracts/${contractId}/reprocess`, {
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
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      toast.success('Retraitement OCR lancé avec succès !', { id: toastId });
      
      onStartPolling?.();
      
      setTimeout(() => {
        setIsProcessing(prev => ({ ...prev, ocr: false }));
      }, 2000);
      
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['contracts', contractId] });
        queryClient.invalidateQueries({ queryKey: ['contracts'] });
        onSuccess?.();
      }, 1000);
      
    } catch (error) {
      console.error('Erreur lors du retraitement OCR:', error);
      toast.error('Erreur lors du retraitement OCR', { id: toastId });
      setIsProcessing(prev => ({ ...prev, ocr: false }));
    }
  };

  const reprocessAI = async () => {
    if (isProcessing.ai) return;
    
    setIsProcessing(prev => ({ ...prev, ai: true }));
    
    const toastId = toast.loading('Retraitement IA en cours...', {
      duration: 0,
    });

    try {
      const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
      
      const response = await fetch(`/api/contracts/${contractId}/reanalyze`, {
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
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      toast.success('Retraitement IA lancé avec succès !', { id: toastId });
      
      onStartPolling?.();
      
      setTimeout(() => {
        setIsProcessing(prev => ({ ...prev, ai: false }));
      }, 2000);
      
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['contracts', contractId] });
        queryClient.invalidateQueries({ queryKey: ['contracts'] });
        onSuccess?.();
      }, 1000);
      
    } catch (error) {
      console.error('Erreur lors du retraitement IA:', error);
      toast.error('Erreur lors du retraitement IA', { id: toastId });
      setIsProcessing(prev => ({ ...prev, ai: false }));
    }
  };

  return {
    isProcessing,
    reprocessOCR,
    reprocessAI,
  };
} 