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
    // Check if app is actually installed (more specific detection)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isIOSInstalled = (window.navigator as any).standalone === true;
    const isInApp = window.location.href.includes('app://') || window.location.protocol === 'app:';
    
    // Only consider installed if we're actually in a real standalone app
    if ((isStandalone || isIOSInstalled || isInApp) && window.location.protocol !== 'http:') {
      setIsInstalled(true);
      console.log('OneDelivery is already installed as PWA');
      return;
    }
    
    console.log('PWA not installed, setting up install capability...');
    console.log('Display mode:', isStandalone ? 'standalone' : 'browser');
    console.log('Protocol:', window.location.protocol);

    // Check if recently dismissed
    const recentlyDismissed = localStorage.getItem('onedelivery-install-dismissed');
    if (recentlyDismissed) {
      const dismissedTime = parseInt(recentlyDismissed);
      const oneDay = 24 * 60 * 60 * 1000;
      if (Date.now() - dismissedTime < oneDay) {
        console.log('PWA install prompt recently dismissed, skipping');
        return;
      }
    }

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: any) => {
      console.log('beforeinstallprompt event fired');
      e.preventDefault();
      setInstallPrompt(e);
      
      // Show prompt after a delay to not be intrusive
      setTimeout(() => {
        console.log('Showing PWA install prompt');
        setShowPrompt(true);
      }, 5000); // Increased to 5 seconds
    };

    // Listen for successful installation
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      console.log('OneDelivery installed successfully as PWA!');
      // Clear dismissed flag since app is now installed
      localStorage.removeItem('onedelivery-install-dismissed');
    };

    // For development/testing - show install prompt for testing
    const testTrigger = setTimeout(() => {
      if (!isInstalled && !showPrompt && !installPrompt && window.location.hostname === 'localhost') {
        console.log('🧪 Development mode: Showing PWA install prompt for testing');
        console.log('If you want to test real install, use Chrome/Edge and check address bar for install icon');
        
        // Create a test prompt that provides real install instructions
        setInstallPrompt({ 
          prompt: () => {
            console.log('Test install triggered - showing real install instructions');
            return Promise.resolve();
          },
          userChoice: Promise.resolve({ outcome: 'accepted' })
        });
        setShowPrompt(true);
      }
    }, 8000); // Show after 8 seconds for testing

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      clearTimeout(testTrigger);
    };
  }, [isInstalled, showPrompt]);

  const handleInstall = async () => {
    console.log('Install button clicked');
    
    if (!installPrompt || !installPrompt.prompt) {
      console.log('Showing manual install instructions');
      
      // Show detailed install instructions
      const instructions = window.location.hostname === 'localhost' 
        ? `🧪 DEVELOPMENT MODE - To test real PWA install:

1. Open this app in Chrome or Edge
2. Look for install icon (⊕) in address bar  
3. Click it to install as desktop app
4. Or Chrome menu → Install OneDelivery

📱 On Mobile:
- Chrome: Menu → Add to Home Screen
- Safari: Share → Add to Home Screen

🖥️ Desktop Features:
- Runs without browser
- Start Menu shortcut
- Taskbar integration
- Offline support`
        : `To install OneDelivery as desktop app:

🖥️ Desktop (Chrome/Edge):
1. Click install icon in address bar
2. Or Browser menu → Install OneDelivery

📱 Mobile:
- Chrome: Menu → Add to Home Screen  
- Safari: Share → Add to Home Screen

✨ Benefits:
- Faster loading
- Works offline
- Desktop integration
- No browser clutter`;
      
      alert(instructions);
      setShowPrompt(false);
      return;
    }

    try {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('✅ User accepted PWA install');
        onInstall?.();
      } else {
        console.log('❌ User dismissed PWA install');
      }
      
      setInstallPrompt(null);
      setShowPrompt(false);
    } catch (error) {
      console.error('PWA install failed:', error);
      // Fallback to manual instructions
      handleInstall();
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