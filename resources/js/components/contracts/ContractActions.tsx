import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { RotateCcw, Brain } from 'lucide-react';
import { Contract } from '@/types/api';

interface ContractActionsProps {
  contract: Contract;
  onReprocessOcr?: () => void;
  onReprocessAi?: () => void;
  isProcessing?: {
    ocr: boolean;
    ai: boolean;
  };
  canReprocessOcr?: boolean;
  canReprocessAi?: boolean;
}

export const ContractActions = React.memo(({
  contract,
  onReprocessOcr,
  onReprocessAi,
  isProcessing = { ocr: false, ai: false },
  canReprocessOcr = false,
  canReprocessAi = false
}: ContractActionsProps) => {
  if (!canReprocessOcr && !canReprocessAi) {
    return null;
  }

  return (
    <Card className="border-gray-200">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold">Actions de retraitement</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            {canReprocessOcr && onReprocessOcr && (
              <Button 
                variant="outline" 
                onClick={onReprocessOcr}
                disabled={contract.ocr_status === 'processing' || isProcessing.ocr}
              >
                <RotateCcw className={`h-4 w-4 mr-2 ${isProcessing.ocr ? 'animate-spin' : ''}`} />
                {isProcessing.ocr ? 'Traitement...' : 'Retraiter OCR'}
              </Button>
            )}
            
            {canReprocessAi && onReprocessAi && contract.ocr_status === 'completed' && (
              <Button 
                variant="outline" 
                onClick={onReprocessAi}
                disabled={contract.ai_status === 'processing' || isProcessing.ai}
              >
                <Brain className={`h-4 w-4 mr-2 ${isProcessing.ai ? 'animate-spin' : ''}`} />
                {isProcessing.ai ? 'Traitement...' : 'Retraiter IA'}
              </Button>
            )}
          </div>
          
          {/* Progress bars */}
          {(isProcessing.ocr || isProcessing.ai) && (
            <div className="space-y-2">
              {isProcessing.ocr && (
                <div className="space-y-1">
                  <div className="text-sm text-gray-600">Retraitement OCR en cours...</div>
                  <Progress value={undefined} className="w-full" />
                </div>
              )}
              {isProcessing.ai && (
                <div className="space-y-1">
                  <div className="text-sm text-gray-600">Retraitement IA en cours...</div>
                  <Progress value={undefined} className="w-full" />
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

ContractActions.displayName = 'ContractActions';

// Export as default for easier lazy loading
export default ContractActions;