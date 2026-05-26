import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { PhotoCaptureButton } from './PhotoCaptureButton';
import { 
  TruckIcon, 
  CheckIcon, 
  DropletIcon,
  GaugeIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  ImageIcon
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';

import { completeDelivery, getActiveBranchesOnly, getOilTypes, uploadPhotoToFirebaseStorage, getAllTransactions, updatePhotosWithCorrectWatermarks, getNextFormattedId } from '@/lib/firebase';
import { safeWatermarkImage } from '@/utils/watermark';
import { useAuth } from '@/hooks/useAuth';

interface SupplyData {
  deliveryOrderNo: string;
  branchId: string;
  oilTypeId: string;
  startMeterReading: number;
  endMeterReading: number;
  oilSuppliedLiters: number;
  tankLevelPhoto?: string;
  hoseConnectionPhoto?: string;
  finalTankLevelPhoto?: string;
  tankerMeterPhoto?: string;
  finishMeterReadingPhoto?: string;
}

interface SupplyStep {
  id: number;
  title: string;
  status: 'pending' | 'active' | 'completed';
}

interface SupplyWorkflowProps {
  onClose: (completed?: boolean) => void;
  onPhotoClick?: (url: string, label: string) => void;
}

export function SupplyWorkflow({ onClose, onPhotoClick }: SupplyWorkflowProps) {
  const { toast } = useToast();
  const { userData: user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1); // 1: Before Starting Pump, 2: After Loading Completes
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showExitConfirmDialog, setShowExitConfirmDialog] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{
    // Step 1
    deliveryOrderNo?: boolean;
    branchId?: boolean;
    oilTypeId?: boolean;
    startMeterReading?: boolean;
    tankerMeterPhoto?: boolean;
    tankLevelPhoto?: boolean;
    hoseConnectionPhoto?: boolean;
    // Step 2
    endMeterReading?: boolean;
    finishMeterReadingPhoto?: boolean;
    finalTankLevelPhoto?: boolean;
  }>({});
  const [supplyData, setSupplyData] = useState<SupplyData>({
    deliveryOrderNo: '',
    branchId: '',
    oilTypeId: '',
    startMeterReading: 0,
    endMeterReading: 0,
    oilSuppliedLiters: 0,
  });

  // Store selected branch data for watermarking and transaction
  const [selectedBranchData, setSelectedBranchData] = useState<{
    id: string;
    name: string;
    address: string;
  } | null>(null);

  // Auto-save draft data to localStorage
  const saveSupplyDraft = (data: SupplyData, step: number) => {
    if (step === 2) {
      const draftData = {
        ...data,
        currentStep: step,
        selectedBranchData,
        timestamp: Date.now()
      };
      localStorage.setItem('supply_draft', JSON.stringify(draftData));
      console.log('💾 Supply draft saved:', draftData);
    }
  };

  // Restore draft data from localStorage
  const restoreSupplyDraft = () => {
    try {
      const draftStr = localStorage.getItem('supply_draft');
      if (draftStr) {
        const draft = JSON.parse(draftStr);
        // Only restore if draft is less than 24 hours old
        if (Date.now() - draft.timestamp < 24 * 60 * 60 * 1000) {
          setSupplyData({
            deliveryOrderNo: draft.deliveryOrderNo || '',
            branchId: draft.branchId || '',
            oilTypeId: draft.oilTypeId || '',
            startMeterReading: draft.startMeterReading || 0,
            endMeterReading: draft.endMeterReading || 0,
            oilSuppliedLiters: draft.oilSuppliedLiters || 0,
            tankLevelPhoto: draft.tankLevelPhoto,
            hoseConnectionPhoto: draft.hoseConnectionPhoto,
            finalTankLevelPhoto: draft.finalTankLevelPhoto,
            tankerMeterPhoto: draft.tankerMeterPhoto,
            finishMeterReadingPhoto: draft.finishMeterReadingPhoto
          });
          if (draft.selectedBranchData) {
            setSelectedBranchData(draft.selectedBranchData);
          }
          setCurrentStep(draft.currentStep || 1);
          toast({
            title: "Draft Restored",
            description: "Your previous work has been restored from a saved draft.",
            variant: "default"
          });
          console.log('✅ Supply draft restored:', draft);
        } else {
          // Remove old draft
          localStorage.removeItem('supply_draft');
        }
      }
    } catch (error) {
      console.error('❌ Error restoring draft:', error);
      localStorage.removeItem('supply_draft');
    }
  };

  // Clear draft when completed
  const clearSupplyDraft = () => {
    localStorage.removeItem('supply_draft');
    console.log('🗑️ Supply draft cleared');
  };

  // Clear ALL old temp data to free up storage space
  const clearOldTempData = () => {
    try {
      // Remove all draft-related items
      localStorage.removeItem('supply_draft');
      localStorage.removeItem('drum_supply_draft');
      localStorage.removeItem('loading_draft');
      
      // Remove any other temp/cache data
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('draft') || key.includes('temp') || key.includes('cache') || key.includes('blob'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      // Clear any blob URLs from supplyData
      setSupplyData(prev => ({
        ...prev,
        tankerMeterPhoto: undefined,
        tankLevelPhoto: undefined,
        hoseConnectionPhoto: undefined,
        finishMeterReadingPhoto: undefined,
        finalTankLevelPhoto: undefined
      }));
      
      toast({
        title: "Storage Cleared",
        description: "Old temporary data has been cleared. You can now save new transactions.",
        variant: "default"
      });
      
      console.log('🧹 All old temp data cleared from localStorage');
    } catch (error) {
      console.error('Error clearing temp data:', error);
      toast({
        title: "Clear Failed",
        description: "Could not clear storage. Please try refreshing the page.",
        variant: "destructive"
      });
    }
  };
  
  // Check localStorage usage
  const getStorageUsage = (): string => {
    try {
      let total = 0;
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          total += localStorage[key].length * 2; // UTF-16 = 2 bytes per char
        }
      }
      return (total / 1024 / 1024).toFixed(2); // Convert to MB
    } catch (e) {
      return '0';
    }
  };

  // Get last finished meter reading for auto-population
  useEffect(() => {
    const getLastMeterReading = async () => {
      try {
        const transactions = await getAllTransactions();
        const supplyTransactions = transactions.filter((t: any) => 
          t.type === 'supply' && t.endMeterReading
        ).sort((a: any, b: any) => {
          const aTime = new Date(a.timestamp?.toDate ? a.timestamp.toDate() : a.timestamp);
          const bTime = new Date(b.timestamp?.toDate ? b.timestamp.toDate() : b.timestamp);
          return bTime.getTime() - aTime.getTime();
        });
        
        if (supplyTransactions.length > 0) {
          const lastMeterReading = supplyTransactions[0].endMeterReading;
          setSupplyData(prev => ({ ...prev, startMeterReading: lastMeterReading }));
        }
      } catch (error) {
        console.error('Error getting last meter reading:', error);
      }
    };
    
    getLastMeterReading();
    restoreSupplyDraft(); // Restore any saved draft
  }, []);

  // Auto-save when supplyData changes in Step 2
  useEffect(() => {
    if (currentStep === 2) {
      saveSupplyDraft(supplyData, currentStep);
    }
  }, [supplyData, currentStep, selectedBranchData]);

  // Fetch branches and oil types
  const { data: branches = [] } = useQuery({ 
    queryKey: ['branches'], 
    queryFn: getActiveBranchesOnly 
  });
  const { data: oilTypes = [] } = useQuery({ 
    queryKey: ['oil-types'], 
    queryFn: getOilTypes 
  });

  // Filter oil types based on selected branch's oil tanks
  const getAvailableOilTypes = () => {
    if (!supplyData.branchId || !selectedBranchData) {
      return oilTypes; // If no branch selected, show all oil types
    }

    const selectedBranch = branches.find((branch: any) => branch.id === supplyData.branchId);
    if (!selectedBranch?.oilTanks) {
      return oilTypes; // If branch has no oil tanks defined, show all oil types
    }

    // Filter oil types to only show those assigned to this branch's tanks
    const branchOilTypeIds = selectedBranch.oilTanks.map((tank: any) => tank.oilTypeId);
    return oilTypes.filter((oilType: any) => branchOilTypeIds.includes(oilType.id));
  };

  const availableOilTypes = getAvailableOilTypes();

  const steps: SupplyStep[] = [
    { id: 1, title: 'Before Starting Pump', status: currentStep === 1 ? 'active' : currentStep > 1 ? 'completed' : 'pending' },
    { id: 2, title: 'After Loading Completes', status: currentStep === 2 ? 'active' : currentStep > 2 ? 'completed' : 'pending' },
  ];

  const handlePhotoCapture = async (photoBlob: Blob, photoType: string) => {
    try {
      // Convert blob to file for watermarking
      const originalFile = new File([photoBlob], `${photoType}_${Date.now()}.jpg`, {
        type: 'image/jpeg',
        lastModified: Date.now()
      });

      // Get branch name for watermarking
      const selectedBranch = selectedBranchData || branches.find(b => b.id === supplyData.branchId);
      const branchName = selectedBranch?.name || 'Unknown Branch';
      
      // Get driver name for watermarking (use displayName from userData, not email)
      const driverName = user?.displayName || 'Unknown Driver';
      
      // Apply watermark with supply-specific details
      const watermarkedFile = await safeWatermarkImage(originalFile, {
        branchName,
        timestamp: new Date(),
        extraLine1: `Driver: ${driverName}`,
        extraLine2: "Oil Type: Supply"
      });

      // Upload watermarked image
      const watermarkedBlob = new Blob([watermarkedFile], { type: 'image/jpeg' });
      const photoUrl = await uploadPhotoToFirebaseStorage(watermarkedBlob, 'delivery-photos');
      setSupplyData(prev => ({ ...prev, [`${photoType}Photo`]: photoUrl }));
      
      toast({
        title: "Photo Captured",
        description: `${photoType} photo saved successfully with watermark`
      });
    } catch (error) {
      console.error('Photo upload error:', error);
      // For demo purposes, create a local blob URL
      const localUrl = URL.createObjectURL(photoBlob);
      setSupplyData(prev => ({ ...prev, [`${photoType}Photo`]: localUrl }));
      toast({
        title: "Photo Saved Locally", 
        description: "Photo captured and saved for demo",
        variant: "default"
      });
    }
  };

  // Validation function for Step 1
  const validateStep1 = (data: SupplyData = supplyData, showErrors = false): { isValid: boolean; errors: typeof validationErrors; missingFields: string[] } => {
    const errors: typeof validationErrors = {};
    const missingFields: string[] = [];

    if (!data.deliveryOrderNo.trim()) {
      errors.deliveryOrderNo = true;
      missingFields.push("Order/Delivery Number");
    }

    if (!data.branchId) {
      errors.branchId = true;
      missingFields.push("Branch");
    }

    if (!data.oilTypeId) {
      errors.oilTypeId = true;
      missingFields.push("Oil Type");
    }

    if (!data.startMeterReading || data.startMeterReading <= 0) {
      errors.startMeterReading = true;
      missingFields.push("Start Meter Reading");
    }

    if (!data.tankerMeterPhoto) {
      errors.tankerMeterPhoto = true;
      missingFields.push("Start (Tanker Meter) Photo");
    }

    if (!data.tankLevelPhoto) {
      errors.tankLevelPhoto = true;
      missingFields.push("Tank Level Before Photo");
    }

    if (!data.hoseConnectionPhoto) {
      errors.hoseConnectionPhoto = true;
      missingFields.push("Hose Connection Photo");
    }

    if (showErrors) {
      setValidationErrors(prev => ({ ...prev, ...errors }));
    }

    return { isValid: missingFields.length === 0, errors, missingFields };
  };

  // Validation function for Step 2
  const validateStep2 = (data: SupplyData = supplyData, showErrors = false): { isValid: boolean; errors: typeof validationErrors; missingFields: string[] } => {
    const errors: typeof validationErrors = {};
    const missingFields: string[] = [];

    if (!data.endMeterReading || data.endMeterReading <= 0) {
      errors.endMeterReading = true;
      missingFields.push("End Meter Reading");
    } else if (data.startMeterReading > data.endMeterReading) {
      errors.endMeterReading = true;
      missingFields.push("End Meter (must be > Start Meter)");
    }

    if (!data.finishMeterReadingPhoto) {
      errors.finishMeterReadingPhoto = true;
      missingFields.push("End Reading Photo");
    }

    if (!data.finalTankLevelPhoto) {
      errors.finalTankLevelPhoto = true;
      missingFields.push("Tank Level After Photo");
    }

    if (showErrors) {
      setValidationErrors(prev => ({ ...prev, ...errors }));
    }

    return { isValid: missingFields.length === 0, errors, missingFields };
  };

  // Check validation whenever supplyData changes
  useEffect(() => {
    if (currentStep === 1) {
      validateStep1(supplyData, false);
    } else if (currentStep === 2) {
      validateStep2(supplyData, false);
    }
  }, [supplyData, currentStep]);

  const handleNextStep = () => {
    // Validate Step 1 before proceeding
    if (currentStep === 1) {
      const { isValid, missingFields } = validateStep1(supplyData, true);
      
      if (!isValid) {
        const errorMsg = `Please complete: ${missingFields.join(", ")}`;
        setInlineError(errorMsg);
        toast({
          title: "Missing Information",
          description: errorMsg,
          variant: "destructive"
        });
        return;
      }

      // All validations passed, proceed to Step 2
      setInlineError(null);
      setValidationErrors({});
      setCurrentStep(2);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setInlineError(null); // Clear any error when going back
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCloseAttempt = () => {
    if (currentStep === 2) {
      // In Step 2, show confirmation dialog
      setShowExitConfirmDialog(true);
      return;
    }
    // Allow closing if in Step 1
    onClose(false);
  };

  const handleConfirmExit = () => {
    clearSupplyDraft();
    setShowExitConfirmDialog(false);
    onClose(false);
  };

  const handleCancelExit = () => {
    setShowExitConfirmDialog(false);
  };

  const handleCompleteSupply = async () => {
    if (isSubmitting) return; // Prevent double submission

    // Validate Step 2
    const { isValid, missingFields } = validateStep2(supplyData, true);
    
    if (!isValid) {
      const errorMsg = `Please complete: ${missingFields.join(", ")}`;
      setInlineError(errorMsg);
      toast({
        title: "Missing Information",
        description: errorMsg,
        variant: "destructive"
      });
      return;
    }

    try {
      setIsSubmitting(true);
      setInlineError(null); // Clear previous errors

      // Calculate oil supplied from meter readings
      const oilSuppliedLiters = Number(supplyData.endMeterReading) - Number(supplyData.startMeterReading);
      
      if (isNaN(oilSuppliedLiters) || oilSuppliedLiters <= 0) {
        throw new Error(`Invalid supply quantity: ${oilSuppliedLiters}L. Check meter readings.`);
      }

      console.log(`Supplying ${oilSuppliedLiters}L calculated from meter readings (${supplyData.endMeterReading} - ${supplyData.startMeterReading})`);

      // Submit delivery completion directly to Firestore
      const selectedOilType = (oilTypes as any[]).find((oil: any) => oil.id === supplyData.oilTypeId);
      const selectedBranch = (branches as any[]).find((branch: any) => branch.id === supplyData.branchId);
      
      if (!selectedBranch) {
        console.error('Branch not found in local state:', supplyData.branchId, branches);
      }
      
      const driverName = user?.name || user?.displayName || user?.username || user?.email || 'Unknown Driver';
      const driverUid = user?.id || user?.uid || 'unknown_driver';

      const deliveryRecord = {
        loadSessionId: await getNextFormattedId('direct_sessions'), // Generate formatted session ID
        deliveryOrderId: supplyData.deliveryOrderNo || await getNextFormattedId('delivery_orders'),
        branchId: supplyData.branchId,
        branchName: selectedBranch?.name || selectedBranchData?.name || 'Unknown Branch',
        oilTypeId: supplyData.oilTypeId,
        oilTypeName: selectedOilType?.name || 'Unknown Oil Type',
        oilSuppliedLiters: oilSuppliedLiters,
        deliveredLiters: oilSuppliedLiters,
        startMeterReading: Number(supplyData.startMeterReading),
        endMeterReading: Number(supplyData.endMeterReading),
        driverName,
        driverUid,
        
        photos: {
          tankLevelBefore: supplyData.tankLevelPhoto || null,
          hoseConnection: supplyData.hoseConnectionPhoto || null,
          tankLevelAfter: supplyData.finalTankLevelPhoto || null,
          tankerMeter: supplyData.tankerMeterPhoto || null,
          finishMeterReading: supplyData.finishMeterReadingPhoto || null
        },
        
        actualDeliveryStartTime: new Date(),
        actualDeliveryEndTime: new Date(),
        status: 'completed',
      };

      console.log('Sending delivery record to completeDelivery:', deliveryRecord);
      const result = await completeDelivery(deliveryRecord);
      console.log('Delivery transaction saved to Firestore:', result);
      
      // Photos should already have correct watermarks from the two-step approach
      const branchName = selectedBranchData?.name || selectedBranch?.name || 'Unknown Branch';
      console.log('✅ Transaction completed with correct branch watermarks:', branchName);
      
      toast({
        title: "Delivery Completed",
        description: `Successfully delivered ${oilSuppliedLiters}L to ${branchName}`
      });
      
      // Clear draft and reset form
      clearSupplyDraft();
      setSupplyData({
        deliveryOrderNo: '',
        branchId: '',
        oilTypeId: '',
        startMeterReading: 0,
        endMeterReading: 0,
        oilSuppliedLiters: 0,
      });
      setSelectedBranchData(null); // Reset branch data
      setCurrentStep(1);
      onClose(true); // Close and return to dashboard with completion flag
    } catch (error: any) {
      console.error('Supply completion error:', error);
      const errorMsg = error?.message || "Failed to complete delivery. Please try again.";
      setInlineError(errorMsg);
      toast({
        title: "Supply Failed",
        description: errorMsg,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };



  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-4 overflow-x-hidden">
      <Card className="max-w-4xl mx-auto bg-white shadow-lg">
        <CardHeader className="text-center bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-t-lg py-3 sm:py-4">
          <div className="flex items-center justify-center space-x-2 mb-2 sm:mb-3">
            <TruckIcon className="w-5 h-5 sm:w-6 sm:h-6" />
            <CardTitle className="text-lg sm:text-xl font-bold">Oil Supply Workflow</CardTitle>
          </div>
          <div className="flex justify-center space-x-2 sm:space-x-4">
            {steps.map((step) => (
              <div key={step.id} className="flex items-center">
                <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold ${
                  step.status === 'completed' ? 'bg-green-500' :
                  step.status === 'active' ? 'bg-white text-orange-500' :
                  'bg-gray-300 text-gray-600'
                }`}>
                  {step.status === 'completed' ? <CheckIcon className="w-3 h-3 sm:w-4 sm:h-4" /> : step.id}
                </div>
                <span className="ml-1 sm:ml-2 text-xs sm:text-sm">{step.title}</span>
              </div>
            ))}
          </div>
          {/* Storage Cleanup Button - Small and subtle */}
          <div className="mt-3 flex justify-center">
            <button
              onClick={clearOldTempData}
              className="text-xs bg-white/20 hover:bg-white/30 text-white px-2 py-1 rounded flex items-center gap-1 transition-colors"
              title="Clear old temporary data to fix storage issues"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Clear Old Data ({getStorageUsage()} MB used)
            </button>
          </div>
        </CardHeader>

        <CardContent className="p-3 sm:p-6 space-y-4 sm:space-y-6 bg-white">
          {/* Inline Error Display - Shows validation errors prominently at top of modal */}
          {inlineError && (
            <div className="bg-red-50 border-2 border-red-500 rounded-lg p-4 animate-pulse">
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h4 className="font-bold text-red-800 text-base">Missing Required Information</h4>
                  <p className="text-red-700 text-sm mt-1">{inlineError}</p>
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Before Starting the Pump */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="text-center bg-blue-50 p-2 rounded-lg border border-blue-200">
                <h3 className="text-base font-semibold text-blue-800">Step 1: Before Starting Pump</h3>
              </div>

              {/* Order and Selection Fields */}
              <div className="space-y-4">
                {/* Delivery Order */}
                <div className="space-y-2">
                  <Label htmlFor="deliveryOrder" className={`text-base font-semibold ${validationErrors.deliveryOrderNo ? 'text-red-600' : 'text-gray-800'}`}>
                    Order/Delivery Number {validationErrors.deliveryOrderNo && <span className="text-red-500">*</span>}
                  </Label>
                  <Input
                    id="deliveryOrder"
                    type="text"
                    value={supplyData.deliveryOrderNo}
                    onChange={(e) => {
                      setSupplyData(prev => ({ ...prev, deliveryOrderNo: e.target.value }));
                      if (validationErrors.deliveryOrderNo) {
                        setValidationErrors(prev => ({ ...prev, deliveryOrderNo: false }));
                      }
                    }}
                    placeholder="Enter delivery order number"
                    data-testid="input-delivery-order"
                    className={`bg-white border-3 h-12 text-lg ${validationErrors.deliveryOrderNo ? 'border-red-500 focus:border-red-500' : 'border-gray-400 focus:border-orange-500'}`}
                  />
                  {validationErrors.deliveryOrderNo && <p className="text-xs text-red-500">Required field</p>}
                </div>

                {/* Branch Selection */}
                <div className="space-y-2">
                  <Label htmlFor="branch" className={`text-base font-semibold ${validationErrors.branchId ? 'text-red-600' : 'text-gray-800'}`}>
                    Branch {validationErrors.branchId && <span className="text-red-500">*</span>}
                  </Label>
                  <Select 
                    value={supplyData.branchId} 
                    onValueChange={(value) => {
                      console.log('Step 1 - Branch dropdown changed to:', value);
                      const selectedBranch = branches.find((b: any) => b.id === value);
                      console.log('Step 1 - Selected branch object:', selectedBranch);
                      
                      if (selectedBranch) {
                        const branchData = {
                          id: selectedBranch.id,
                          name: selectedBranch.name,
                          address: selectedBranch.address
                        };
                        setSelectedBranchData(branchData);
                        console.log('✓ STEP 1 - BRANCH DATA SAVED:', branchData);
                      }
                      
                      setSupplyData(prev => {
                        // Always clear oil type on branch change for clarity
                        const newState = { ...prev, branchId: value, oilTypeId: '' };
                        console.log('Step 1 - Updated supplyData:', newState);
                        return newState;
                      });
                      if (validationErrors.branchId) {
                        setValidationErrors(prev => ({ ...prev, branchId: false }));
                      }
                    }}
                  >
                    <SelectTrigger data-testid="select-branch" className={`h-12 text-lg border-3 ${validationErrors.branchId ? 'border-red-500 focus:border-red-500' : 'border-gray-400 focus:border-orange-500'}`}>
                      <SelectValue placeholder="Select delivery branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((branch: any) => (
                        <SelectItem key={branch.id} value={branch.id} className="text-lg py-3">
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {validationErrors.branchId && <p className="text-xs text-red-500">Required field</p>}
                </div>

                {/* Oil Type Selection */}
                <div className="space-y-2">
                  <Label htmlFor="oilType" className={`text-base font-semibold ${validationErrors.oilTypeId ? 'text-red-600' : 'text-gray-800'}`}>
                    Oil Type {validationErrors.oilTypeId && <span className="text-red-500">*</span>}
                  </Label>
                  <Select 
                    value={supplyData.oilTypeId} 
                    onValueChange={(value) => {
                      setSupplyData(prev => ({ ...prev, oilTypeId: value }));
                      if (validationErrors.oilTypeId) {
                        setValidationErrors(prev => ({ ...prev, oilTypeId: false }));
                      }
                    }}
                    disabled={!supplyData.branchId}
                  >
                    <SelectTrigger data-testid="select-oil-type" className={`h-12 text-lg border-3 ${validationErrors.oilTypeId ? 'border-red-500 focus:border-red-500' : 'border-gray-400 focus:border-orange-500'}`}>
                      <SelectValue placeholder="Select oil type" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableOilTypes.map((oilType: any) => (
                        <SelectItem key={oilType.id} value={oilType.id} className="text-lg py-3">
                          {oilType.name} - {oilType.viscosity}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!supplyData.branchId && (
                    <p className="text-sm text-gray-500 mt-1">Select a branch first</p>
                  )}
                  {validationErrors.oilTypeId && supplyData.branchId && <p className="text-xs text-red-500">Required field</p>}
                </div>

                {/* Start Meter Reading */}
                <div className="space-y-2">
                  <Label htmlFor="startMeter" className={`text-base font-semibold ${validationErrors.startMeterReading ? 'text-red-600' : 'text-gray-800'}`}>
                    Start Meter Reading {validationErrors.startMeterReading && <span className="text-red-500">*</span>}
                  </Label>
                  <Input
                    id="startMeter"
                    type="number"
                    value={supplyData.startMeterReading || ''}
                    onChange={(e) => {
                      setSupplyData(prev => ({ ...prev, startMeterReading: Number(e.target.value) }));
                      if (validationErrors.startMeterReading) {
                        setValidationErrors(prev => ({ ...prev, startMeterReading: false }));
                      }
                    }}
                    placeholder="Auto-filled from last supply"
                    data-testid="input-start-meter"
                    className={`bg-white border-3 h-12 text-lg ${validationErrors.startMeterReading ? 'border-red-500 focus:border-red-500' : 'border-gray-400 focus:border-orange-500'}`}
                  />
                  <p className={`text-sm ${validationErrors.startMeterReading ? 'text-red-500' : 'text-blue-600'}`}>
                    {validationErrors.startMeterReading ? 'Required field - must be greater than 0' : 'Auto-filled with last finished meter reading'}
                  </p>
                </div>
              </div>

              {/* Photo Capture Section for Step 1 */}
              <div className="space-y-4">
                <h4 className={`text-lg font-semibold border-b pb-2 ${Object.values(validationErrors).some((e, i) => ['tankerMeterPhoto', 'tankLevelPhoto', 'hoseConnectionPhoto'][i] && e) ? 'text-red-600' : 'text-gray-800'}`}>
                  Required Photos {Object.values(validationErrors).some((e, i) => ['tankerMeterPhoto', 'tankLevelPhoto', 'hoseConnectionPhoto'][i] && e) && <span className="text-red-500">*</span>}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  
                  {/* Tanker Meter Photo */}
                  <div className="text-center">
                    <div className={`p-2 rounded-lg ${validationErrors.tankerMeterPhoto ? 'bg-red-50 border-2 border-red-300' : ''}`}>
                      <PhotoCaptureButton 
                        onCapture={(blob: Blob, timestamp: string) => {
                          handlePhotoCapture(blob, 'tankerMeter');
                          if (validationErrors.tankerMeterPhoto) {
                            setValidationErrors(prev => ({ ...prev, tankerMeterPhoto: false }));
                          }
                        }}
                        className={`text-white px-3 py-3 text-sm w-full h-16 ${validationErrors.tankerMeterPhoto ? 'bg-red-500 hover:bg-red-600' : 'bg-orange-500 hover:bg-orange-600'}`}
                        title="Start (Tanker Meter)"
                        branchName={selectedBranchData?.name || 'No Branch Selected'}
                      >
                        <GaugeIcon className="w-4 h-4 mr-2" />
                        Start (Tanker Meter)
                        {validationErrors.tankerMeterPhoto && <span className="ml-1">*</span>}
                      </PhotoCaptureButton>
                      {validationErrors.tankerMeterPhoto && <p className="text-xs text-red-600 mt-1">Required photo</p>}
                    </div>
                    {supplyData.tankerMeterPhoto && (
                      <div className="mt-2 flex flex-col items-center">
                        <div className="relative group cursor-pointer"
                             onClick={() => onPhotoClick && onPhotoClick(supplyData.tankerMeterPhoto!, 'Tanker Meter Photo')}>
                          <img 
                            src={supplyData.tankerMeterPhoto} 
                            alt="Tanker Meter" 
                            className="w-16 h-16 object-cover rounded-lg border hover:opacity-90 transition-opacity"
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all rounded-lg flex items-center justify-center">
                            <ImageIcon className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </div>
                        <Badge variant="secondary" className="mt-1 text-xs">Photo Captured</Badge>
                      </div>
                    )}
                  </div>

                  {/* Tank Level Before */}
                  <div className="text-center">
                    <div className={`p-2 rounded-lg ${validationErrors.tankLevelPhoto ? 'bg-red-50 border-2 border-red-300' : ''}`}>
                      <PhotoCaptureButton 
                        onCapture={(blob: Blob, timestamp: string) => {
                          handlePhotoCapture(blob, 'tankLevel');
                          if (validationErrors.tankLevelPhoto) {
                            setValidationErrors(prev => ({ ...prev, tankLevelPhoto: false }));
                          }
                        }}
                        className={`text-white px-3 py-3 text-sm w-full h-16 ${validationErrors.tankLevelPhoto ? 'bg-red-500 hover:bg-red-600' : 'bg-orange-500 hover:bg-orange-600'}`}
                        title="Branch Tank Level Before"
                        branchName={selectedBranchData?.name || 'No Branch Selected'}
                      >
                        <GaugeIcon className="w-4 h-4 mr-2" />
                        Tank Level Before
                        {validationErrors.tankLevelPhoto && <span className="ml-1">*</span>}
                      </PhotoCaptureButton>
                      {validationErrors.tankLevelPhoto && <p className="text-xs text-red-600 mt-1">Required photo</p>}
                    </div>
                    {supplyData.tankLevelPhoto && (
                      <div className="mt-2 flex flex-col items-center">
                        <div className="relative group cursor-pointer"
                             onClick={() => onPhotoClick && onPhotoClick(supplyData.tankLevelPhoto!, 'Tank Level Before Photo')}>
                          <img 
                            src={supplyData.tankLevelPhoto} 
                            alt="Tank Level Before" 
                            className="w-16 h-16 object-cover rounded-lg border hover:opacity-90 transition-opacity"
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all rounded-lg flex items-center justify-center">
                            <ImageIcon className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </div>
                        <Badge variant="secondary" className="mt-1 text-xs">Photo Captured</Badge>
                      </div>
                    )}
                  </div>

                  {/* Hose Connection */}
                  <div className="text-center">
                    <div className={`p-2 rounded-lg ${validationErrors.hoseConnectionPhoto ? 'bg-red-50 border-2 border-red-300' : ''}`}>
                      <PhotoCaptureButton 
                        onCapture={(blob: Blob, timestamp: string) => {
                          handlePhotoCapture(blob, 'hoseConnection');
                          if (validationErrors.hoseConnectionPhoto) {
                            setValidationErrors(prev => ({ ...prev, hoseConnectionPhoto: false }));
                          }
                        }}
                        className={`text-white px-3 py-3 text-sm w-full h-16 ${validationErrors.hoseConnectionPhoto ? 'bg-red-500 hover:bg-red-600' : 'bg-orange-500 hover:bg-orange-600'}`}
                        title="Hose Connection"
                        branchName={selectedBranchData?.name || 'No Branch Selected'}
                      >
                        <DropletIcon className="w-4 h-4 mr-2" />
                        Hose Connection
                        {validationErrors.hoseConnectionPhoto && <span className="ml-1">*</span>}
                      </PhotoCaptureButton>
                      {validationErrors.hoseConnectionPhoto && <p className="text-xs text-red-600 mt-1">Required photo</p>}
                    </div>
                    {supplyData.hoseConnectionPhoto && (
                      <div className="mt-2 flex flex-col items-center">
                        <div className="relative group cursor-pointer"
                             onClick={() => onPhotoClick && onPhotoClick(supplyData.hoseConnectionPhoto!, 'Hose Connection Photo')}>
                          <img 
                            src={supplyData.hoseConnectionPhoto} 
                            alt="Hose Connection" 
                            className="w-16 h-16 object-cover rounded-lg border hover:opacity-90 transition-opacity"
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all rounded-lg flex items-center justify-center">
                            <ImageIcon className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </div>
                        <Badge variant="secondary" className="mt-1 text-xs">Photo Captured</Badge>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Missing Fields Summary - Shows above button when incomplete */}
              {(() => {
                const { isValid, missingFields } = validateStep1(supplyData, false);
                if (!isValid) {
                  return (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                      <p className="text-sm text-red-700 font-medium">
                        Complete to proceed: {missingFields.join(", ")}
                      </p>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Action Buttons for Step 1 */}
              <div className="flex flex-col sm:flex-row justify-between gap-3 pt-4">
                <Button 
                  variant="outline" 
                  onClick={handleCloseAttempt}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                {(() => {
                  const { isValid, missingFields } = validateStep1(supplyData, false);
                  return (
                    <div className="w-full sm:w-auto">
                      <Button 
                        onClick={handleNextStep}
                        disabled={!isValid}
                        className={`w-full ${isValid ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700' : 'bg-gray-400 cursor-not-allowed'}`}
                        data-testid="button-next-step"
                        title={!isValid ? `Missing: ${missingFields.join(", ")}` : ""}
                      >
                        <ArrowRightIcon className="w-4 h-4 mr-2" />
                        Next - Start Oil Loading
                      </Button>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Step 2: After Loading Completes */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="text-center bg-green-50 p-2 rounded-lg border border-green-200">
                <h3 className="text-base font-semibold text-green-800">Step 2: After Loading Completes</h3>
                <div className="mt-2 grid grid-cols-3 gap-1 text-xs">
                  <div className={`flex items-center justify-center ${supplyData.endMeterReading ? 'text-green-700' : 'text-red-600'}`}>
                    {supplyData.endMeterReading ? '✅' : '❌'} Meter
                  </div>
                  <div className={`flex items-center justify-center ${supplyData.finishMeterReadingPhoto ? 'text-green-700' : 'text-red-600'}`}>
                    {supplyData.finishMeterReadingPhoto ? '✅' : '❌'} Photo 1
                  </div>
                  <div className={`flex items-center justify-center ${supplyData.finalTankLevelPhoto ? 'text-green-700' : 'text-red-600'}`}>
                    {supplyData.finalTankLevelPhoto ? '✅' : '❌'} Photo 2
                  </div>
                </div>
              </div>

              {/* End Meter Reading */}
              <div className="space-y-2">
                <Label htmlFor="endMeter" className={`text-base font-semibold ${validationErrors.endMeterReading ? 'text-red-600' : 'text-gray-800'}`}>
                  End Meter Reading {validationErrors.endMeterReading && <span className="text-red-500">*</span>}
                </Label>
                <Input
                  id="endMeter"
                  type="number"
                  value={supplyData.endMeterReading === 0 ? '' : supplyData.endMeterReading}
                  onChange={(e) => {
                    setSupplyData(prev => ({ ...prev, endMeterReading: Number(e.target.value) || 0 }));
                    if (validationErrors.endMeterReading) {
                      setValidationErrors(prev => ({ ...prev, endMeterReading: false }));
                    }
                  }}
                  placeholder="Meter reading after supply"
                  data-testid="input-end-meter"
                  className={`bg-white border-3 h-12 text-lg ${
                    validationErrors.endMeterReading 
                      ? 'border-red-500 focus:border-red-500' 
                      : 'border-gray-400 focus:border-orange-500'
                  }`}
                />
                {validationErrors.endMeterReading && supplyData.endMeterReading > 0 && supplyData.startMeterReading > supplyData.endMeterReading && (
                  <p className="text-sm text-red-600">
                    ⚠️ End meter reading must be greater than start meter reading ({supplyData.startMeterReading})
                  </p>
                )}
                {validationErrors.endMeterReading && (!supplyData.endMeterReading || supplyData.endMeterReading <= 0) && (
                  <p className="text-sm text-red-500">Required field - must be greater than 0</p>
                )}
              </div>

              {/* Calculate Oil Supplied */}
              {supplyData.endMeterReading > supplyData.startMeterReading && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="text-lg font-semibold text-blue-800 mb-2">Oil Supplied</h4>
                  <p className="text-2xl font-bold text-blue-900">
                    {supplyData.endMeterReading - supplyData.startMeterReading} Liters
                  </p>
                  <p className="text-sm text-blue-600">Calculated from meter readings</p>
                </div>
              )}

              {/* Photo Capture Section for Step 2 */}
              <div className="space-y-4">
                <h4 className={`text-lg font-semibold border-b pb-2 ${(validationErrors.finishMeterReadingPhoto || validationErrors.finalTankLevelPhoto) ? 'text-red-600' : 'text-gray-800'}`}>
                  Final Photos {(validationErrors.finishMeterReadingPhoto || validationErrors.finalTankLevelPhoto) && <span className="text-red-500">*</span>}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* Finish Meter Reading Photo */}
                  <div className="text-center">
                    <div className={`p-2 rounded-lg ${validationErrors.finishMeterReadingPhoto ? 'bg-red-50 border-2 border-red-300' : ''}`}>
                      <PhotoCaptureButton 
                        onCapture={(blob: Blob, timestamp: string) => {
                          handlePhotoCapture(blob, 'finishMeterReading');
                          if (validationErrors.finishMeterReadingPhoto) {
                            setValidationErrors(prev => ({ ...prev, finishMeterReadingPhoto: false }));
                          }
                        }}
                        className={`text-white px-3 py-3 text-sm w-full h-16 ${validationErrors.finishMeterReadingPhoto ? 'bg-red-500 hover:bg-red-600' : 'bg-orange-500 hover:bg-orange-600'}`}
                        title="End Reading (Tanker Meter)"
                        branchName={selectedBranchData?.name || 'No Branch Selected'}
                      >
                        <GaugeIcon className="w-4 h-4 mr-2" />
                        End Reading (Tanker Meter)
                        {validationErrors.finishMeterReadingPhoto && <span className="ml-1">*</span>}
                      </PhotoCaptureButton>
                      {validationErrors.finishMeterReadingPhoto && <p className="text-xs text-red-600 mt-1">Required photo</p>}
                    </div>
                    {supplyData.finishMeterReadingPhoto && (
                      <div className="mt-2 flex flex-col items-center">
                        <div className="relative group cursor-pointer"
                             onClick={() => onPhotoClick && onPhotoClick(supplyData.finishMeterReadingPhoto!, 'Finish Meter Reading Photo')}>
                          <img 
                            src={supplyData.finishMeterReadingPhoto} 
                            alt="Finish Meter Reading" 
                            className="w-16 h-16 object-cover rounded-lg border hover:opacity-90 transition-opacity"
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all rounded-lg flex items-center justify-center">
                            <ImageIcon className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </div>
                        <Badge variant="secondary" className="mt-1 text-xs">Photo Captured</Badge>
                      </div>
                    )}
                  </div>

                  {/* Tank Level After */}
                  <div className="text-center">
                    <div className={`p-2 rounded-lg ${validationErrors.finalTankLevelPhoto ? 'bg-red-50 border-2 border-red-300' : ''}`}>
                      <PhotoCaptureButton 
                        onCapture={(blob: Blob, timestamp: string) => {
                          handlePhotoCapture(blob, 'finalTankLevel');
                          if (validationErrors.finalTankLevelPhoto) {
                            setValidationErrors(prev => ({ ...prev, finalTankLevelPhoto: false }));
                          }
                        }}
                        className={`text-white px-3 py-3 text-sm w-full h-16 ${validationErrors.finalTankLevelPhoto ? 'bg-red-500 hover:bg-red-600' : 'bg-orange-500 hover:bg-orange-600'}`}
                        title="Branch Tank Level After"
                        branchName={selectedBranchData?.name || 'No Branch Selected'}
                      >
                        <GaugeIcon className="w-4 h-4 mr-2" />
                        Tank Level After
                        {validationErrors.finalTankLevelPhoto && <span className="ml-1">*</span>}
                      </PhotoCaptureButton>
                      {validationErrors.finalTankLevelPhoto && <p className="text-xs text-red-600 mt-1">Required photo</p>}
                    </div>
                    {supplyData.finalTankLevelPhoto && (
                      <div className="mt-2 flex flex-col items-center">
                        <div className="relative group cursor-pointer"
                             onClick={() => onPhotoClick && onPhotoClick(supplyData.finalTankLevelPhoto!, 'Tank Level After Photo')}>
                          <img 
                            src={supplyData.finalTankLevelPhoto} 
                            alt="Tank Level After" 
                            className="w-16 h-16 object-cover rounded-lg border hover:opacity-90 transition-opacity"
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all rounded-lg flex items-center justify-center">
                            <ImageIcon className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </div>
                        <Badge variant="secondary" className="mt-1 text-xs">Photo Captured</Badge>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Missing Fields Summary for Step 2 */}
              {(() => {
                const { isValid, missingFields } = validateStep2(supplyData, false);
                if (!isValid) {
                  return (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-sm text-red-700 font-medium">
                        Complete to proceed: {missingFields.join(", ")}
                      </p>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Action Buttons for Step 2 */}
              <div className="flex flex-col gap-3 pt-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800 font-medium">
                    ⚠️ Important: You must complete all required fields and photos before finishing this step. 
                    This prevents data loss and ensures accurate record keeping.
                  </p>
                </div>
                
                {/* Back to Step 1 and Complete Supply Buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button 
                    variant="outline"
                    onClick={() => setCurrentStep(1)}
                    disabled={isSubmitting}
                    className="w-full sm:w-auto"
                    data-testid="button-back-to-step1"
                  >
                    <ArrowLeftIcon className="w-4 h-4 mr-2" />
                    Back to Step 1
                  </Button>
                  
                  {(() => {
                    const { isValid, missingFields } = validateStep2(supplyData, false);
                    return (
                      <Button 
                        onClick={handleCompleteSupply}
                        disabled={isSubmitting || !isValid}
                        className={`w-full sm:flex-1 ${isValid ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700' : 'bg-gray-400 cursor-not-allowed'}`}
                        data-testid="button-complete-supply"
                        title={!isValid ? `Missing: ${missingFields.join(", ")}` : ""}
                      >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <CheckIcon className="w-4 h-4 mr-2" />
                        Complete Supply {!supplyData.endMeterReading || !supplyData.finishMeterReadingPhoto || !supplyData.finalTankLevelPhoto ? "(Missing Required Items)" : ""}
                      </>
                    )}
                  </Button>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Exit Confirmation Dialog */}
      <Dialog open={showExitConfirmDialog} onOpenChange={setShowExitConfirmDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Exit Step 2?</DialogTitle>
            <DialogDescription>
              You haven't finished Step 2. If you exit now, all progress will be lost. Do you want to continue?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={handleCancelExit}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmExit}>
              Exit Anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
