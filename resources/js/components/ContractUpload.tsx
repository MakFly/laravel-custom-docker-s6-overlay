import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useForm } from 'react-hook-form';
import { CloudArrowUp, FileText, X } from 'lucide-react';
import { useUploadContract } from '../hooks/useContracts';
import { toast } from 'react-hot-toast';

interface UploadFormData {
  title: string;
  type: 'pro' | 'perso';
  category: string;
  contract_file: File;
}

interface ContractUploadProps {
  onSuccess?: (contract: any) => void;
  onCancel?: () => void;
}

export function ContractUpload({ onSuccess, onCancel }: ContractUploadProps) {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const uploadMutation = useUploadContract();
  
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<UploadFormData>();
  
  const watchedType = watch('type');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setUploadedFile(file);
      setValue('contract_file', file);
      
      // Auto-remplir le titre avec le nom du fichier
      if (!watch('title')) {
        setValue('title', file.name.replace(/\.[^/.]+$/, ''));
      }
    }
  }, [setValue, watch]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const removeFile = () => {
    setUploadedFile(null);
    setValue('contract_file', undefined as any);
  };

  const onSubmit = async (data: UploadFormData) => {
    if (!uploadedFile) {
      toast.error('Veuillez sélectionner un fichier');
      return;
    }

    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('type', data.type);
    formData.append('category', data.category);
    formData.append('contract_file', uploadedFile);

    try {
      const result = await uploadMutation.mutateAsync(formData);
      toast.success('Contrat uploadé avec succès ! Le traitement OCR va commencer.');
      onSuccess?.(result);
    } catch (error) {
      toast.error('Erreur lors de l\'upload du contrat');
      console.error('Upload error:', error);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          Nouveau Contrat
        </h2>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Zone de drop */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Document contractuel
          </label>
          
          {!uploadedFile ? (
            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                ${isDragActive 
                  ? 'border-blue-400 bg-blue-50' 
                  : 'border-gray-300 hover:border-gray-400'
                }
              `}
            >
              <input {...getInputProps()} />
              <CloudArrowUp className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-lg font-medium text-gray-900 mb-2">
                {isDragActive 
                  ? 'Déposez le fichier ici...' 
                  : 'Glissez-déposez votre contrat'
                }
              </p>
              <p className="text-sm text-gray-500">
                PDF, PNG, JPG jusqu'à 10MB
              </p>
              <button
                type="button"
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Parcourir les fichiers
              </button>
            </div>
          ) : (
            <div className="border border-gray-300 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FileText className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="font-medium text-gray-900">{uploadedFile.name}</p>
                  <p className="text-sm text-gray-500">
                    {(uploadedFile.size / 1024 / 1024).toFixed(1)} MB
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={removeFile}
                className="text-red-500 hover:text-red-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>

        {/* Titre */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Titre du contrat *
          </label>
          <input
            {...register('title', { required: 'Le titre est requis' })}
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ex: Assurance habitation Maif"
          />
          {errors.title && (
            <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
          )}
        </div>

        {/* Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Type de contrat *
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className={`
              border-2 rounded-lg p-4 cursor-pointer transition-all
              ${watchedType === 'pro' 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
              }
            `}>
              <input
                {...register('type', { required: 'Le type est requis' })}
                type="radio"
                value="pro"
                className="sr-only"
              />
              <div className="text-center">
                <div className="text-lg font-medium">Professionnel</div>
                <div className="text-sm text-gray-500">Contrats d'entreprise</div>
              </div>
            </label>
            
            <label className={`
              border-2 rounded-lg p-4 cursor-pointer transition-all
              ${watchedType === 'perso' 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
              }
            `}>
              <input
                {...register('type', { required: 'Le type est requis' })}
                type="radio"
                value="perso"
                className="sr-only"
              />
              <div className="text-center">
                <div className="text-lg font-medium">Personnel</div>
                <div className="text-sm text-gray-500">Contrats personnels</div>
              </div>
            </label>
          </div>
          {errors.type && (
            <p className="mt-1 text-sm text-red-600">{errors.type.message}</p>
          )}
        </div>

        {/* Catégorie */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Catégorie *
          </label>
          <select
            {...register('category', { required: 'La catégorie est requise' })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Sélectionnez une catégorie</option>
            <option value="assurance">Assurance</option>
            <option value="telecom">Télécom</option>
            <option value="energie">Énergie</option>
            <option value="banque">Banque</option>
            <option value="immobilier">Immobilier</option>
            <option value="transport">Transport</option>
            <option value="autre">Autre</option>
          </select>
          {errors.category && (
            <p className="mt-1 text-sm text-red-600">{errors.category.message}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Annuler
            </button>
          )}
          <button
            type="submit"
            disabled={!uploadedFile || uploadMutation.isPending}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {uploadMutation.isPending && (
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
            <span>
              {uploadMutation.isPending ? 'Upload en cours...' : 'Analyser le contrat'}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
} 