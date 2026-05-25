export const addTimestampToImage = (imageBlob: Blob): Promise<Blob> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Set canvas size to match image
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Draw original image
      ctx!.drawImage(img, 0, 0);
      
      // Add timestamp overlay
      const now = new Date();
      const timestamp = now.toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      
      // Configure text style
      const fontSize = Math.max(img.width / 25, 20); // Responsive font size
      ctx!.font = `bold ${fontSize}px Arial`;
      ctx!.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx!.strokeStyle = 'white';
      ctx!.lineWidth = 2;
      
      // Position timestamp at bottom right
      const padding = fontSize / 2;
      const x = img.width - padding;
      const y = img.height - padding;
      
      // Draw timestamp with outline
      ctx!.textAlign = 'right';
      ctx!.textBaseline = 'bottom';
      ctx!.strokeText(timestamp, x, y);
      ctx!.fillText(timestamp, x, y);
      
      // Convert canvas to blob
      canvas.toBlob((blob) => {
        resolve(blob!);
      }, 'image/jpeg', 0.8);
    };
    
    img.src = URL.createObjectURL(imageBlob);
  });
};