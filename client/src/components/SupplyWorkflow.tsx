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

  const handleNextStep = () => {
    // Validate Step 1 before proceeding
    if (currentStep === 1) {
      // Check all required fields
      if (!supplyData.deliveryOrderNo.trim()) {
        toast({
          title: "Missing Information",
          description: "Please enter the Order/Delivery Number",
          variant: "destructive"
        });
        return;
      }

      if (!supplyData.branchId) {
        toast({
          title: "Missing Information", 
          description: "Please select a Branch",
          variant: "destructive"
        });
        return;
      }

      if (!supplyData.oilTypeId) {
        toast({
          title: "Missing Information",
          description: "Please select an Oil Type", 
          variant: "destructive"
        });
        return;
      }

      if (!supplyData.startMeterReading || supplyData.startMeterReading <= 0) {
        toast({
          title: "Missing Information",
          description: "Please enter the Start Meter Reading",
          variant: "destructive"
        });
        return;
      }

      // Check all required photos
      if (!supplyData.tankerMeterPhoto) {
        toast({
          title: "Missing Required Photo",
          description: "Please take the Start (Tanker Meter) photo",
          variant: "destructive"
        });
        return;
      }

      if (!supplyData.tankLevelPhoto) {
        toast({
          title: "Missing Required Photo", 
          description: "Please take the Tank Level Before photo",
          variant: "destructive"
        });
        return;
      }

      if (!supplyData.hoseConnectionPhoto) {
        toast({
          title: "Missing Required Photo",
          description: "Please take the Hose Connection photo", 
          variant: "destructive"
        });
        return;
      }

      // All validations passed, proceed to Step 2
      setCurrentStep(2);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
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

    try {
      setIsSubmitting(true);

      // Validate required fields for Step 2
      if (!supplyData.branchId || !supplyData.oilTypeId || !supplyData.endMeterReading) {
        toast({
          title: "Missing Information",
          description: "Please fill in all required fields",
          variant: "destructive"
        });
        return;
      }

      // Validate required photos for Step 2
      if (!supplyData.finishMeterReadingPhoto || !supplyData.finalTankLevelPhoto) {
        toast({
          title: "Missing Required Photos",
          description: "Please take both End Reading (Tanker Meter) and Tank Level After photos before completing",
          variant: "destructive"
        });
        return;
      }

      // Validate meter readings - start cannot be greater than end
      if (supplyData.startMeterReading > supplyData.endMeterReading) {
        toast({
          title: "Invalid Meter Readings",
          description: "Start meter reading cannot be greater than finish meter reading",
          variant: "destructive"
        });
        return;
      }

      // Calculate oil supplied from meter readings
      const oilSuppliedLiters = supplyData.endMeterReading - supplyData.startMeterReading;
      
      console.log(`Supplying ${oilSuppliedLiters}L calculated from meter readings (${supplyData.endMeterReading} - ${supplyData.startMeterReading})`);

      // Submit delivery completion directly to Firestore
      const selectedOilType = (oilTypes as any[]).find((oil: any) => oil.id === supplyData.oilTypeId);
      const selectedBranch = (branches as any[]).find((branch: any) => branch.id === supplyData.branchId);
      
      const deliveryRecord = {
        loadSessionId: await getNextFormattedId('direct_sessions'), // Generate formatted session ID
        deliveryOrderId: supplyData.deliveryOrderNo || await getNextFormattedId('delivery_orders'),
        branchId: supplyData.branchId,
        branchName: selectedBranch?.name || 'Unknown Branch',
        oilTypeId: supplyData.oilTypeId,
        oilTypeName: selectedOilType?.name || 'Unknown Oil Type',
        oilSuppliedLiters: oilSuppliedLiters, // FIXED: Use correct field name
        deliveredLiters: oilSuppliedLiters,   // Keep for compatibility
        startMeterReading: supplyData.startMeterReading,
        endMeterReading: supplyData.endMeterReading,
        driverName: user?.displayName || user?.email || 'Unknown Driver', // Add driver name
        driverUid: user?.uid, // Add driver UID for consistency
        
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
    } catch (error) {
      console.error('Supply completion error:', error);
      toast({
        title: "Supply Failed",
        description: "Failed to complete delivery. Please try again.",
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
        </CardHeader>

        <CardContent className="p-3 sm:p-6 space-y-4 sm:space-y-6 bg-white">
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
                  <Label htmlFor="deliveryOrder" className="text-base font-semibold text-gray-800">Order/Delivery Number</Label>
                  <Input
                    id="deliveryOrder"
                    type="text"
                    value={supplyData.deliveryOrderNo}
                    onChange={(e) => setSupplyData(prev => ({ ...prev, deliveryOrderNo: e.target.value }))}
                    placeholder="Enter delivery order number"
                    data-testid="input-delivery-order"
                    className="bg-white border-3 border-gray-400 focus:border-orange-500 h-12 text-lg"
                  />
                </div>

                {/* Branch Selection */}
                <div className="space-y-2">
                  <Label htmlFor="branch" className="text-base font-semibold text-gray-800">Branch *</Label>
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
                        // Clear oil type selection if it's not available for the new branch
                        let oilTypeId = prev.oilTypeId;
                        if (selectedBranch?.oilTanks) {
                          const branchOilTypeIds = selectedBranch.oilTanks.map((tank: any) => tank.oilTypeId);
                          if (oilTypeId && !branchOilTypeIds.includes(oilTypeId)) {
                            oilTypeId = ''; // Clear if not available for this branch
                          }
                        }
                        
                        const newState = { ...prev, branchId: value, oilTypeId };
                        console.log('Step 1 - Updated supplyData:', newState);
                        return newState;
                      });
                    }}
                  >
                    <SelectTrigger data-testid="select-branch" className="h-12 text-lg border-3 border-gray-400 focus:border-orange-500">
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
                </div>

                {/* Oil Type Selection */}
                <div className="space-y-2">
                  <Label htmlFor="oilType" className="text-base font-semibold text-gray-800">Oil Type *</Label>
                  <Select 
                    value={supplyData.oilTypeId} 
                    onValueChange={(value) => setSupplyData(prev => ({ ...prev, oilTypeId: value }))}
                  >
                    <SelectTrigger data-testid="select-oil-type" className="h-12 text-lg border-3 border-gray-400 focus:border-orange-500">
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
                </div>

                {/* Start Meter Reading */}
                <div className="space-y-2">
                  <Label htmlFor="startMeter" className="text-base font-semibold text-gray-800">Start Meter Reading *</Label>
                  <Input
                    id="startMeter"
                    type="number"
                    value={supplyData.startMeterReading || ''}
                    onChange={(e) => setSupplyData(prev => ({ ...prev, startMeterReading: Number(e.target.value) }))}
                    placeholder="Auto-filled from last supply"
                    data-testid="input-start-meter"
                    className="bg-white border-3 border-gray-400 focus:border-orange-500 h-12 text-lg"
                  />
                  <p className="text-sm text-blue-600">Auto-filled with last finished meter reading</p>
                </div>
              </div>

              {/* Photo Capture Section for Step 1 */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-gray-800 border-b pb-2">Required Photos</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  
                  {/* Tanker Meter Photo */}
                  <div className="text-center">
                    <PhotoCaptureButton 
                      onCapture={(blob: Blob, timestamp: string) => handlePhotoCapture(blob, 'tankerMeter')}
                      className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-3 text-sm w-full h-16"
                      title="Start (Tanker Meter)"
                      branchName={selectedBranchData?.name || 'No Branch Selected'}
                    >
                      <GaugeIcon className="w-4 h-4 mr-2" />
                      Start (Tanker Meter)
                    </PhotoCaptureButton>
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
                    <PhotoCaptureButton 
                      onCapture={(blob: Blob, timestamp: string) => handlePhotoCapture(blob, 'tankLevel')}
                      className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-3 text-sm w-full h-16"
                      title="Branch Tank Level Before"
                      branchName={selectedBranchData?.name || 'No Branch Selected'}
                    >
                      <GaugeIcon className="w-4 h-4 mr-2" />
                      Tank Level Before
                    </PhotoCaptureButton>
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
                    <PhotoCaptureButton 
                      onCapture={(blob: Blob, timestamp: string) => handlePhotoCapture(blob, 'hoseConnection')}
                      className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-3 text-sm w-full h-16"
                      title="Hose Connection"
                      branchName={selectedBranchData?.name || 'No Branch Selected'}
                    >
                      <DropletIcon className="w-4 h-4 mr-2" />
                      Hose Connection
                    </PhotoCaptureButton>
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

              {/* Action Buttons for Step 1 */}
              <div className="flex flex-col sm:flex-row justify-between gap-3 pt-4">
                <Button 
                  variant="outline" 
                  onClick={handleCloseAttempt}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleNextStep}
                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 w-full sm:w-auto"
                  data-testid="button-next-step"
                >
                  <ArrowRightIcon className="w-4 h-4 mr-2" />
                  Next - Start Oil Loading
                </Button>
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
                <Label htmlFor="endMeter" className="text-base font-semibold text-gray-800">End Meter Reading *</Label>
                <Input
                  id="endMeter"
                  type="number"
                  value={supplyData.endMeterReading === 0 ? '' : supplyData.endMeterReading}
                  onChange={(e) => setSupplyData(prev => ({ ...prev, endMeterReading: Number(e.target.value) || 0 }))}
                  placeholder="Meter reading after supply"
                  data-testid="input-end-meter"
                  className={supplyData.startMeterReading > supplyData.endMeterReading && supplyData.endMeterReading > 0 ? "bg-white border-3 border-red-500 h-12 text-lg" : "bg-white border-3 border-gray-400 focus:border-orange-500 h-12 text-lg"}
                />
                {supplyData.startMeterReading > supplyData.endMeterReading && supplyData.endMeterReading > 0 && (
                  <p className="text-sm text-red-600 flex items-center">
                    ⚠️ End meter reading must be greater than start meter reading
                  </p>
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
                <h4 className="text-lg font-semibold text-gray-800 border-b pb-2">Final Photos</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* Finish Meter Reading Photo */}
                  <div className="text-center">
                    <PhotoCaptureButton 
                      onCapture={(blob: Blob, timestamp: string) => handlePhotoCapture(blob, 'finishMeterReading')}
                      className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-3 text-sm w-full h-16"
                      title="End Reading (Tanker Meter)"
                      branchName={selectedBranchData?.name || 'No Branch Selected'}
                    >
                      <GaugeIcon className="w-4 h-4 mr-2" />
                      End Reading (Tanker Meter)
                    </PhotoCaptureButton>
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
                    <PhotoCaptureButton 
                      onCapture={(blob: Blob, timestamp: string) => handlePhotoCapture(blob, 'finalTankLevel')}
                      className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-3 text-sm w-full h-16"
                      title="Branch Tank Level After"
                      branchName={selectedBranchData?.name || 'No Branch Selected'}
                    >
                      <GaugeIcon className="w-4 h-4 mr-2" />
                      Tank Level After
                    </PhotoCaptureButton>
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
                  
                  <Button 
                    onClick={handleCompleteSupply}
                    disabled={isSubmitting || !supplyData.endMeterReading || !supplyData.finishMeterReadingPhoto || !supplyData.finalTankLevelPhoto}
                    className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 w-full sm:flex-1"
                    data-testid="button-complete-supply"
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