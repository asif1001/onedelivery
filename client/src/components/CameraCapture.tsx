import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CameraIcon, CheckIcon, XIcon, RefreshCwIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CameraCaptureProps {
  onCapture: (imageBlob: Blob, timestamp: string) => void;
  isOpen: boolean;
  onClose: () => void;
  title: string;
  branchName?: string;
}

export function CameraCapture({ onCapture, isOpen, onClose, title, branchName }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const { toast } = useToast();

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        } 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        title: "Camera Error",
        description: "Unable to access camera. Please check permissions.",
        variant: "destructive"
      });
    }
  }, [toast]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas (no watermark here - handled by watermark utility)
    context.drawImage(video, 0, 0);

    // Convert to blob
    canvas.toBlob((blob) => {
      if (blob) {
        const imageUrl = URL.createObjectURL(blob);
        setCapturedImage(imageUrl);
        setIsCapturing(true);
      }
    }, 'image/jpeg', 0.8);
  }, []);

  const confirmCapture = useCallback(() => {
    if (!canvasRef.current || !capturedImage) return;

    canvasRef.current.toBlob((blob) => {
      if (blob) {
        const timestamp = new Date().toISOString();
        onCapture(blob, timestamp);
        setCapturedImage(null);
        setIsCapturing(false);
        stopCamera();
        onClose();
      }
    }, 'image/jpeg', 0.8);
  }, [capturedImage, onCapture, stopCamera, onClose]);

  const retakePhoto = useCallback(() => {
    setCapturedImage(null);
    setIsCapturing(false);
  }, []);

  const handleClose = useCallback(() => {
    stopCamera();
    setCapturedImage(null);
    setIsCapturing(false);
    onClose();
  }, [stopCamera, onClose]);

  // Start camera when dialog opens
  const handleOpenChange = useCallback((open: boolean) => {
    if (open) {
      startCamera();
    } else {
      handleClose();
    }
  }, [startCamera, handleClose]);

  // Auto-start camera when dialog opens
  useEffect(() => {
    if (isOpen) {
      startCamera();
    }
  }, [isOpen, startCamera]);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg" aria-describedby="camera-description">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <p id="camera-description" className="sr-only">
          Camera interface for capturing delivery photos with timestamp overlay
        </p>
        
        <div className="space-y-4">
          {!isCapturing ? (
            <>
              <div className="relative bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-48 object-cover"
                  data-testid="camera-video"
                />
              </div>
              
              <div className="flex justify-center space-x-2">
                <Button
                  onClick={capturePhoto}
                  disabled={!stream}
                  className="bg-orange-500 hover:bg-orange-600"
                  data-testid="button-capture-photo"
                >
                  <CameraIcon className="w-5 h-5 mr-2" />
                  Capture Photo
                </Button>
                
                <Button
                  variant="outline"
                  onClick={handleClose}
                  data-testid="button-cancel-camera"
                >
                  <XIcon className="w-5 h-5 mr-2" />
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="relative rounded-lg overflow-hidden">
                <img
                  src={capturedImage || ''}
                  alt="Captured"
                  className="w-full h-48 object-cover"
                  data-testid="captured-image"
                />
              </div>
              
              <div className="flex justify-center space-x-2">
                <Button
                  onClick={confirmCapture}
                  className="bg-green-500 hover:bg-green-600"
                  data-testid="button-confirm-photo"
                >
                  <CheckIcon className="w-5 h-5 mr-2" />
                  Use Photo
                </Button>
                
                <Button
                  variant="outline"
                  onClick={retakePhoto}
                  data-testid="button-retake-photo"
                >
                  <RefreshCwIcon className="w-5 h-5 mr-2" />
                  Retake
                </Button>
              </div>
            </>
          )}
        </div>
        
        <canvas ref={canvasRef} className="hidden" />
      </DialogContent>
    </Dialog>
  );
}