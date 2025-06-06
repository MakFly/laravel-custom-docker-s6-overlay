import { useActionState, useOptimistic, useTransition, useDeferredValue } from 'react';
import { router } from '@inertiajs/react';
import { toast } from 'react-hot-toast';

// ===== REACT 19 ACTION STATE HOOK =====

interface ActionState<T> {
  data: T | null;
  error: string | null;
  pending: boolean;
}

/**
 * React 19 useActionState for form handling with Laravel backend
 */
export function useContractAction<T>(
  action: (formData: FormData) => Promise<T>,
  initialState: ActionState<T> = { data: null, error: null, pending: false }
) {
  const [state, dispatch, isPending] = useActionState(
    async (prevState: ActionState<T>, formData: FormData): Promise<ActionState<T>> => {
      try {
        const data = await action(formData);
        toast.success('Action réussie !');
        return { data, error: null, pending: false };
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || 'Une erreur est survenue';
        toast.error(errorMessage);
        return { data: null, error: errorMessage, pending: false };
      }
    },
    initialState
  );

  return {
    state: { ...state, pending: isPending },
    dispatch,
    isPending,
  };
}

// ===== REACT 19 OPTIMISTIC UPDATES =====

interface Contract {
  id: number;
  title: string;
  status: string;
  ai_status: 'pending' | 'processing' | 'completed' | 'failed';
  ocr_status: 'pending' | 'processing' | 'completed' | 'failed';
}

/**
 * React 19 useOptimistic for contract updates
 */
export function useOptimisticContract(contract: Contract) {
  const [optimisticContract, addOptimisticUpdate] = useOptimistic(
    contract,
    (currentContract: Contract, update: Partial<Contract>) => ({
      ...currentContract,
      ...update,
    })
  );

  const updateContractOptimistically = (update: Partial<Contract>) => {
    // Immediately update UI optimistically
    addOptimisticUpdate(update);
    
    // Perform actual API call in background
    return fetch(`/api/contracts/${contract.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(update),
    }).catch(() => {
      // If API fails, the optimistic update will be reverted automatically
      toast.error('La mise à jour a échoué');
    });
  };

  return {
    contract: optimisticContract,
    updateContract: updateContractOptimistically,
  };
}

// ===== REACT 19 TRANSITIONS FOR HEAVY OPERATIONS =====

/**
 * React 19 transition hook for expensive operations
 */
export function useContractTransitions() {
  const [isPending, startTransition] = useTransition();

  const processContract = (contractId: number, action: 'ocr' | 'ai') => {
    startTransition(() => {
      // Non-urgent update - won't block UI
      router.post(`/api/contracts/${contractId}/process`, { action }, {
        onStart: () => toast.loading('Traitement en cours...'),
        onSuccess: () => toast.success('Traitement terminé !'),
        onError: () => toast.error('Erreur lors du traitement'),
      });
    });
  };

  const bulkProcessContracts = (contractIds: number[]) => {
    startTransition(() => {
      // Heavy operation that won't block the UI
      contractIds.forEach(id => processContract(id, 'ai'));
    });
  };

  return {
    isPending,
    processContract,
    bulkProcessContracts,
  };
}

// ===== REACT 19 DEFERRED VALUES =====

/**
 * React 19 useDeferredValue for expensive filtering
 */
export function useDeferredContractSearch(contracts: Contract[], searchTerm: string) {
  const deferredSearchTerm = useDeferredValue(searchTerm);
  
  // Expensive filtering operation - deferred to not block typing
  const filteredContracts = React.useMemo(() => {
    if (!deferredSearchTerm) return contracts;
    
    return contracts.filter(contract => 
      contract.title.toLowerCase().includes(deferredSearchTerm.toLowerCase()) ||
      contract.status.toLowerCase().includes(deferredSearchTerm.toLowerCase())
    );
  }, [contracts, deferredSearchTerm]);

  const isStale = searchTerm !== deferredSearchTerm;

  return {
    filteredContracts,
    isStale, // UI can show loading state while filtering
  };
}

// ===== REACT 19 USE HOOK FOR PROMISES =====

/**
 * React 19 use() hook wrapper for better promise handling
 */
export function useContractData(contractId: number) {
  // In React 19, we can use the use() hook directly in components
  // This is a TypeScript-safe wrapper
  const contractPromise = React.useMemo(
    () => fetch(`/api/contracts/${contractId}`).then(res => res.json()),
    [contractId]
  );

  return contractPromise;
}

// ===== FORM STATUS HOOK =====

/**
 * React 19 useFormStatus equivalent for better form UX
 */
export function useFormSubmission() {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const submitForm = async (formData: FormData, endpoint: string) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la soumission');
      }

      const result = await response.json();
      toast.success('Formulaire soumis avec succès !');
      return result;
    } catch (error: any) {
      const errorMessage = error.message || 'Une erreur est survenue';
      setSubmitError(errorMessage);
      toast.error(errorMessage);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isSubmitting,
    submitError,
    submitForm,
  };
}