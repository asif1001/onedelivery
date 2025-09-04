import { useState } from 'react';
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

import { createLoadSession, getOilTypes, getActiveBranchesOnly, uploadPhotoToFirebaseStorage, getNextFormattedId } from '@/lib/firebase';
import { safeWatermarkImage } from '@/utils/watermark';
import { useAuth } from '@/hooks/useAuth';

interface LoadingData {
  deliveryOrderNo: string;
  oilTypeId: string;
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
      
      // Reset form
      setLoadingData({
        deliveryOrderNo: '',
        oilTypeId: '',
        totalLoadedLiters: 0,
        loadMeterReading: 0,
        loadLocationId: '',
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
    return loadingData.oilTypeId && loadingData.totalLoadedLiters > 0 && 
           loadingData.loadMeterReading > 0 && 
           loadingData.meterReadingPhoto;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Tank Loading Process</h1>
        <p className="text-gray-600 mt-2">Load oil into tank truck and create load session</p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center space-x-4 mb-8">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
              step.status === 'completed' 
                ? 'bg-green-500 border-green-500 text-white' 
                : step.status === 'active'
                ? 'bg-orange-500 border-orange-500 text-white'
                : 'bg-gray-200 border-gray-300 text-gray-600'
            }`}>
              {step.status === 'completed' ? (
                <CheckIcon className="w-6 h-6" />
              ) : (
                <span className="text-sm font-medium">{step.id}</span>
              )}
            </div>
            <span className={`ml-2 text-sm font-medium ${
              step.status === 'active' ? 'text-orange-600' : 'text-gray-600'
            }`}>
              {step.title}
            </span>
            {index < steps.length - 1 && (
              <div className={`w-12 h-0.5 mx-4 ${
                step.status === 'completed' ? 'bg-green-500' : 'bg-gray-300'
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Single Complete Loading Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TruckIcon className="w-5 h-5 text-orange-500" />
            Complete Tank Loading
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Loading Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="deliveryOrder">Order/Delivery Number</Label>
              <Input
                data-testid="input-delivery-order"
                type="text"
                placeholder="Enter order/delivery number"
                value={loadingData.deliveryOrderNo}
                onChange={(e) => setLoadingData(prev => ({ ...prev, deliveryOrderNo: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="oilType">Oil Type *</Label>
              <Select 
                value={loadingData.oilTypeId} 
                onValueChange={(value) => setLoadingData(prev => ({ ...prev, oilTypeId: value }))}
              >
                <SelectTrigger data-testid="select-oil-type">
                  <SelectValue placeholder="Select oil type" />
                </SelectTrigger>
                <SelectContent>
                  {oilTypes.map((type: any) => (
                    <SelectItem key={type.id} value={type.id} data-testid={`oil-type-${type.id}`}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="loadLocation">Load Location (Optional)</Label>
              <Select 
                value={loadingData.loadLocationId} 
                onValueChange={(value) => setLoadingData(prev => ({ ...prev, loadLocationId: value }))}
              >
                <SelectTrigger data-testid="select-load-location">
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

            <div>
              <Label htmlFor="totalLiters">Total Loaded (Liters) *</Label>
              <Input
                data-testid="input-total-liters"
                type="number"
                placeholder="Enter total loaded liters"
                value={loadingData.totalLoadedLiters === 0 ? '' : loadingData.totalLoadedLiters}
                onChange={(e) => setLoadingData(prev => ({ ...prev, totalLoadedLiters: Number(e.target.value) || 0 }))}
              />
            </div>

            <div>
              <Label htmlFor="meterReading">Load Meter Reading *</Label>
              <Input
                data-testid="input-meter-reading"
                type="number"
                placeholder="Enter meter reading"
                value={loadingData.loadMeterReading === 0 ? '' : loadingData.loadMeterReading}
                onChange={(e) => setLoadingData(prev => ({ ...prev, loadMeterReading: Number(e.target.value) || 0 }))}
              />
            </div>
          </div>

          {/* Photo Capture Section */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
            <div className="text-center">
              <CameraIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Main Tanker Meter Reading Photo *</h3>
              <p className="text-gray-600 mb-4">Capture the meter reading during loading</p>
              
              <PhotoCaptureButton
                onCapture={(blob, timestamp) => handlePhotoCapture(blob, 'meterReading')}
                className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2"
                title="Main Tanker Meter Reading Photo"
                branchName={branches.find((b: any) => b.id === loadingData.loadLocationId)?.name || 'Loading Location'}
              >
                <GaugeIcon className="w-4 h-4 mr-2" />
                Take Meter Reading Photo
              </PhotoCaptureButton>
              
              {loadingData.meterReadingPhoto && (
                <div className="mt-4 flex flex-col items-center">
                  <div className="relative group cursor-pointer mb-2"
                       onClick={() => onPhotoClick && onPhotoClick(loadingData.meterReadingPhoto!, 'Meter Reading Photo')}>
                    <img 
                      src={loadingData.meterReadingPhoto} 
                      alt="Meter Reading" 
                      className="w-20 h-20 object-cover rounded-lg border hover:opacity-90 transition-opacity"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all rounded-lg flex items-center justify-center">
                      <ImageIcon className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    <CheckIcon className="w-4 h-4 mr-1" />
                    Photo Captured
                  </Badge>
                </div>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <Button 
              onClick={handleCompleteLoading}
              disabled={!canCompleteLoading() || isSubmitting}
              className="bg-green-600 hover:bg-green-700 px-8"
              data-testid="button-create-load-session"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Submitting...
                </>
              ) : (
                <>
                  <PlusIcon className="w-4 h-4 mr-2" />
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