/**
 * PERFORMANCE OPTIMIZED: Watermark utility for adding text overlays to images before upload
 */
import { Timestamp } from 'firebase/firestore';

interface WatermarkOptions {
  branchName: string;
  timestamp: Date | Timestamp;
  extraLine1?: string; // e.g., "Driver: John Doe"
  extraLine2?: string; // e.g., "Type: Loading" or "Type: Supply"
}

/**
 * PERFORMANCE OPTIMIZED: Adds watermark to an image file with branch, timestamp, and optional extra lines
 * @param file - The original image file
 * @param options - Watermark text options
 * @returns Promise<File> - Watermarked image file ready for upload
 */
export async function watermarkImage(file: File, options: WatermarkOptions): Promise<File> {
  const { branchName, timestamp, extraLine1, extraLine2 } = options;
  
  // COMPREHENSIVE ERROR DETECTION: Check multiple failure scenarios
  console.log('🔍 Starting watermark analysis:', {
    fileName: file.name,
    fileType: file.type,
    fileSize: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
    timestamp: new Date().toISOString()
  });
  
  // 1. FILE SIZE CHECK: Large images can cause memory issues
  const maxSizeMB = 50; // 50MB limit
  if (file.size > maxSizeMB * 1024 * 1024) {
    throw new Error(`Image too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size: ${maxSizeMB}MB`);
  }
  
  // 2. FILE TYPE VALIDATION: Check if browser supports the format
  if (!file.type.startsWith('image/')) {
    throw new Error(`Invalid file type: ${file.type}. Expected image format.`);
  }
  
  // 3. DEVICE COMPATIBILITY: Check for unsupported formats (HEIC, etc.)
  const fileExtension = file.name.toLowerCase();
  const unsupportedFormats = ['.heic', '.heif'];
  const isUnsupportedFormat = unsupportedFormats.some(ext => fileExtension.endsWith(ext));
  
  if (isUnsupportedFormat) {
    console.warn('⚠️ HEIC/HEIF format detected, attempting conversion...');
    try {
      const convertedFile = await convertToSupportedFormat(file);
      return watermarkImage(convertedFile, options);
    } catch (conversionError) {
      console.error('❌ Format conversion failed, using fallback...', conversionError);
      // Return original file with fallback naming convention
      return new File([file], file.name.replace(/\.(heic|heif)$/i, '.jpg'), {
        type: 'image/jpeg',
        lastModified: Date.now()
      });
    }
  }
  
  // 4. MEMORY CHECK: Verify available memory (rough estimate)
  if (typeof performance !== 'undefined' && (performance as any).memory) {
    const memory = (performance as any).memory;
    const availableMemory = memory.jsHeapSizeLimit - memory.usedJSHeapSize;
    const estimatedImageMemory = file.size * 4; // Rough estimate for canvas processing
    
    if (availableMemory < estimatedImageMemory) {
      console.warn('⚠️ Low memory detected, may affect watermarking');
    }
  }
  
  return new Promise((resolve, reject) => {
    const img = new Image();
    let canvas: HTMLCanvasElement | null = null;
    let ctx: CanvasRenderingContext2D | null = null;
    
    // MEMORY CLEANUP function
    const cleanup = () => {
      if (img.src && img.src.startsWith('blob:')) {
        URL.revokeObjectURL(img.src);
      }
      if (canvas) {
        canvas.width = 1;
        canvas.height = 1;
        canvas = null;
      }
      ctx = null;
    };
    
    // PERFORMANCE: Set timeout for image loading (increased for large images)
    const timeoutDuration = Math.max(5000, Math.min(15000, file.size / 1024)); // Dynamic timeout based on file size
    const timeoutId = setTimeout(() => {
      cleanup();
      console.error('❌ Image loading timeout:', {
        fileName: file.name,
        fileSize: `${(file.size / 1024).toFixed(1)}KB`,
        timeoutDuration: `${timeoutDuration}ms`
      });
      reject(new Error(`Image loading timeout (${timeoutDuration}ms). File may be corrupted or too large.`));
    }, timeoutDuration);
    
    img.onload = () => {
      clearTimeout(timeoutId);
      try {
        // PERFORMANCE: Create canvas with image dimensions
        canvas = document.createElement('canvas');
        ctx = canvas.getContext('2d', { 
          alpha: true,
          willReadFrequently: false // Optimization for write-only canvas
        });
        
        if (!ctx || !canvas) {
          cleanup();
          reject(new Error('Canvas context not available. Browser may not support canvas operations or is out of memory.'));
          return;
        }
        
        // 5. IMAGE DIMENSION CHECK: Verify reasonable dimensions
        if (img.width <= 0 || img.height <= 0) {
          cleanup();
          reject(new Error(`Invalid image dimensions: ${img.width}x${img.height}`));
          return;
        }
        
        if (img.width > 8192 || img.height > 8192) {
          cleanup();
          reject(new Error(`Image too large: ${img.width}x${img.height}. Maximum: 8192x8192 pixels`));
          return;
        }

        // Set canvas size to image size with memory safety
        try {
          canvas.width = img.width;
          canvas.height = img.height;
        } catch (error) {
          cleanup();
          reject(new Error(`Canvas allocation failed. Image too large: ${img.width}x${img.height}. Try a smaller image.`));
          return;
        }
        
        // PERFORMANCE: Use faster image drawing with error handling
        try {
          ctx.imageSmoothingEnabled = false; // Disable smoothing for speed
          ctx.drawImage(img, 0, 0);
        } catch (error) {
          cleanup();
          reject(new Error('Failed to draw image on canvas. Image may be corrupted.'));
          return;
        }
        
        // Prepare watermark text
        const formattedTimestamp = timestamp instanceof Date 
          ? timestamp.toLocaleString()
          : timestamp.toDate().toLocaleString();
        
        const lines = [
          `Branch: ${branchName}`,
          `Time: ${formattedTimestamp}`
        ];
        
        if (extraLine1) lines.push(extraLine1);
        if (extraLine2) lines.push(extraLine2);
        
        // Text styling
        const fontSize = Math.max(12, Math.min(img.width / 40, 16)); // Responsive font size
        ctx.font = `${fontSize}px Arial, sans-serif`;
        ctx.fillStyle = 'white';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        
        // Calculate text dimensions
        const lineHeight = fontSize * 1.2;
        const padding = 8;
        const maxLineWidth = Math.max(...lines.map(line => ctx!.measureText(line).width));
        const boxWidth = maxLineWidth + (padding * 2);
        const boxHeight = (lines.length * lineHeight) + (padding * 2);
        
        // Position in bottom-right corner
        const boxX = img.width - boxWidth - 10;
        const boxY = img.height - boxHeight - 10;
        
        // Draw semi-transparent black background with rounded corners
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        
        // Rounded rectangle function
        const drawRoundedRect = (x: number, y: number, width: number, height: number, radius: number) => {
          if (!ctx) return;
          ctx.beginPath();
          ctx.moveTo(x + radius, y);
          ctx.lineTo(x + width - radius, y);
          ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
          ctx.lineTo(x + width, y + height - radius);
          ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
          ctx.lineTo(x + radius, y + height);
          ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
          ctx.lineTo(x, y + radius);
          ctx.quadraticCurveTo(x, y, x + radius, y);
          ctx.closePath();
          ctx.fill();
        };
        
        drawRoundedRect(boxX, boxY, boxWidth, boxHeight, 4);
        
        // Reset shadow for text
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        
        // Draw text lines
        ctx.fillStyle = 'white';
        lines.forEach((line, index) => {
          if (ctx) {
            ctx.fillText(
              line,
              boxX + padding,
              boxY + padding + (index * lineHeight)
            );
          }
        });
        
        // PERFORMANCE: Convert to blob with optimized settings
        canvas.toBlob((blob) => {
          try {
            if (blob) {
              const watermarkedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now()
              });
              cleanup(); // Clean up resources immediately
              resolve(watermarkedFile);
            } else {
              cleanup();
              reject(new Error('Failed to create watermarked image blob'));
            }
          } catch (error) {
            cleanup();
            reject(error);
          }
        }, 'image/jpeg', 0.85); // Slightly reduced quality for faster processing
        
      } catch (error) {
        cleanup();
        reject(error);
      }
    };
    
    img.onerror = (error) => {
      clearTimeout(timeoutId);
      cleanup();
      console.error('❌ Image loading failed:', {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        error: error
      });
      
      // Provide detailed error message for debugging
      const errorMessage = fileExtension.includes('.heic') || fileExtension.includes('.heif')
        ? 'HEIC format not supported on this device. Please use JPEG format.'
        : `Failed to load image for watermarking. Format: ${file.type || 'unknown'}`;
      
      reject(new Error(errorMessage));
    };
    
    // Create object URL for the image with enhanced error handling
    try {
      img.src = URL.createObjectURL(file);
      console.log('📸 Loading image for watermarking:', {
        fileName: file.name,
        fileType: file.type,
        fileSize: `${(file.size / 1024).toFixed(1)}KB`
      });
    } catch (error) {
      clearTimeout(timeoutId);
      cleanup();
      console.error('❌ Failed to create image URL:', error);
      reject(new Error('Failed to create image URL for watermarking'));
    }
  });
}

/**
 * DEVICE COMPATIBILITY: Convert unsupported formats to JPEG
 */
async function convertToSupportedFormat(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    // For unsupported formats, try to load via FileReader and canvas conversion
    const reader = new FileReader();
    
    reader.onload = () => {
      const img = new Image();
      
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            reject(new Error('Canvas context not available for conversion'));
            return;
          }
          
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          
          canvas.toBlob((blob) => {
            if (blob) {
              const convertedFile = new File([blob], file.name.replace(/\.(heic|heif)$/i, '.jpg'), {
                type: 'image/jpeg',
                lastModified: Date.now()
              });
              console.log('✅ Successfully converted HEIC to JPEG');
              resolve(convertedFile);
            } else {
              reject(new Error('Failed to convert image format'));
            }
          }, 'image/jpeg', 0.9);
          
        } catch (error) {
          reject(error);
        }
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image for conversion'));
      };
      
      if (reader.result) {
        img.src = reader.result as string;
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file for conversion'));
    };
    
    reader.readAsDataURL(file);
  });
}