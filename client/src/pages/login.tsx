import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { OilDeliveryLogo } from '@/components/ui/logo';

// Version number - update this whenever code changes are made
const APP_VERSION = "v1.3.0";

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleLogin = async () => {
    if (!email || !password) {
      toast({
        title: "Missing Information",
        description: "Please enter both email and password",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Sign in with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      // SECURITY: Check if user exists in Firestore (must be pre-created by admin)
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        // User doesn't exist in Firestore - they are not authorized
        await auth.signOut(); // Sign them out immediately
        throw new Error('UNAUTHORIZED_USER');
      }
      
      const userData = userDoc.data();
      
      // Check if user account is active
      if (!userData.active) {
        await auth.signOut(); // Sign them out immediately
        throw new Error('ACCOUNT_DISABLED');
      }
      
      // Update last login time
      await updateDoc(userDocRef, {
        lastLoginAt: new Date()
      });
      
      // Store user session (userData already loaded above)
      const userSession = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        role: userData.role,
        displayName: userData.displayName || firebaseUser.displayName || email.split('@')[0],
        active: userData.active
      };
      
      localStorage.setItem('currentUser', JSON.stringify(userSession));
      
      toast({
        title: "Welcome!",
        description: `Successfully signed in as ${userSession.role}`
      });
      
      // Force page reload to trigger auth check and routing
      setTimeout(() => {
        window.location.href = window.location.origin + window.location.pathname;
      }, 100);
      
    } catch (error: any) {
      console.error("Login error:", error);
      
      let errorMessage = "Login failed. Please check your credentials.";
      
      if (error.message === 'UNAUTHORIZED_USER') {
        errorMessage = "Access denied. Only authorized company users can login. Contact your administrator.";
      } else if (error.message === 'ACCOUNT_DISABLED') {
        errorMessage = "Your account has been disabled. Contact your administrator.";
      } else {
        switch (error.code) {
          case 'auth/invalid-email':
            errorMessage = "Please enter a valid email address.";
            break;
          case 'auth/user-not-found':
          case 'auth/wrong-password':
          case 'auth/invalid-credential':
            errorMessage = "Invalid email or password. Please try again.";
            break;
          case 'auth/too-many-requests':
            errorMessage = "Too many failed attempts. Please try again later.";
            break;
          case 'auth/network-request-failed':
            errorMessage = "Network error. Please check your connection.";
            break;
          default:
            errorMessage = "Login failed. Please try again.";
        }
      }
      
      toast({
        title: "Login Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-600 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="bg-white rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-4 shadow-xl p-2">
            <OilDeliveryLogo className="w-full h-full" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">OneDelivery</h1>
          <p className="text-blue-100 text-sm">Professional Oil Delivery Management</p>
        </div>

        {/* Login Card */}
        <Card className="shadow-2xl border-0">
          <CardContent className="p-6 sm:p-8">
            <div className="mb-6 text-center">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">Sign In</h2>
              <p className="text-gray-600 text-sm">Enter your credentials to access your account</p>
            </div>

            <div className="space-y-4 sm:space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold text-gray-700">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="h-11 sm:h-12 text-base border-2 border-gray-300 bg-white text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 placeholder:text-gray-500"
                  data-testid="input-email"
                  autoComplete="email"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-semibold text-gray-700">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="h-11 sm:h-12 text-base border-2 border-gray-300 bg-white text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 placeholder:text-gray-500"
                  data-testid="input-password"
                  autoComplete="current-password"
                />
              </div>

              <Button
                onClick={handleLogin}
                disabled={isLoading}
                className="w-full h-11 sm:h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] mt-6"
                data-testid="button-login"
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Signing In...
                  </div>
                ) : (
                  "Sign In"
                )}
              </Button>

              <div className="text-center mt-4 text-xs text-gray-500">
                <p>Use your registered email and password to access OneDelivery</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-6 text-blue-100 text-xs">
          <p>OneDelivery - Secure Oil Delivery Management System</p>
          <p className="mt-2 opacity-75">Version {APP_VERSION}</p>
        </div>
      </div>
    </div>
  );
}