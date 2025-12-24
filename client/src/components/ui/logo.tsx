export function OilDeliveryLogo({ className = "w-12 h-12" }: { className?: string }) {
  // Firebase Storage logo URL - using the logo folder you created
  const firebaseLogoUrl = "https://firebasestorage.googleapis.com/v0/b/oneplace-b5fc3.appspot.com/o/logo%2Fonedelivery-logo.png?alt=media";
  
  return (
    <div className={`${className} flex items-center justify-center`}>
      <img 
        src={firebaseLogoUrl}
        alt="OneDelivery Logo" 
        className="w-full h-full object-contain"
        style={{ maxWidth: '100%', height: 'auto' }}
        onLoad={() => console.log('OneDelivery logo loaded successfully from Firebase Storage')}
        onError={(e) => {
          console.error('Firebase Storage logo failed to load, trying local fallback:', e);
          const target = e.target as HTMLImageElement;
          target.src = '/apple-touch-icon.png'; // Local fallback
        }}
      />
    </div>
  );
}