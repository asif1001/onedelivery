/**
 * User guidance component for optimal image uploads
 */
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ImageUploadGuidanceProps {
  showGuidance?: boolean;
}

export function ImageUploadGuidance({ showGuidance = true }: ImageUploadGuidanceProps) {
  if (!showGuidance) return null;

  return (
    <div className="space-y-3 mb-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="text-sm">
          <strong>For best results:</strong>
          <ul className="mt-2 space-y-1 text-xs">
            <li>• Use JPEG or PNG format (HEIC may cause delays)</li>
            <li>• Keep images under 10MB for faster processing</li>
            <li>• Ensure good lighting for clear readings</li>
            <li>• Hold camera steady to avoid blurry photos</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
}

export function ImageUploadStatus({ fileName, fileSize, fileType }: { 
  fileName: string; 
  fileSize: number; 
  fileType: string; 
}) {
  const sizeInMB = fileSize / (1024 * 1024);
  const isOptimal = sizeInMB < 10 && (fileType.includes('jpeg') || fileType.includes('png'));
  const hasWarning = sizeInMB > 25 || fileType.includes('heic');

  return (
    <div className="text-xs space-y-1">
      <div className="flex items-center gap-2">
        {isOptimal ? (
          <CheckCircle className="h-3 w-3 text-green-500" />
        ) : (
          <AlertTriangle className="h-3 w-3 text-yellow-500" />
        )}
        <span className="truncate">{fileName}</span>
      </div>
      
      <div className="text-gray-500">
        {sizeInMB.toFixed(1)}MB • {fileType}
      </div>
      
      {hasWarning && (
        <div className="text-yellow-600 text-xs">
          {sizeInMB > 25 && "Large file - may process slowly"}
          {fileType.includes('heic') && "HEIC format - converting to JPEG"}
        </div>
      )}
    </div>
  );
}