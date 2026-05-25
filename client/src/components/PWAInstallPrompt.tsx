import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DownloadIcon, SmartphoneIcon, MonitorIcon, XIcon } from 'lucide-react';

interface PWAInstallPromptProps {
  onInstall?: () => void;
  onDismiss?: () => void;
}

export function PWAInstallPrompt({ onInstall, onDismiss }: PWAInstallPromptProps) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Skip PWA prompts in development mode
    if (import.meta.env.DEV) {
      console.log('Development mode: PWA install prompt disabled');
      return;
    }

    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      console.log('OneDelivery is already installed as PWA');
      return;
    }

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
      
      // Show prompt after a delay to not be intrusive
      setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
    };

    // Listen for successful installation
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      console.log('OneDelivery installed successfully!');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;

    try {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('User accepted PWA install');
        onInstall?.();
      } else {
        console.log('User dismissed PWA install');
      }
      
      setInstallPrompt(null);
      setShowPrompt(false);
    } catch (error) {
      console.error('PWA install failed:', error);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    onDismiss?.();
    
    // Don't show again for this session
    localStorage.setItem('onedelivery-install-dismissed', Date.now().toString());
  };

  // Don't show if already installed or recently dismissed
  const recentlyDismissed = localStorage.getItem('onedelivery-install-dismissed');
  if (isInstalled || !showPrompt || !installPrompt) {
    return null;
  }

  if (recentlyDismissed) {
    const dismissedTime = parseInt(recentlyDismissed);
    const oneDay = 24 * 60 * 60 * 1000;
    if (Date.now() - dismissedTime < oneDay) {
      return null;
    }
  }

  return (
    <Dialog open={showPrompt} onOpenChange={setShowPrompt}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DownloadIcon className="h-5 w-5 text-orange-500" />
            Install OneDelivery
          </DialogTitle>
          <DialogDescription className="text-left space-y-3">
            <p>
              Get the full OneDelivery experience! Install our app for:
            </p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <MonitorIcon className="h-4 w-4 text-blue-500" />
                <span>Desktop access without browser</span>
              </li>
              <li className="flex items-center gap-2">
                <SmartphoneIcon className="h-4 w-4 text-green-500" />
                <span>Faster loading and offline access</span>
              </li>
              <li className="flex items-center gap-2">
                <DownloadIcon className="h-4 w-4 text-purple-500" />
                <span>Quick access from Start Menu or Desktop</span>
              </li>
            </ul>
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex gap-3 mt-4">
          <Button 
            onClick={handleInstall}
            className="flex-1 bg-orange-500 hover:bg-orange-600"
            data-testid="pwa-install-button"
          >
            <DownloadIcon className="h-4 w-4 mr-2" />
            Install App
          </Button>
          <Button 
            variant="outline" 
            onClick={handleDismiss}
            className="flex items-center gap-2"
            data-testid="pwa-dismiss-button"
          >
            <XIcon className="h-4 w-4" />
            Maybe Later
          </Button>
        </div>
        
        <p className="text-xs text-gray-500 mt-2">
          Works on Windows, Mac, and mobile devices
        </p>
      </DialogContent>
    </Dialog>
  );
}