import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contractApi } from '../services/api';
import type { Contract, ContractFilters } from '../types/contract';

export function useContracts(filters?: ContractFilters) {
  return useQuery({
    queryKey: ['contracts', filters],
    queryFn: () => contractApi.getAll(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useContract(id: number) {
  return useQuery({
    queryKey: ['contracts', id],
    queryFn: () => contractApi.getById(id),
    enabled: !!id,
  });
}

export function useUploadContract() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: contractApi.upload,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateContract() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Contract> }) => 
      contractApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['contracts', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
    },
  });
}

export function useDeleteContract() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: contractApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useReprocessContract() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id }: { id: number }) => contractApi.reprocess(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['contracts', variables.id] });
    },
  });
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: contractApi.getDashboardStats,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useUpcomingRenewals() {
  return useQuery({
    queryKey: ['dashboard', 'upcoming'],
    queryFn: contractApi.getUpcomingRenewals,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
} 