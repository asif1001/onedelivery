import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { CameraCapture } from './CameraCapture';
import { 
  TruckIcon, 
  CameraIcon, 
  CheckIcon, 
  EditIcon, 
  PlusIcon,
  MapPinIcon,
  DropletIcon,
  GaugeIcon,
  ImageIcon,
  ClockIcon,
  AlertTriangleIcon,
  EyeIcon
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
// import { uploadToCloudinary } from '@/lib/cloudinary';

interface DeliveryStep {
  id: number;
  title: string;
  status: 'pending' | 'active' | 'completed';
}

interface DeliveryData {
  // Loading phase
  oilTypeId: string;
  loadedOilLiters: number;
  meterReadingPhoto?: string;
  
  // Unloading phase
  branchId: string;
  deliveryOrderNo: string;
  startMeterReading: number;
  tankLevelPhoto?: string;
  hoseConnectionPhoto?: string;
  
  // Finish phase
  endMeterReading: number;
  oilSuppliedLiters: number;
  finalTankLevelPhoto?: string;
  
  // Complaint
  complaintPhoto?: string;
  complaintDescription: string;
}

export function DeliveryWorkflow() {
  const { toast } = useToast();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraType, setCameraType] = useState<string>('');
  const [complaintDialogOpen, setComplaintDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  
  const [deliveryData, setDeliveryData] = useState<DeliveryData>({
    oilTypeId: '',
    loadedOilLiters: 0,
    branchId: '',
    deliveryOrderNo: '',
    startMeterReading: 0,
    endMeterReading: 0,
    oilSuppliedLiters: 0,
    complaintDescription: ''
  });

  // Fetch oil types from API
  const { data: oilTypes = [], isLoading: oilTypesLoading } = useQuery({
    queryKey: ['/api/oil-types'],
  });

  // Fetch branches from API
  const { data: branches = [], isLoading: branchesLoading } = useQuery({
    queryKey: ['/api/branches'],
  });

  // Generate delivery orders based on selected branch
  const deliveryOrders = deliveryData.branchId ? [
    { id: '1', orderNo: 'ORD-2025-001', branchId: deliveryData.branchId },
    { id: '2', orderNo: 'ORD-2025-002', branchId: deliveryData.branchId },
    { id: '3', orderNo: 'ORD-2025-003', branchId: deliveryData.branchId },
  ] : [];

  const steps: DeliveryStep[] = [
    { id: 1, title: 'Loading', status: currentStep === 1 ? 'active' : currentStep > 1 ? 'completed' : 'pending' },
    { id: 2, title: 'Unloading', status: currentStep === 2 ? 'active' : currentStep > 2 ? 'completed' : 'pending' },
    { id: 3, title: 'Finish', status: currentStep === 3 ? 'active' : currentStep > 3 ? 'completed' : 'pending' },
  ];

  const openCamera = (type: string) => {
    setCameraType(type);
    setCameraOpen(true);
  };

  const handlePhotoCapture = async (imageBlob: Blob, timestamp: string) => {
    try {
      toast({
        title: "Uploading Photo",
        description: "Saving photo to cloud storage..."
      });

      // For now, create local blob URL - implement proper upload later
      const imageUrl = URL.createObjectURL(imageBlob);
      
      setDeliveryData(prev => ({
        ...prev,
        [`${cameraType}Photo`]: imageUrl
      }));
      
      const isLocalUrl = imageUrl.startsWith('blob:');
      toast({
        title: isLocalUrl ? "Photo Captured" : "Photo Uploaded",
        description: isLocalUrl 
          ? `${cameraType} photo captured locally with timestamp: ${format(new Date(timestamp), 'dd/MM/yyyy HH:mm:ss')}`
          : `${cameraType} photo uploaded to Cloudinary with timestamp: ${format(new Date(timestamp), 'dd/MM/yyyy HH:mm:ss')}`
      });
    } catch (error) {
      console.error('Photo upload error:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload photo. Please check Cloudinary configuration.",
        variant: "destructive"
      });
    }
  };

  const handleStepNext = () => {
    if (currentStep < 3) {
      setCurrentStep(prev => prev + 1);
      toast({
        title: "Step Completed",
        description: `Moving to ${steps[currentStep].title} phase`
      });
    }
  };

  const handleCompleteDelivery = async () => {
    try {
      // Prepare comprehensive delivery record for new system
      const deliveryRecord = {
        loadSessionId: 'load_001', // This would come from selected load session
        deliveryOrderId: deliveryData.deliveryOrderNo,
        oilTypeId: deliveryData.oilTypeId,
        branchId: deliveryData.branchId,
        deliveredLiters: deliveryData.oilSuppliedLiters,
        startMeterReading: deliveryData.startMeterReading,
        endMeterReading: deliveryData.endMeterReading,
        
        // All captured photos with timestamps
        photos: {
          meterReading: deliveryData.meterReadingPhoto,
          tankLevelBefore: deliveryData.tankLevelPhoto,
          hoseConnection: deliveryData.hoseConnectionPhoto,
          tankLevelAfter: deliveryData.finalTankLevelPhoto
        },
        
        // Delivery details
        actualDeliveryStartTime: new Date().toISOString(),
        actualDeliveryEndTime: new Date().toISOString(),
        status: 'completed',
        
        // Additional tracking
        complaintNotes: deliveryData.complaintDescription || null
      };

      // Submit to new comprehensive delivery system with authentication
      const response = await fetch('/api/deliveries/complete', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify({
          loadSessionId: 'load_001',
          deliveredLiters: deliveryData.oilSuppliedLiters,
          deliveryData: deliveryRecord
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Delivery transaction saved:', result.transaction);
        
        toast({
          title: "Delivery Completed",
          description: `Successfully delivered ${deliveryData.oilSuppliedLiters}L to ${(oilTypes as any[]).find((t: any) => t.id === deliveryData.oilTypeId)?.name || 'Selected Oil Type'}. Load session updated.`
        });
        
        // Reset form for next delivery
        setDeliveryData({
          oilTypeId: '',
          loadedOilLiters: 0,
          branchId: '',
          deliveryOrderNo: '',
          startMeterReading: 0,
          endMeterReading: 0,
          oilSuppliedLiters: 0,
          complaintDescription: ''
        });
        setCurrentStep(1);
      } else {
        throw new Error('Failed to submit delivery');
      }
    } catch (error) {
      console.error('Delivery submission error:', error);
      toast({
        title: "Submission Failed",
        description: "Failed to save delivery record. Please try again.",
        variant: "destructive"
      });
    }
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return deliveryData.oilTypeId && deliveryData.loadedOilLiters > 0 && deliveryData.meterReadingPhoto;
      case 2:
        return deliveryData.branchId && deliveryData.deliveryOrderNo && 
               deliveryData.startMeterReading > 0 && deliveryData.tankLevelPhoto && 
               deliveryData.hoseConnectionPhoto;
      case 3:
        return deliveryData.endMeterReading > 0 && deliveryData.oilSuppliedLiters > 0 && 
               deliveryData.finalTankLevelPhoto;
      default:
        return false;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">New Delivery</h2>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => setComplaintDialogOpen(true)}
            data-testid="button-raise-complaint"
          >
            <AlertTriangleIcon className="w-4 h-4 mr-2" />
            Raise Complaint
          </Button>
          <Button
            variant="outline"
            onClick={() => setPreviewDialogOpen(true)}
            data-testid="button-preview-delivery"
          >
            <EyeIcon className="w-4 h-4 mr-2" />
            Preview Last Delivery
          </Button>
        </div>
      </div>

      {/* Progress Steps */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  step.status === 'completed' ? 'bg-green-500 border-green-500 text-white' :
                  step.status === 'active' ? 'bg-orange-500 border-orange-500 text-white' :
                  'bg-gray-200 border-gray-300 text-gray-500'
                }`}>
                  {step.status === 'completed' ? <CheckIcon className="w-5 h-5" /> : step.id}
                </div>
                <span className={`ml-2 font-medium ${
                  step.status === 'active' ? 'text-orange-600' : 
                  step.status === 'completed' ? 'text-green-600' : 'text-gray-500'
                }`}>
                  {step.title}
                </span>
                {index < steps.length - 1 && (
                  <div className={`w-16 h-1 mx-4 ${
                    step.status === 'completed' ? 'bg-green-500' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <Progress value={(currentStep / steps.length) * 100} className="h-2" />
        </CardContent>
      </Card>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            {currentStep === 1 && <TruckIcon className="w-5 h-5 mr-2" />}
            {currentStep === 2 && <MapPinIcon className="w-5 h-5 mr-2" />}
            {currentStep === 3 && <CheckIcon className="w-5 h-5 mr-2" />}
            {steps[currentStep - 1]?.title} Phase
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Loading Phase */}
          {currentStep === 1 && (
            <>
              <div>
                <Label htmlFor="oil-type">Select Oil Type *</Label>
                <Select 
                  value={deliveryData.oilTypeId} 
                  onValueChange={(value) => setDeliveryData(prev => ({ ...prev, oilTypeId: value }))}
                >
                  <SelectTrigger data-testid="select-oil-type">
                    <SelectValue placeholder="Choose oil type" />
                  </SelectTrigger>
                  <SelectContent>
                    {oilTypesLoading ? (
                      <SelectItem value="loading" disabled>Loading oil types...</SelectItem>
                    ) : oilTypes.length === 0 ? (
                      <SelectItem value="empty" disabled>No oil types available</SelectItem>
                    ) : (
                      (oilTypes as any[]).map((type: any) => (
                        <SelectItem key={type.id} value={type.id}>
                          <div className="flex items-center">
                            <div 
                              className="w-3 h-3 rounded-full mr-2" 
                              style={{ backgroundColor: type.color || '#f97316' }}
                            />
                            {type.name}
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="loaded-oil">Loaded Oil (Liters) *</Label>
                <Input
                  id="loaded-oil"
                  type="number"
                  value={deliveryData.loadedOilLiters || ''}
                  onChange={(e) => setDeliveryData(prev => ({ ...prev, loadedOilLiters: parseInt(e.target.value) || 0 }))}
                  placeholder="Enter liters loaded"
                  data-testid="input-loaded-oil"
                />
              </div>

              <div>
                <Label>Meter Reading Photo with Timestamp *</Label>
                <div className="flex items-center space-x-2 mt-2">
                  <Button
                    variant="outline"
                    onClick={() => openCamera('meterReading')}
                    data-testid="button-meter-photo"
                  >
                    <CameraIcon className="w-4 h-4 mr-2" />
                    Take Photo
                  </Button>
                  {deliveryData.meterReadingPhoto && (
                    <Badge variant="default" className="bg-green-500">
                      <CheckIcon className="w-3 h-3 mr-1" />
                      Photo Captured
                    </Badge>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Unloading Phase */}
          {currentStep === 2 && (
            <>
              <div>
                <Label htmlFor="branch">Select Branch *</Label>
                <Select 
                  value={deliveryData.branchId} 
                  onValueChange={(value) => setDeliveryData(prev => ({ ...prev, branchId: value }))}
                >
                  <SelectTrigger data-testid="select-branch">
                    <SelectValue placeholder="Choose branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branchesLoading ? (
                      <SelectItem value="loading" disabled>Loading branches...</SelectItem>
                    ) : branches.length === 0 ? (
                      <SelectItem value="empty" disabled>No branches available</SelectItem>
                    ) : (
                      (branches as any[]).map((branch: any) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.name}{branch.address ? ` - ${branch.address}` : ''}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="delivery-order">Delivery/Order No *</Label>
                <Input
                  id="delivery-order"
                  value={deliveryData.deliveryOrderNo}
                  onChange={(e) => setDeliveryData(prev => ({ ...prev, deliveryOrderNo: e.target.value }))}
                  placeholder="Enter delivery/order number"
                  data-testid="input-delivery-order"
                />
              </div>

              <div>
                <Label htmlFor="start-meter">Start Meter Reading *</Label>
                <Input
                  id="start-meter"
                  type="number"
                  value={deliveryData.startMeterReading || ''}
                  onChange={(e) => setDeliveryData(prev => ({ ...prev, startMeterReading: parseInt(e.target.value) || 0 }))}
                  placeholder="Previous meter reading"
                  data-testid="input-start-meter"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Previous meter reading when oil was supplied to customer
                </p>
              </div>

              <div>
                <Label>Branch Oil Tank Level Photo *</Label>
                <div className="flex items-center space-x-2 mt-2">
                  <Button
                    variant="outline"
                    onClick={() => openCamera('tankLevel')}
                    data-testid="button-tank-photo"
                  >
                    <CameraIcon className="w-4 h-4 mr-2" />
                    Take Photo
                  </Button>
                  {deliveryData.tankLevelPhoto && (
                    <Badge variant="default" className="bg-green-500">
                      <CheckIcon className="w-3 h-3 mr-1" />
                      Photo Captured
                    </Badge>
                  )}
                </div>
              </div>

              <div>
                <Label>Hose Connection Photo *</Label>
                <div className="flex items-center space-x-2 mt-2">
                  <Button
                    variant="outline"
                    onClick={() => openCamera('hoseConnection')}
                    data-testid="button-hose-photo"
                  >
                    <CameraIcon className="w-4 h-4 mr-2" />
                    Take Photo
                  </Button>
                  {deliveryData.hoseConnectionPhoto && (
                    <Badge variant="default" className="bg-green-500">
                      <CheckIcon className="w-3 h-3 mr-1" />
                      Photo Captured
                    </Badge>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Finish Phase */}
          {currentStep === 3 && (
            <>
              <div>
                <Label htmlFor="delivery-order-finish">Delivery/Order No *</Label>
                <Select 
                  value={deliveryData.deliveryOrderNo} 
                  onValueChange={(value) => setDeliveryData(prev => ({ ...prev, deliveryOrderNo: value }))}
                >
                  <SelectTrigger data-testid="select-delivery-order-finish">
                    <SelectValue placeholder="Choose delivery order" />
                  </SelectTrigger>
                  <SelectContent>
                    {deliveryOrders.length === 0 ? (
                      <SelectItem value="empty" disabled>No orders available</SelectItem>
                    ) : (
                      deliveryOrders.map(order => (
                        <SelectItem key={order.id} value={order.orderNo}>
                          {order.orderNo}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Oil Tank Level After Supply Photo *</Label>
                <div className="flex items-center space-x-2 mt-2">
                  <Button
                    variant="outline"
                    onClick={() => openCamera('finalTankLevel')}
                    data-testid="button-final-tank-photo"
                  >
                    <CameraIcon className="w-4 h-4 mr-2" />
                    Take Photo
                  </Button>
                  {deliveryData.finalTankLevelPhoto && (
                    <Badge variant="default" className="bg-green-500">
                      <CheckIcon className="w-3 h-3 mr-1" />
                      Photo Captured
                    </Badge>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="end-meter">Finish Meter Reading *</Label>
                <Input
                  id="end-meter"
                  type="number"
                  value={deliveryData.endMeterReading || ''}
                  onChange={(e) => setDeliveryData(prev => ({ ...prev, endMeterReading: parseInt(e.target.value) || 0 }))}
                  placeholder="Final meter reading"
                  data-testid="input-end-meter"
                />
              </div>

              <div>
                <Label htmlFor="oil-supplied">Oil Supplied (Liters) *</Label>
                <Input
                  id="oil-supplied"
                  type="number"
                  value={deliveryData.oilSuppliedLiters || ''}
                  onChange={(e) => setDeliveryData(prev => ({ ...prev, oilSuppliedLiters: parseInt(e.target.value) || 0 }))}
                  placeholder="Liters supplied to customer"
                  data-testid="input-oil-supplied"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Not linked with meter - manual entry
                </p>
              </div>

              {/* Review Section */}
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Review Delivery Details</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Oil Type:</span>
                    <p>{oilTypes.find((t: any) => t.id === deliveryData.oilTypeId)?.name || 'Not selected'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Loaded:</span>
                    <p>{deliveryData.loadedOilLiters} L</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Branch:</span>
                    <p>{branches.find((b: any) => b.id === deliveryData.branchId)?.name || 'Not selected'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Order No:</span>
                    <p>{deliveryData.deliveryOrderNo || 'Not entered'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Supplied:</span>
                    <p>{deliveryData.oilSuppliedLiters} L</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Meter Difference:</span>
                    <p>{deliveryData.endMeterReading - deliveryData.startMeterReading}</p>
                  </div>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditMode(!editMode)}
                  className="mt-3"
                  data-testid="button-edit-details"
                >
                  <EditIcon className="w-4 h-4 mr-2" />
                  {editMode ? 'Done Editing' : 'Edit Details'}
                </Button>
              </div>
            </>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between pt-6 border-t">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
              disabled={currentStep === 1}
              data-testid="button-previous-step"
            >
              Previous
            </Button>
            
            {currentStep < 3 ? (
              <Button
                onClick={handleStepNext}
                disabled={!isStepValid()}
                className="bg-orange-500 hover:bg-orange-600"
                data-testid="button-next-step"
              >
                Save & Next
              </Button>
            ) : (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    disabled={!isStepValid()}
                    className="bg-green-500 hover:bg-green-600"
                    data-testid="button-submit-delivery"
                  >
                    Submit Delivery
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Submission</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to submit this delivery? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleCompleteDelivery}>
                      Submit
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Camera Capture Dialog */}
      <CameraCapture
        isOpen={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={handlePhotoCapture}
        title={`Capture ${cameraType.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} Photo`}
      />

      {/* Complaint Dialog */}
      <Dialog open={complaintDialogOpen} onOpenChange={setComplaintDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Raise Complaint</DialogTitle>
            <DialogDescription>
              Submit a complaint about delivery or equipment issues with photo evidence.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Photo Evidence</Label>
              <div className="flex items-center space-x-2 mt-2">
                <Button
                  variant="outline"
                  onClick={() => openCamera('complaint')}
                  data-testid="button-complaint-photo"
                >
                  <CameraIcon className="w-4 h-4 mr-2" />
                  Take Photo
                </Button>
                {deliveryData.complaintPhoto && (
                  <Badge variant="default" className="bg-green-500">
                    <CheckIcon className="w-3 h-3 mr-1" />
                    Photo Captured
                  </Badge>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="complaint-branch">Select Branch</Label>
              <Select>
                <SelectTrigger data-testid="select-complaint-branch">
                  <SelectValue placeholder="Choose branch" />
                </SelectTrigger>
                <SelectContent>
                  {branchesLoading ? (
                    <SelectItem value="loading" disabled>Loading branches...</SelectItem>
                  ) : branches.length === 0 ? (
                    <SelectItem value="empty" disabled>No branches available</SelectItem>
                  ) : (
                    (branches as any[]).map((branch: any) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="complaint-tank">Select Oil Tank</Label>
              <Select>
                <SelectTrigger data-testid="select-complaint-tank">
                  <SelectValue placeholder="Choose oil tank" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tank1">Tank 1 - Diesel</SelectItem>
                  <SelectItem value="tank2">Tank 2 - Petrol</SelectItem>
                  <SelectItem value="tank3">Tank 3 - Kerosene</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="complaint-comment">Comment</Label>
              <Textarea
                id="complaint-comment"
                value={deliveryData.complaintDescription}
                onChange={(e) => setDeliveryData(prev => ({ ...prev, complaintDescription: e.target.value }))}
                placeholder="Describe the issue..."
                data-testid="textarea-complaint-comment"
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setComplaintDialogOpen(false)}>
                Cancel
              </Button>
              <Button className="bg-red-500 hover:bg-red-600" data-testid="button-submit-complaint">
                Submit Complaint
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Last Delivery Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Last Delivery Details</DialogTitle>
            <DialogDescription>
              Review the details and photos from your most recent delivery.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-gray-500">Date:</span>
                <p className="font-medium">14 Jan 2025, 09:30 AM</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Order No:</span>
                <p className="font-medium">ORD-2025-001</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Branch:</span>
                <p className="font-medium">Downtown Branch</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Oil Type:</span>
                <p className="font-medium">Diesel</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Oil Supplied:</span>
                <p className="font-medium">1500 L</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Status:</span>
                <Badge variant="default" className="bg-green-500">Completed</Badge>
              </div>
            </div>
            
            <div className="border-t pt-4">
              <h4 className="font-medium mb-2">Photos</h4>
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center">
                  <div className="w-20 h-20 bg-gray-200 rounded-lg mb-1 flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-xs text-gray-500">Meter Reading</p>
                </div>
                <div className="text-center">
                  <div className="w-20 h-20 bg-gray-200 rounded-lg mb-1 flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-xs text-gray-500">Tank Level</p>
                </div>
                <div className="text-center">
                  <div className="w-20 h-20 bg-gray-200 rounded-lg mb-1 flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-xs text-gray-500">Hose Connection</p>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}