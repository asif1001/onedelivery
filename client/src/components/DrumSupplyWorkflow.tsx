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
  ImageIcon,
  ArrowLeftIcon
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';

import { getActiveBranchesOnly, getAllOilTypes, uploadPhotoToFirebaseStorage, getAllTransactions, getDrumCapacities, saveDrumSupplyTransaction, completeDrumSupply } from '@/lib/firebase';
import { safeWatermarkImage } from '@/utils/watermark';
import { useAuth } from '@/hooks/useAuth';

interface DrumSupplyData {
  deliveryOrderNo: string;
  branchId: string;
  oilTypeId: string;
  numberOfDrums: number;
  drumCapacity: number;
  beforeTankPhoto?: string;
  drumsPhoto?: string;
  hoseConnectionPhoto?: string;
  afterTankPhoto?: string;
}

interface DrumSupplyStep {
  id: number;
  title: string;
  status: 'pending' | 'active' | 'completed';
}

interface DrumSupplyWorkflowProps {
  onClose: (completed?: boolean) => void;
  onPhotoClick?: (url: string, label: string) => void;
}

export function DrumSupplyWorkflow({ onClose, onPhotoClick }: DrumSupplyWorkflowProps) {
  const { toast } = useToast();
  const { userData: user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1); // 1: Before Supply, 2: After Supply
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showExitConfirmDialog, setShowExitConfirmDialog] = useState(false);
  const [drumSupplyData, setDrumSupplyData] = useState<DrumSupplyData>({
    deliveryOrderNo: '',
    branchId: '',
    oilTypeId: '',
    numberOfDrums: 1,
    drumCapacity: 0,
  });

  // Store selected branch data for watermarking and transaction
  const [selectedBranchData, setSelectedBranchData] = useState<{
    id: string;
    name: string;
    address: string;
    oilTanks?: any[];
  } | null>(null);

  // Auto-save draft data to localStorage
  const saveDrumSupplyDraft = (data: DrumSupplyData, step: number) => {
    if (step === 2) {
      const draftData = {
        ...data,
        currentStep: step,
        selectedBranchData,
        timestamp: Date.now()
      };
      localStorage.setItem('drum_supply_draft', JSON.stringify(draftData));
      console.log('💾 Drum supply draft saved:', draftData);
    }
  };

  // Restore draft data from localStorage
  const restoreDrumSupplyDraft = () => {
    try {
      const draftStr = localStorage.getItem('drum_supply_draft');
      if (draftStr) {
        const draft = JSON.parse(draftStr);
        // Only restore if draft is less than 24 hours old
        if (Date.now() - draft.timestamp < 24 * 60 * 60 * 1000) {
          setDrumSupplyData({
            deliveryOrderNo: draft.deliveryOrderNo || '',
            branchId: draft.branchId || '',
            oilTypeId: draft.oilTypeId || '',
            numberOfDrums: draft.numberOfDrums || 1,
            drumCapacity: draft.drumCapacity || 0,
            beforeTankPhoto: draft.beforeTankPhoto,
            drumsPhoto: draft.drumsPhoto,
            afterTankPhoto: draft.afterTankPhoto
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
          console.log('✅ Drum supply draft restored:', draft);
        } else {
          // Remove old draft
          localStorage.removeItem('drum_supply_draft');
        }
      }
    } catch (error) {
      console.error('❌ Error restoring draft:', error);
      localStorage.removeItem('drum_supply_draft');
    }
  };

  // Clear draft when completed
  const clearDrumSupplyDraft = () => {
    localStorage.removeItem('drum_supply_draft');
    console.log('🗑️ Drum supply draft cleared');
  };

  useEffect(() => {
    restoreDrumSupplyDraft(); // Restore any saved draft
  }, []);

  // Auto-save when drumSupplyData changes in Step 2
  useEffect(() => {
    if (currentStep === 2) {
      saveDrumSupplyDraft(drumSupplyData, currentStep);
    }
  }, [drumSupplyData, currentStep, selectedBranchData]);

  // Fetch branches, oil types, and drum capacities
  const { data: branches = [] } = useQuery({ 
    queryKey: ['branches'], 
    queryFn: getActiveBranchesOnly 
  });
  const { data: oilTypes = [] } = useQuery({ 
    queryKey: ['oil-types'], 
    queryFn: getAllOilTypes 
  });
  const { data: drumCapacities = [] } = useQuery({
    queryKey: ['drum-capacities'],
    queryFn: getDrumCapacities
  });

  // Filter oil types based on selected branch
  const getAvailableOilTypes = () => {
    if (!selectedBranchData || !selectedBranchData.oilTanks) {
      return oilTypes;
    }
    const branchOilTypeIds = selectedBranchData.oilTanks.map((tank: any) => tank.oilTypeId);
    return oilTypes.filter((oilType: any) => branchOilTypeIds.includes(oilType.id));
  };

  const steps: DrumSupplyStep[] = [
    { id: 1, title: 'Before Supply', status: currentStep === 1 ? 'active' : currentStep > 1 ? 'completed' : 'pending' },
    { id: 2, title: 'After Supply', status: currentStep === 2 ? 'active' : currentStep > 2 ? 'completed' : 'pending' },
  ];

  const handleBranchChange = (branchId: string) => {
    const branch = branches.find(b => b.id === branchId);
    if (branch) {
      setSelectedBranchData({
        id: branch.id,
        name: branch.name,
        address: branch.address,
        oilTanks: branch.oilTanks || []
      });
      setDrumSupplyData(prev => ({ 
        ...prev, 
        branchId, 
        oilTypeId: '' // Reset oil type when branch changes
      }));
    }
  };

  const handlePhotoCapture = async (photoBlob: Blob, timestamp: string, photoType: string) => {
    try {
      // Convert blob to file for watermarking
      const originalFile = new File([photoBlob], `${photoType}_${Date.now()}.jpg`, {
        type: 'image/jpeg',
        lastModified: Date.now()
      });

      // Get branch name for watermarking
      const branchName = selectedBranchData?.name || 'Unknown Branch';
      const oilTypeName = oilTypes.find((ot: any) => ot.id === drumSupplyData.oilTypeId)?.name || 'Unknown Oil Type';
      
      // Apply watermark with drum supply specific details
      const watermarkedFile = await safeWatermarkImage(originalFile, {
        branchName,
        timestamp: new Date(),
        extraLine1: `Drum Supply - ${oilTypeName}`,
        extraLine2: `${drumSupplyData.numberOfDrums} x ${drumSupplyData.drumCapacity}L drums`
      });

      // Upload watermarked image
      const watermarkedBlob = new Blob([watermarkedFile], { type: 'image/jpeg' });
      const photoUrl = await uploadPhotoToFirebaseStorage(watermarkedBlob, 'drum-supply-photos');
      setDrumSupplyData(prev => ({ ...prev, [`${photoType}Photo`]: photoUrl }));
      
      toast({
        title: "Photo Captured",
        description: `${photoType} photo saved successfully with watermark`
      });
    } catch (error) {
      console.error('Photo upload error:', error);
      toast({
        title: "Photo Saved Locally", 
        description: "Photo captured and saved for demo",
        variant: "default"
      });
    }
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      // Validate Step 1
      if (!drumSupplyData.deliveryOrderNo || !drumSupplyData.branchId || !drumSupplyData.oilTypeId || 
          drumSupplyData.numberOfDrums <= 0 || drumSupplyData.drumCapacity <= 0 || 
          !drumSupplyData.beforeTankPhoto || !drumSupplyData.drumsPhoto || !drumSupplyData.hoseConnectionPhoto) {
        toast({
          title: "Missing Information",
          description: "Please fill all fields and capture required photos",
          variant: "destructive"
        });
        return;
      }
      setCurrentStep(2);
    }
  };

  const handleBackStep = () => {
    if (currentStep === 2) {
      setCurrentStep(1);
    }
  };

  const handleSubmit = async () => {
    // Validate Step 2
    if (!drumSupplyData.afterTankPhoto) {
      toast({
        title: "Missing Photo",
        description: "Please capture the after tank photo",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Calculate total liters supplied
      const totalLitersSupplied = drumSupplyData.numberOfDrums * drumSupplyData.drumCapacity;

      // Create drum supply transaction with proper photo structure
      const transactionData = {
        type: 'supply',
        supplyType: 'drum',
        driverUid: user?.uid,
        driverId: user?.uid,
        driverName: user?.displayName || user?.email || 'Unknown Driver',
        branchId: drumSupplyData.branchId,
        branchName: selectedBranchData?.name,
        oilTypeId: drumSupplyData.oilTypeId,
        oilTypeName: oilTypes.find((ot: any) => ot.id === drumSupplyData.oilTypeId)?.name,
        deliveryOrderNo: drumSupplyData.deliveryOrderNo,
        deliveryOrderId: drumSupplyData.deliveryOrderNo,
        numberOfDrums: drumSupplyData.numberOfDrums,
        drumCapacity: drumSupplyData.drumCapacity,
        quantity: totalLitersSupplied,
        oilSuppliedLiters: totalLitersSupplied,
        deliveredLiters: totalLitersSupplied,
        
        // Photos in correct structure for transaction details modal
        photos: {
          beforeTankPhoto: drumSupplyData.beforeTankPhoto || null,
          drumsPhoto: drumSupplyData.drumsPhoto || null,  
          hoseConnectionPhoto: drumSupplyData.hoseConnectionPhoto || null,
          afterTankPhoto: drumSupplyData.afterTankPhoto || null
        },
        
        // Also keep as direct properties for compatibility
        beforeTankPhoto: drumSupplyData.beforeTankPhoto,
        drumsPhoto: drumSupplyData.drumsPhoto,
        hoseConnectionPhoto: drumSupplyData.hoseConnectionPhoto,
        afterTankPhoto: drumSupplyData.afterTankPhoto,
        
        timestamp: new Date(),
        createdAt: new Date(),
        status: 'completed'
      };

      // Save transaction using completeDrumSupply for proper drum supply handling
      await completeDrumSupply(transactionData);

      clearDrumSupplyDraft();
      toast({
        title: "Drum Supply Complete",
        description: `Successfully supplied ${totalLitersSupplied}L via ${drumSupplyData.numberOfDrums} drums`
      });
      
      onClose(true);
    } catch (error) {
      console.error('Error submitting drum supply:', error);
      toast({
        title: "Submission Failed",
        description: "Please try again or contact support",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExit = () => {
    if (currentStep === 2) {
      setShowExitConfirmDialog(true);
    } else {
      onClose(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DropletIcon className="h-6 w-6 text-blue-600" />
            Supply by Drum
          </CardTitle>
          
          {/* Steps indicator */}
          <div className="flex items-center space-x-4 mt-4">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                  step.status === 'completed' ? 'bg-green-600 text-white' :
                  step.status === 'active' ? 'bg-blue-600 text-white' :
                  'bg-gray-300 text-gray-600'
                }`}>
                  {step.status === 'completed' ? <CheckIcon className="h-4 w-4" /> : step.id}
                </div>
                <span className={`ml-2 text-sm ${
                  step.status === 'active' ? 'text-blue-600 font-medium' : 'text-gray-600'
                }`}>
                  {step.title}
                </span>
                {index < steps.length - 1 && (
                  <ArrowRightIcon className="h-4 w-4 text-gray-400 mx-4" />
                )}
              </div>
            ))}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {currentStep === 1 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Step 1: Before Supply</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="delivery-order">Order/Delivery Number *</Label>
                  <Input
                    id="delivery-order"
                    value={drumSupplyData.deliveryOrderNo}
                    onChange={(e) => setDrumSupplyData(prev => ({ ...prev, deliveryOrderNo: e.target.value }))}
                    placeholder="Enter delivery/order number"
                    data-testid="input-delivery-order"
                  />
                </div>

                <div>
                  <Label htmlFor="branch">Select Branch *</Label>
                  <Select 
                    value={drumSupplyData.branchId} 
                    onValueChange={handleBranchChange}
                  >
                    <SelectTrigger data-testid="select-branch">
                      <SelectValue placeholder="Choose branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((branch: any) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.name}{branch.address ? ` - ${branch.address}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="oil-type">Oil Type *</Label>
                  <Select 
                    value={drumSupplyData.oilTypeId} 
                    onValueChange={(value) => setDrumSupplyData(prev => ({ ...prev, oilTypeId: value }))}
                    disabled={!drumSupplyData.branchId}
                  >
                    <SelectTrigger data-testid="select-oil-type">
                      <SelectValue placeholder="Choose oil type" />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableOilTypes().map((oilType: any) => (
                        <SelectItem key={oilType.id} value={oilType.id}>
                          {oilType.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!drumSupplyData.branchId && (
                    <p className="text-sm text-gray-500 mt-1">Select a branch first</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="number-of-drums">Number of Drums *</Label>
                  <Input
                    id="number-of-drums"
                    type="number"
                    min="1"
                    value={drumSupplyData.numberOfDrums}
                    onChange={(e) => setDrumSupplyData(prev => ({ ...prev, numberOfDrums: parseInt(e.target.value) || 1 }))}
                    placeholder="Enter number of drums"
                    data-testid="input-number-drums"
                  />
                </div>

                <div>
                  <Label htmlFor="drum-capacity">Drum Capacity (Liters) *</Label>
                  <Select 
                    value={drumSupplyData.drumCapacity.toString()} 
                    onValueChange={(value) => setDrumSupplyData(prev => ({ ...prev, drumCapacity: parseInt(value) }))}
                  >
                    <SelectTrigger data-testid="select-drum-capacity">
                      <SelectValue placeholder="Choose drum capacity" />
                    </SelectTrigger>
                    <SelectContent>
                      {drumCapacities.filter((capacity: any) => capacity && capacity.value).map((capacity: any) => (
                        <SelectItem key={capacity.value} value={capacity.value.toString()}>
                          {capacity.value}L - {capacity.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Total calculation */}
              {drumSupplyData.numberOfDrums > 0 && drumSupplyData.drumCapacity > 0 && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Total Supply: {drumSupplyData.numberOfDrums * drumSupplyData.drumCapacity}L</strong>
                    <br />
                    ({drumSupplyData.numberOfDrums} drums × {drumSupplyData.drumCapacity}L each)
                  </p>
                </div>
              )}

              {/* Photo capture section */}
              <div className="space-y-4">
                <div>
                  <Label>Branch Oil Tank Before Supply *</Label>
                  <div className="mt-2">
                    <PhotoCaptureButton
                      onCapture={(blob, timestamp) => handlePhotoCapture(blob, timestamp, 'beforeTank')}
                      title="Before Tank Photo"
                      branchName={selectedBranchData?.name || 'Unknown Branch'}
                    >
                      <ImageIcon className="h-4 w-4 mr-2" />
                      Capture Before Tank Photo
                    </PhotoCaptureButton>
                    {drumSupplyData.beforeTankPhoto && (
                      <Badge variant="outline" className="ml-2">✓ Photo captured</Badge>
                    )}
                  </div>
                </div>

                <div>
                  <Label>All Drums Together *</Label>
                  <div className="mt-2">
                    <PhotoCaptureButton
                      onCapture={(blob, timestamp) => handlePhotoCapture(blob, timestamp, 'drums')}
                      title="Drums Photo"
                      branchName={selectedBranchData?.name || 'Unknown Branch'}
                    >
                      <ImageIcon className="h-4 w-4 mr-2" />
                      Capture Drums Photo
                    </PhotoCaptureButton>
                    {drumSupplyData.drumsPhoto && (
                      <Badge variant="outline" className="ml-2">✓ Photo captured</Badge>
                    )}
                  </div>
                </div>

                <div>
                  <Label>Hose Connection *</Label>
                  <div className="mt-2">
                    <PhotoCaptureButton
                      onCapture={(blob, timestamp) => handlePhotoCapture(blob, timestamp, 'hoseConnection')}
                      title="Hose Connection Photo"
                      branchName={selectedBranchData?.name || 'Unknown Branch'}
                    >
                      <ImageIcon className="h-4 w-4 mr-2" />
                      Capture Hose Connection Photo
                    </PhotoCaptureButton>
                    {drumSupplyData.hoseConnectionPhoto && (
                      <Badge variant="outline" className="ml-2">✓ Photo captured</Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={handleExit}>
                  Cancel
                </Button>
                <Button onClick={handleNextStep} className="bg-blue-600 hover:bg-blue-700">
                  Start Pump
                  <ArrowRightIcon className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Step 2: After Supply</h3>
              
              {/* Summary */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Supply Summary</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p><strong>Branch:</strong> {selectedBranchData?.name}</p>
                  <p><strong>Oil Type:</strong> {oilTypes.find((ot: any) => ot.id === drumSupplyData.oilTypeId)?.name}</p>
                  <p><strong>Delivery/Order:</strong> {drumSupplyData.deliveryOrderNo}</p>
                  <p><strong>Total Supply:</strong> {drumSupplyData.numberOfDrums * drumSupplyData.drumCapacity}L ({drumSupplyData.numberOfDrums} × {drumSupplyData.drumCapacity}L drums)</p>
                </div>
              </div>

              {/* After tank photo */}
              <div>
                <Label>Branch Oil Tank After Supply Completion *</Label>
                <div className="mt-2">
                  <PhotoCaptureButton
                    onCapture={(blob, timestamp) => handlePhotoCapture(blob, timestamp, 'afterTank')}
                    title="After Tank Photo"
                    branchName={selectedBranchData?.name || 'Unknown Branch'}
                  >
                    <ImageIcon className="h-4 w-4 mr-2" />
                    Capture After Tank Photo
                  </PhotoCaptureButton>
                  {drumSupplyData.afterTankPhoto && (
                    <Badge variant="outline" className="ml-2">✓ Photo captured</Badge>
                  )}
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={handleBackStep}>
                  <ArrowLeftIcon className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button 
                  onClick={handleSubmit} 
                  disabled={isSubmitting}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit'}
                  <CheckIcon className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Exit confirmation dialog */}
      <Dialog open={showExitConfirmDialog} onOpenChange={setShowExitConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Exit Drum Supply?</DialogTitle>
            <DialogDescription>
              Your progress will be saved as a draft and you can continue later within 24 hours.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExitConfirmDialog(false)}>
              Continue Working
            </Button>
            <Button variant="destructive" onClick={() => onClose(false)}>
              Exit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}