import { ReactNode, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader } from '@/components/ui/dialog';
import { CameraCapture } from './CameraCapture';

interface PhotoCaptureButtonProps {
  onCapture: (blob: Blob, timestamp: string) => void;
  className?: string;
  title: string;
  branchName: string;
  children: ReactNode;
}

export function PhotoCaptureButton({
  onCapture,
  className,
  title,
  branchName,
  children
}: PhotoCaptureButtonProps) {
  const [showCamera, setShowCamera] = useState(false);

  const handleCapture = (blob: Blob, timestamp: string) => {
    onCapture(blob, timestamp);
    setShowCamera(false);
  };

  return (
    <>
      <Button 
        onClick={() => setShowCamera(true)} 
        className={className}
        data-testid="button-photo-capture"
      >
        {children}
      </Button>
      
      <Dialog open={showCamera} onOpenChange={setShowCamera}>
        <DialogContent className="max-w-2xl" aria-describedby="camera-dialog-description">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription id="camera-dialog-description">
              Take a photo as evidence for {branchName}
            </DialogDescription>
          </DialogHeader>
          <CameraCapture
            isOpen={showCamera}
            onCapture={handleCapture}
            onClose={() => setShowCamera(false)}
            title={title}
            branchName={branchName}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}