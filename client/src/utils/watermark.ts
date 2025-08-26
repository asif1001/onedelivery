/**
 * Watermark utility for adding text overlays to images before upload
 */
import { Timestamp } from 'firebase/firestore';

interface WatermarkOptions {
  branchName: string;
  timestamp: Date | Timestamp;
  extraLine1?: string; // e.g., "Driver: John Doe"
  extraLine2?: string; // e.g., "Type: Loading" or "Type: Supply"
}

/**
 * Adds watermark to an image file with branch, timestamp, and optional extra lines
 * @param file - The original image file
 * @param options - Watermark text options
 * @returns Promise<File> - Watermarked image file ready for upload
 */
export async function watermarkImage(file: File, options: WatermarkOptions): Promise<File> {
  const { branchName, timestamp, extraLine1, extraLine2 } = options;
  
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        // Create canvas with image dimensions
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        // Set canvas size to image size
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Draw the original image
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
        const maxLineWidth = Math.max(...lines.map(line => ctx.measureText(line).width));
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
          ctx.fillText(
            line,
            boxX + padding,
            boxY + padding + (index * lineHeight)
          );
        });
        
        // Convert canvas to blob with quality control
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to create blob from canvas'));
              return;
            }
            
            // Create new file with watermarked image
            const watermarkedFile = new File(
              [blob],
              file.name.replace(/\.(jpg|jpeg|png)$/i, '_watermarked.jpg'),
              { 
                type: 'image/jpeg',
                lastModified: Date.now()
              }
            );
            
            // Check file size and reduce quality if needed
            if (watermarkedFile.size > 300 * 1024) { // 300KB limit
              canvas.toBlob(
                (smallerBlob) => {
                  if (!smallerBlob) {
                    reject(new Error('Failed to create compressed blob'));
                    return;
                  }
                  
                  const compressedFile = new File(
                    [smallerBlob],
                    file.name.replace(/\.(jpg|jpeg|png)$/i, '_watermarked.jpg'),
                    { 
                      type: 'image/jpeg',
                      lastModified: Date.now()
                    }
                  );
                  
                  resolve(compressedFile);
                },
                'image/jpeg',
                0.7 // Lower quality for size reduction
              );
            } else {
              resolve(watermarkedFile);
            }
          },
          'image/jpeg',
          0.9 // High quality
        );
        
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };
    
    // Load image from file
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        img.src = e.target.result as string;
      } else {
        reject(new Error('Failed to read file'));
      }
    };
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Helper function to get current timestamp
 */
export function getCurrentTimestamp(): Date {
  return new Date();
}