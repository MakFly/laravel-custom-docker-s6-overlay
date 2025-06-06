import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

// Skeleton générique
const Skeleton = ({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div
        className={`animate-pulse rounded-md bg-gray-200 ${className}`}
        {...props}
    />
);

// Skeleton pour les cartes d'analyse
export const AnalysisSkeleton = () => (
    <Card>
        <CardHeader>
            <div className="flex items-center space-x-2">
                <Skeleton className="h-5 w-5" />
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-5 w-16" />
            </div>
        </CardHeader>
        <CardContent>
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-5 w-20" />
                </div>
                <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-4 w-32" />
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-4 w-24" />
                    </div>
                </div>
            </div>
        </CardContent>
    </Card>
);

// Skeleton pour la sidebar de crédits
export const CreditsSkeleton = () => (
    <Card>
        <CardHeader>
            <div className="flex items-center space-x-2">
                <Skeleton className="h-5 w-5" />
                <Skeleton className="h-6 w-24" />
            </div>
        </CardHeader>
        <CardContent>
            <div className="space-y-4">
                <div className="text-center space-y-2">
                    <Skeleton className="h-8 w-12 mx-auto" />
                    <Skeleton className="h-4 w-24 mx-auto" />
                </div>
                <Skeleton className="h-2 w-full" />
                <div className="space-y-1">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-3 w-28" />
                </div>
            </div>
        </CardContent>
    </Card>
);

// Skeleton pour les alertes
export const AlertsSkeleton = () => (
    <Card className="border-orange-200 bg-orange-50/30">
        <CardHeader>
            <div className="flex items-center space-x-2">
                <Skeleton className="h-5 w-5" />
                <Skeleton className="h-6 w-32" />
            </div>
        </CardHeader>
        <CardContent>
            <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white rounded-lg p-3 border border-orange-200">
                        <div className="flex items-start justify-between">
                            <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-2">
                                    <Skeleton className="h-4 w-16" />
                                    <Skeleton className="h-4 w-20" />
                                </div>
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-3 w-full" />
                                <Skeleton className="h-3 w-32" />
                            </div>
                            <Skeleton className="h-8 w-8" />
                        </div>
                    </div>
                ))}
            </div>
            <Skeleton className="h-10 w-full mt-4" />
        </CardContent>
    </Card>
);

// Skeleton pour les métadonnées OCR
export const OcrMetadataSkeleton = () => (
    <Card>
        <CardHeader>
            <Skeleton className="h-6 w-28" />
        </CardHeader>
        <CardContent>
            <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-center justify-between">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-16" />
                    </div>
                ))}
            </div>
        </CardContent>
    </Card>
);

// Skeleton pour les informations du contrat
export const ContractInfoSkeleton = () => (
    <Card>
        <CardHeader>
            <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
            <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex justify-between items-center py-2 border-b border-gray-100">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-24" />
                    </div>
                ))}
            </div>
        </CardContent>
    </Card>
);

// Skeleton pour l'en-tête du contrat
export const ContractHeaderSkeleton = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
        <div className="px-6 py-6">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between">
                <div className="flex-1 min-w-0 space-y-4">
                    <Skeleton className="h-8 w-3/4" />
                    <div className="flex flex-wrap items-center gap-4">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-28" />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Skeleton className="h-6 w-20" />
                        <Skeleton className="h-6 w-16" />
                        <Skeleton className="h-6 w-12" />
                        <Skeleton className="h-6 w-32" />
                    </div>
                    <div className="flex flex-wrap items-center gap-6">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-28" />
                    </div>
                </div>
                <div className="flex items-center space-x-3 mt-6 lg:mt-0 lg:ml-6">
                    <Skeleton className="h-10 w-24" />
                    <Skeleton className="h-10 w-20" />
                    <Skeleton className="h-10 w-28" />
                </div>
            </div>
        </div>
    </div>
);

// Skeleton pour les actions IA
export const AiActionsSkeleton = () => (
    <Card>
        <CardHeader>
            <Skeleton className="h-6 w-24" />
        </CardHeader>
        <CardContent className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-10 w-full" />
        </CardContent>
    </Card>
);

export { Skeleton };

// Additional skeletons for lazy loading
export const Page = () => (
  <div className="min-h-screen bg-gray-50 py-8">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <Skeleton className="h-8 w-64 mb-6" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Skeleton className="h-32" />
          <Skeleton className="h-64" />
          <Skeleton className="h-48" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-24" />
          <Skeleton className="h-48" />
          <Skeleton className="h-32" />
        </div>
      </div>
    </div>
  </div>
);

export const Dashboard = () => (
  <div className="space-y-6">
    <Skeleton className="h-8 w-48" />
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <Skeleton className="h-4 w-16 mb-2" />
            <Skeleton className="h-8 w-24" />
          </CardContent>
        </Card>
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Skeleton className="h-64" />
      <Skeleton className="h-64" />
    </div>
  </div>
);

export const Table = () => (
  <div className="space-y-4">
    <div className="flex justify-between items-center">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-10 w-32" />
    </div>
    <div className="border rounded-lg">
      <div className="border-b p-4">
        <div className="flex space-x-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-24" />
          ))}
        </div>
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="border-b last:border-b-0 p-4">
          <div className="flex space-x-4">
            {Array.from({ length: 4 }).map((_, j) => (
              <Skeleton key={j} className="h-4 w-24" />
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const Form = () => (
  <div className="space-y-6">
    <Skeleton className="h-8 w-48" />
    <div className="space-y-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
    </div>
    <div className="flex justify-end space-x-4">
      <Skeleton className="h-10 w-24" />
      <Skeleton className="h-10 w-24" />
    </div>
  </div>
);

export const ContractDetail = () => (
  <div className="space-y-6">
    <Skeleton className="h-32" />
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <Skeleton className="h-48" />
        <Skeleton className="h-64" />
      </div>
      <div className="space-y-6">
        <Skeleton className="h-32" />
        <Skeleton className="h-48" />
      </div>
    </div>
  </div>
);

export const Billing = () => (
  <div className="space-y-6">
    <Skeleton className="h-8 w-48" />
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <Skeleton className="h-6 w-32 mb-4" />
            <Skeleton className="h-8 w-20 mb-2" />
            <Skeleton className="h-4 w-24" />
          </CardContent>
        </Card>
      ))}
    </div>
    <Skeleton className="h-64" />
  </div>
);

export const Profile = () => (
  <div className="space-y-6">
    <div className="flex items-center space-x-4">
      <Skeleton className="h-16 w-16 rounded-full" />
      <div className="space-y-2">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-48" />
      </div>
    </div>
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
    </div>
  </div>
); 