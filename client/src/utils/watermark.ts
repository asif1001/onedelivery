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
    
    // PERFORMANCE: Set timeout for image loading
    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error('Image loading timeout'));
    }, 5000);
    
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
          reject(new Error('Canvas context not available'));
          return;
        }

        // Set canvas size to image size
        canvas.width = img.width;
        canvas.height = img.height;
        
        // PERFORMANCE: Use faster image drawing
        ctx.imageSmoothingEnabled = false; // Disable smoothing for speed
        ctx.drawImage(img, 0, 0);
        
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
    
    img.onerror = () => {
      clearTimeout(timeoutId);
      cleanup();
      reject(new Error('Failed to load image for watermarking'));
    };
    
    img.src = URL.createObjectURL(file);
  });
}