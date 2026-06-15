import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { PhotoCaptureButton } from './PhotoCaptureButton';
import { 
  TruckIcon, 
  CameraIcon, 
  CheckIcon, 
  DropletIcon,
  GaugeIcon,
  PlusIcon,
  ImageIcon
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';

import { createLoadSession, getOilTypes, getActiveBranchesOnly, uploadPhotoToFirebaseStorage } from '@/lib/firebase';
import { safeWatermarkImage } from '@/utils/watermark';
import { useAuth } from '@/hooks/useAuth';

interface LoadingData {
  deliveryOrderNo: string;
  oilTypeId: string;
  tankIndex?: number;
  totalLoadedLiters: number;
  loadMeterReading: number;
  loadLocationId?: string;
  meterReadingPhoto?: string;
}

interface LoadingStep {
  id: number;
  title: string;
  status: 'pending' | 'active' | 'completed';
}

interface LoadingWorkflowProps {
  onClose: () => void;
  onPhotoClick?: (url: string, label: string) => void;
}

export function LoadingWorkflow({ onClose, onPhotoClick }: LoadingWorkflowProps) {
  const { toast } = useToast();
  const { userData: user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingData, setLoadingData] = useState<LoadingData>({
    deliveryOrderNo: '',
    oilTypeId: '',
    tankIndex: undefined,
    totalLoadedLiters: 0,
    loadMeterReading: 0,
    loadLocationId: '',
  });

  // Fetch oil types and branches from Firestore
  const { data: oilTypes = [] } = useQuery({ 
    queryKey: ['oil-types'], 
    queryFn: getOilTypes 
  });
  const { data: branches = [] } = useQuery({ 
    queryKey: ['branches'], 
    queryFn: getActiveBranchesOnly 
  });

  // Filter oil types based on selected branch
  const availableOilTypes = (() => {
    if (!loadingData.loadLocationId || !branches.length) return oilTypes;
    
    const selectedBranch = branches.find((b: any) => b.id === loadingData.loadLocationId);
    if (!selectedBranch || !selectedBranch.oilTanks) return oilTypes;
    
    // Get unique oil type IDs from branch tanks
    const branchOilTypeIds = Array.from(new Set(selectedBranch.oilTanks.map((tank: any) => tank.oilTypeId)));
    
    // Filter global oil types to only show those present in the branch
    return (oilTypes as any[]).filter(type => branchOilTypeIds.includes(type.id));
  })();

  // Filter specific tanks based on selected branch and oil type
  const availableTanks = (() => {
    if (!loadingData.loadLocationId || !loadingData.oilTypeId || !branches.length) return [];
    
    const selectedBranch = branches.find((b: any) => b.id === loadingData.loadLocationId);
    if (!selectedBranch || !selectedBranch.oilTanks) return [];
    
    // Find all tanks that match the selected oil type
    return (selectedBranch.oilTanks as any[])
      .map((tank, index) => ({ ...tank, originalIndex: index }))
      .filter(tank => tank.oilTypeId === loadingData.oilTypeId);
  })();

  // Reset oil type and tank index if they are no longer available when branch/oil type changes
  useEffect(() => {
    if (loadingData.oilTypeId && availableOilTypes.length > 0) {
      const isStillAvailable = availableOilTypes.some((type: any) => type.id === loadingData.oilTypeId);
      if (!isStillAvailable) {
        setLoadingData(prev => ({ ...prev, oilTypeId: '', tankIndex: undefined }));
      }
    }
  }, [loadingData.loadLocationId, availableOilTypes]);

  // Handle auto-selection of tank if only one is available
  useEffect(() => {
    if (availableTanks.length === 1 && loadingData.tankIndex === undefined) {
      setLoadingData(prev => ({ ...prev, tankIndex: availableTanks[0].originalIndex }));
    } else if (availableTanks.length === 0) {
      setLoadingData(prev => ({ ...prev, tankIndex: undefined }));
    } else if (availableTanks.length > 1 && loadingData.tankIndex !== undefined) {
      // Verify the selected tank still matches the oil type
      const isValid = availableTanks.some(t => t.originalIndex === loadingData.tankIndex);
      if (!isValid) {
        setLoadingData(prev => ({ ...prev, tankIndex: undefined }));
      }
    }
  }, [availableTanks, loadingData.oilTypeId]);

  // Default load location: Prioritize last saved branch, then "Main Tanks Plaza"
  useEffect(() => {
    if (!loadingData.loadLocationId && Array.isArray(branches) && branches.length > 0) {
      // 1. Check localStorage for last selected branch
      const lastBranchId = localStorage.getItem('last_loading_branch_id');
      if (lastBranchId && branches.some((b: any) => b.id === lastBranchId)) {
        setLoadingData(prev => ({ ...prev, loadLocationId: lastBranchId }));
        return;
      }

      // 2. Fallback to default branch name
      const defaultBranch = branches.find((b: any) => (b.name || '').toLowerCase() === 'main tanks plaza');
      if (defaultBranch?.id) {
        setLoadingData(prev => ({ ...prev, loadLocationId: defaultBranch.id }));
      }
    }
  }, [branches]);

  // Save selected branch to localStorage for next time
  useEffect(() => {
    if (loadingData.loadLocationId) {
      localStorage.setItem('last_loading_branch_id', loadingData.loadLocationId);
    }
  }, [loadingData.loadLocationId]);

  const steps: LoadingStep[] = [
    { id: 1, title: 'Complete Tank Loading', status: currentStep === 1 ? 'active' : currentStep > 1 ? 'completed' : 'pending' },
  ];

  const handlePhotoCapture = async (photoBlob: Blob, photoType: string) => {
    try {
      // Convert blob to file for watermarking
      const originalFile = new File([photoBlob], `${photoType}_${Date.now()}.jpg`, {
        type: 'image/jpeg',
        lastModified: Date.now()
      });

      // Get branch name for watermarking
      const selectedBranch = branches.find(b => b.id === loadingData.loadLocationId);
      const branchName = selectedBranch?.name || 'Loading Location';
      
      // Apply watermark with loading-specific details
      const watermarkedFile = await safeWatermarkImage(originalFile, {
        branchName,
        timestamp: new Date(),
        extraLine2: "Oil Type: Loading"
      });

      // Upload watermarked image
      const watermarkedBlob = new Blob([watermarkedFile], { type: 'image/jpeg' });
      const photoUrl = await uploadPhotoToFirebaseStorage(watermarkedBlob, 'loading-photos');
      setLoadingData(prev => ({ ...prev, [`${photoType}Photo`]: photoUrl }));
      
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

  const handleCompleteLoading = async () => {
    if (isSubmitting) return; // Prevent double submission

    try {
      setIsSubmitting(true);

      // Validate required fields
      if (!loadingData.oilTypeId || !loadingData.totalLoadedLiters) {
        toast({
          title: "Missing Information",
          description: "Please fill in all required fields",
          variant: "destructive"
        });
        return;
      }

      // Get current user information
      const currentUser = user;
      const driverName = currentUser?.displayName || currentUser?.email || 'Unknown Driver';
      
      // Get selected branch/location information
      const selectedBranch = branches.find((b: any) => b.id === loadingData.loadLocationId);
      const loadLocationName = selectedBranch?.name || (loadingData.loadLocationId ? 'Unknown Location' : 'Main Depot');
      
      // Get selected oil type information
      const selectedOilType = (oilTypes as any[]).find((type: any) => type.id === loadingData.oilTypeId);
      const oilTypeName = selectedOilType?.name || 'Unknown Oil Type';

      // Create load session directly in Firestore with complete information
      const loadSessionData = {
        deliveryOrderNo: loadingData.deliveryOrderNo || '',
        oilTypeId: loadingData.oilTypeId,
        oilTypeName: oilTypeName,
        tankIndex: loadingData.tankIndex, // Pass the specific tank index
        totalLoadedLiters: loadingData.totalLoadedLiters,
        loadMeterReading: loadingData.loadMeterReading,
        loadLocationId: loadingData.loadLocationId || 'main-depot',
        loadLocationName: loadLocationName,
        meterReadingPhoto: loadingData.meterReadingPhoto || null,
        driverName: driverName,
        driverUid: currentUser?.uid || 'unknown'
      };

      const loadSession = await createLoadSession(loadSessionData);
      
      toast({
        title: "Load Session Created",
        description: `Successfully loaded ${loadingData.totalLoadedLiters}L of ${loadSessionData.oilTypeName}. Session ID: ${loadSession.loadSessionId}`
      });
      
      // Reset form but keep the current location for convenience
      setLoadingData({
        deliveryOrderNo: '',
        oilTypeId: '',
        tankIndex: undefined,
        totalLoadedLiters: 0,
        loadMeterReading: 0,
        loadLocationId: loadingData.loadLocationId, // Persist location within session
      });
      setCurrentStep(1);
      onClose(); // Close and return to dashboard
    } catch (error) {
      console.error('Load session creation error:', error);
      toast({
        title: "Loading Failed",
        description: "Failed to create load session. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const canCompleteLoading = () => {
    return loadingData.loadLocationId && 
           loadingData.oilTypeId && 
           loadingData.tankIndex !== undefined &&
           loadingData.totalLoadedLiters > 0 && 
           loadingData.loadMeterReading > 0 && 
           loadingData.meterReadingPhoto;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 px-3 sm:px-0 pb-10">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Tank Loading Process</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1 sm:mt-2">Load oil into tank truck and create load session</p>
      </div>

      {/* Progress Steps - Simplified for mobile */}
      <div className="flex items-center justify-center space-x-2 sm:space-x-4 mb-4 sm:mb-8">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 ${
              step.status === 'completed' 
                ? 'bg-green-500 border-green-500 text-white' 
                : step.status === 'active'
                ? 'bg-orange-500 border-orange-500 text-white'
                : 'bg-gray-200 border-gray-300 text-gray-600'
            }`}>
              {step.status === 'completed' ? (
                <CheckIcon className="w-5 h-5 sm:w-6 sm:h-6" />
              ) : (
                <span className="text-xs sm:text-sm font-medium">{step.id}</span>
              )}
            </div>
            <span className={`ml-1.5 sm:ml-2 text-xs sm:text-sm font-medium ${
              step.status === 'active' ? 'text-orange-600' : 'text-gray-600'
            }`}>
              {step.title}
            </span>
            {index < steps.length - 1 && (
              <div className={`w-8 sm:w-12 h-0.5 mx-2 sm:mx-4 ${
                step.status === 'completed' ? 'bg-green-500' : 'bg-gray-300'
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Single Complete Loading Form */}
      <Card className="shadow-sm border-gray-200">
        <CardHeader className="py-4 px-4 sm:px-6">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <TruckIcon className="w-5 h-5 text-orange-500" />
            Complete Tank Loading
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-5 px-4 sm:px-6 pb-6">
          {/* Loading Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="deliveryOrder" className="text-sm font-semibold text-gray-700">Order/Delivery Number</Label>
              <Input
                data-testid="input-delivery-order"
                type="text"
                placeholder="Enter order/delivery number"
                value={loadingData.deliveryOrderNo}
                onChange={(e) => setLoadingData(prev => ({ ...prev, deliveryOrderNo: e.target.value }))}
                className="h-11 bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="loadLocation" className="text-sm font-semibold text-gray-700">Load Location *</Label>
              <Select 
                value={loadingData.loadLocationId} 
                onValueChange={(value) => setLoadingData(prev => ({ ...prev, loadLocationId: value }))}
              >
                <SelectTrigger data-testid="select-load-location" className="h-11 bg-white">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((branch: any) => (
                    <SelectItem key={branch.id} value={branch.id} data-testid={`location-${branch.id}`}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="oilType" className="text-sm font-semibold text-gray-700">Oil Type *</Label>
              <Select 
                value={loadingData.oilTypeId} 
                onValueChange={(value) => setLoadingData(prev => ({ ...prev, oilTypeId: value }))}
                disabled={!loadingData.loadLocationId}
              >
                <SelectTrigger data-testid="select-oil-type" className="h-11 bg-white">
                  <SelectValue placeholder={!loadingData.loadLocationId ? "Select branch first" : "Select oil type"} />
                </SelectTrigger>
                <SelectContent>
                  {availableOilTypes.map((type: any) => (
                    <SelectItem key={type.id} value={type.id} data-testid={`oil-type-${type.id}`}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!loadingData.loadLocationId && (
                  <p className="text-[10px] sm:text-xs text-orange-600 font-medium">Please select a load location first</p>
                )}
              </div>
 
             {availableTanks.length > 0 && (
               <div className="space-y-1.5">
                 <Label htmlFor="tankSelection" className="text-sm font-semibold text-gray-700">Select Tank *</Label>
                 <Select 
                   value={loadingData.tankIndex?.toString()} 
                   onValueChange={(value) => setLoadingData(prev => ({ ...prev, tankIndex: parseInt(value) }))}
                 >
                   <SelectTrigger data-testid="select-tank" className="h-11 bg-white">
                     <SelectValue placeholder="Select specific tank" />
                   </SelectTrigger>
                   <SelectContent>
                     {availableTanks.map((tank: any) => (
                       <SelectItem key={tank.originalIndex} value={tank.originalIndex.toString()}>
                         {tank.tankName || `Tank ${tank.originalIndex + 1}`} ({tank.currentLevel}L)
                       </SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
                 {availableTanks.length > 1 && (
                   <p className="text-[10px] sm:text-xs text-blue-600 font-medium">Multiple tanks found. Please pick one.</p>
                 )}
               </div>
             )}
  
            <div className="space-y-1.5">
              <Label htmlFor="totalLiters" className="text-sm font-semibold text-gray-700">Total Loaded (Liters) *</Label>
              <Input
                data-testid="input-total-liters"
                type="number"
                placeholder="Enter total loaded liters"
                value={loadingData.totalLoadedLiters === 0 ? '' : loadingData.totalLoadedLiters}
                onChange={(e) => setLoadingData(prev => ({ ...prev, totalLoadedLiters: Number(e.target.value) || 0 }))}
                className="h-11 bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="meterReading" className="text-sm font-semibold text-gray-700">Load Meter Reading *</Label>
              <Input
                data-testid="input-meter-reading"
                type="number"
                placeholder="Enter meter reading"
                value={loadingData.loadMeterReading === 0 ? '' : loadingData.loadMeterReading}
                onChange={(e) => setLoadingData(prev => ({ ...prev, loadMeterReading: Number(e.target.value) || 0 }))}
                className="h-11 bg-white"
              />
            </div>
          </div>

          {/* Photo Capture Section */}
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 sm:p-6 bg-gray-50/50">
            <div className="text-center">
              <CameraIcon className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-2 sm:mb-4" />
              <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-1">Meter Reading Photo *</h3>
              <p className="text-xs sm:text-sm text-gray-500 mb-4">Capture the meter reading during loading</p>
              
              <PhotoCaptureButton
                onCapture={(blob, timestamp) => handlePhotoCapture(blob, 'meterReading')}
                className="bg-orange-500 hover:bg-orange-600 text-white w-full sm:w-auto px-6 py-3 h-12 rounded-lg transition-all active:scale-95"
                title="Main Tanker Meter Reading Photo"
                branchName={branches.find((b: any) => b.id === loadingData.loadLocationId)?.name || 'Loading Location'}
              >
                <GaugeIcon className="w-4 h-4 mr-2" />
                Take Photo
              </PhotoCaptureButton>
              
              {loadingData.meterReadingPhoto && (
                <div className="mt-4 flex flex-col items-center">
                  <div className="relative group cursor-pointer mb-2"
                       onClick={() => onPhotoClick && onPhotoClick(loadingData.meterReadingPhoto!, 'Meter Reading Photo')}>
                    <img 
                      src={loadingData.meterReadingPhoto} 
                      alt="Meter Reading" 
                      className="w-24 h-24 object-cover rounded-xl border-2 border-white shadow-md hover:opacity-90 transition-opacity"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all rounded-xl flex items-center justify-center">
                      <ImageIcon className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                  <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                    <CheckIcon className="w-3 h-3 mr-1" />
                    Photo Captured
                  </Badge>
                </div>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <Button 
              onClick={handleCompleteLoading}
              disabled={!canCompleteLoading() || isSubmitting}
              className={`w-full h-12 rounded-lg text-lg font-bold transition-all ${
                canCompleteLoading() && !isSubmitting 
                  ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-200 active:scale-95' 
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
              data-testid="button-create-load-session"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Submitting...
                </>
              ) : (
                <>
                  <PlusIcon className="w-5 h-5 mr-2" />
                  Loading Submit
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
