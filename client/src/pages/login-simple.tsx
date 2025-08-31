import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { OilDeliveryLogo } from '@/components/ui/logo';

export default function LoginSimple() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);
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
      console.log('🔐 Attempting secure Firebase authentication for:', email);
      
      // Import Firebase functions
      const { signInWithEmailAndPassword } = await import('firebase/auth');
      const { doc, getDoc } = await import('firebase/firestore');
      const { auth, db } = await import('../lib/firebase');
      
      // Step 1: Authenticate with Firebase Auth
      let userCredential;
      let firebaseUser;
      
      // Authenticate with Firebase
      userCredential = await signInWithEmailAndPassword(auth, email, password);
      firebaseUser = userCredential.user;
      console.log('✅ Firebase Auth successful for:', firebaseUser.email);
      
      // Step 2: Check if user exists in Firestore database
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        // Special case: Auto-create authorized company users
        if (firebaseUser.email && firebaseUser.email.endsWith('@ekkanoo.com.bh')) {
          console.log('🔧 Auto-creating authorized company user:', firebaseUser.email);
          
          // Determine role based on email
          let role = 'driver';
          let branchIds: string[] = [];
          
          if (firebaseUser.email === 'asif.s@ekkanoo.com.bh' || firebaseUser.email === 'asif1001@gmail.com') {
            role = 'admin';
          } else if (firebaseUser.email === 'husain.m@ekkanoo.com.bh' || firebaseUser.email === 'husain.new@ekkanoo.com.bh') {
            role = 'branch_user';
            branchIds = ['branch-arad', 'branch-main-tank'];
          } else if (firebaseUser.email.includes('warehouse') || firebaseUser.email.includes('inventory') || firebaseUser.email === 'warehouse@ekkanoo.com.bh') {
            role = 'warehouse';
          } else if (firebaseUser.email.includes('branch') || firebaseUser.email.includes('manager')) {
            role = 'branch_user';
          }
          
          // Create user record in Firestore
          const { setDoc } = await import('firebase/firestore');
          await setDoc(userDocRef, {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            role: role,
            displayName: firebaseUser.displayName || firebaseUser.email.split('@')[0],
            active: true,
            branchIds: branchIds as string[],
            createdAt: new Date(),
            lastLoginAt: new Date()
          });
          
          console.log('✅ Auto-created user with role:', role);
          
          // Reload user document
          const newUserDoc = await getDoc(userDocRef);
          if (newUserDoc.exists()) {
            const userDocData = newUserDoc.data();
            console.log('✅ User auto-created in database with role:', userDocData.role);
          }
        } else {
          console.log('❌ User not found in database:', firebaseUser.email);
          await auth.signOut();
          throw new Error('USER_NOT_AUTHORIZED');
        }
      }
      
      // Get user data (might be newly created)
      const userDocData = userDoc.exists() ? userDoc.data() : (await getDoc(userDocRef)).data();
      
      if (!userDocData) {
        console.log('❌ Unable to retrieve user data');
        await auth.signOut();
        throw new Error('USER_DATA_ERROR');
      }
      
      console.log('✅ User found in database with role:', userDocData.role);
      
      // Step 3: Check if user account is active
      if (!userDocData.active) {
        console.log('❌ User account is disabled:', firebaseUser.email);
        await auth.signOut();
        throw new Error('ACCOUNT_DISABLED');
      }
      
      // Step 4: Create user session with database data
      const userData = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        role: userDocData.role,
        displayName: userDocData.displayName || firebaseUser.displayName || email.split('@')[0],
        active: userDocData.active,
        branchIds: userDocData.branchIds || []
      };

      console.log('✅ Login successful, creating session for:', userData);

      // Store user session
      localStorage.setItem('currentUser', JSON.stringify(userData));
      
      // Show success toast
      toast({
        title: "Login Successful",
        description: `Welcome back, ${userData.displayName}!`
      });

      // Redirect based on role from database
      console.log('🔀 Redirecting user to dashboard for role:', userData.role);
      
      setTimeout(() => {
        if (userData.role === 'admin') {
          window.location.href = '/admin-dashboard';
        } else if (userData.role === 'branch_user') {
          window.location.href = '/branch-dashboard';
        } else if (userData.role === 'driver') {
          window.location.href = '/driver-dashboard';
        } else if (userData.role === 'warehouse') {
          window.location.href = '/warehouse-dashboard';
        } else {
          console.log('❌ Unknown user role:', userData.role);
          throw new Error('INVALID_ROLE');
        }
      }, 1000);
    } catch (error: any) {
      console.error('Secure login error:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      
      let errorMessage = "Login failed. Please check your credentials and try again.";
      
      // Don't show error for empty error objects (likely redirect success)
      if (!error.message && !error.code && Object.keys(error).length === 0) {
        console.log('Empty error - likely successful redirect, ignoring');
        return;
      }
      
      if (error.message === 'USER_NOT_AUTHORIZED') {
        errorMessage = "Access denied. Your account is not authorized in the system. Contact your administrator.";
      } else if (error.message === 'ACCOUNT_DISABLED') {
        errorMessage = "Your account has been disabled. Contact your administrator.";
      } else if (error.message === 'INVALID_ROLE') {
        errorMessage = "Invalid user role. Contact your administrator.";
      } else if (error.code === 'auth/user-not-found') {
        errorMessage = "User not found. This email is not registered. Contact your administrator.";
      } else if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errorMessage = "Invalid email or password. Please check your credentials and try again.";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "Please enter a valid email address.";
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = "Too many failed attempts. Please try again later.";
      } else if (error.code === 'permission-denied' || error.message?.includes('permission')) {
        errorMessage = "Database access denied. Contact your administrator.";
      }
      
      toast({
        title: "Login Failed",
        description: errorMessage,
        variant: "destructive"
      });
    }
    
    setIsLoading(false);
  };

  const handleForgotPassword = async () => {
    if (!forgotPasswordEmail) {
      toast({
        title: "Email Required",
        description: "Please enter your email address to reset password",
        variant: "destructive"
      });
      return;
    }

    setIsSendingReset(true);
    
    try {
      // Import Firebase functions
      const { sendPasswordResetEmail } = await import('firebase/auth');
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const { auth, db } = await import('../lib/firebase');
      
      // First, check if this email exists in our users database
      console.log('🔍 Checking if user exists in database:', forgotPasswordEmail);
      const usersCollection = collection(db, 'users');
      const emailQuery = query(usersCollection, where('email', '==', forgotPasswordEmail));
      const existingUsers = await getDocs(emailQuery);
      
      if (existingUsers.empty) {
        // Check if it's an @ekkanoo.com.bh email (auto-created users)
        if (forgotPasswordEmail.endsWith('@ekkanoo.com.bh')) {
          console.log('✅ Authorized company email detected:', forgotPasswordEmail);
        } else {
          throw new Error('USER_NOT_FOUND_IN_DATABASE');
        }
      } else {
        console.log('✅ User found in database:', forgotPasswordEmail);
      }
      
      // Send password reset email with custom settings
      await sendPasswordResetEmail(auth, forgotPasswordEmail, {
        url: window.location.origin,
        handleCodeInApp: false
      });
      
      console.log('✅ Password reset email sent to:', forgotPasswordEmail);
      
      toast({
        title: "Password Reset Email Sent",
        description: `Password reset instructions have been sent to ${forgotPasswordEmail}. Please check your email inbox and spam folder. The email may take a few minutes to arrive.`,
        duration: 10000
      });
      
      // Reset form and close modal
      setForgotPasswordEmail('');
      setShowForgotPassword(false);
      
    } catch (error: any) {
      console.error('Forgot password error:', error);
      
      let errorMessage = "Failed to send password reset email. Please try again.";
      
      if (error.message === 'USER_NOT_FOUND_IN_DATABASE') {
        errorMessage = "This email is not registered in the system. Only users created by the administrator can reset their password. Contact your administrator for access.";
      } else if (error.code === 'auth/user-not-found') {
        errorMessage = "No account found with this email address. Contact your administrator for access.";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "Please enter a valid email address.";
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = "Too many password reset attempts. Please try again later.";
      }
      
      toast({
        title: "Password Reset Failed",
        description: errorMessage,
        variant: "destructive",
        duration: 8000
      });
    }
    
    setIsSendingReset(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-600/10 via-transparent to-amber-500/10"></div>
        <div className="absolute top-20 left-20 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-blue-500/5 to-transparent rounded-full"></div>
      </div>

      {/* Content Container */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-sm sm:max-w-md">
          {/* Main Login Card */}
          <Card className="backdrop-blur-xl bg-white/95 shadow-2xl border-0 overflow-hidden">
            <CardContent className="p-0">
              {/* Header Section with Brand */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 sm:p-8 text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-black/10"></div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full transform translate-x-16 -translate-y-16"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full transform -translate-x-12 translate-y-12"></div>
                
                <div className="relative z-10">
                  <div className="flex justify-center mb-4">
                    <div className="w-20 h-20 bg-white rounded-full shadow-lg flex items-center justify-center">
                      <OilDeliveryLogo className="w-16 h-16 drop-shadow-sm" />
                    </div>
                  </div>
                  <h1 className="text-2xl font-bold text-white mb-1 tracking-wide">OneDelivery</h1>
                  <p className="text-blue-100/90 text-sm font-medium">Your Complete Oil Delivery & Complaint Manager</p>
                </div>
              </div>

              {/* Login Form */}
              <div className="p-6 sm:p-6">
                <div className="space-y-5">
                  {/* Email Input */}
                  <div className="relative">
                    <Label 
                      htmlFor="email" 
                      className="text-sm font-medium text-gray-700 mb-2 block"
                    >
                      Email Address
                    </Label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                        </svg>
                      </div>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your work email"
                        className="pl-10 h-11 sm:h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg transition-all duration-200"
                        data-testid="input-email"
                      />
                    </div>
                  </div>

                  {/* Password Input */}
                  <div className="relative">
                    <Label 
                      htmlFor="password" 
                      className="text-sm font-medium text-gray-700 mb-2 block"
                    >
                      Password
                    </Label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your secure password"
                        className="pl-10 h-11 sm:h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg transition-all duration-200"
                        data-testid="input-password"
                      />
                    </div>
                  </div>

                  {/* Sign In Button */}
                  <Button 
                    onClick={handleLogin}
                    disabled={isLoading}
                    className="w-full h-11 sm:h-12 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 disabled:transform-none disabled:hover:scale-100"
                    data-testid="button-login"
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
                        <span>Signing you in...</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                        </svg>
                        <span>Sign In</span>
                      </div>
                    )}
                  </Button>

                  {/* Forgot Password Link */}
                  <div className="text-right pt-2">
                    <button
                      onClick={() => setShowForgotPassword(true)}
                      className="text-xs text-blue-600 hover:text-blue-800 hover:underline transition-all duration-200"
                      data-testid="button-forgot-password"
                    >
                      Forgot your password?
                    </button>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-gray-50 px-8 py-4 border-t border-gray-100">
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-2">
                    Secure access to oil delivery operations
                  </p>
                  <div className="flex items-center justify-center mb-2 space-x-4 text-xs text-gray-400">
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></div>
                      <span>System Online</span>
                    </div>
                    <div className="flex items-center">
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      <span>Secure Connection</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400">Created by Asif Shaikh</p>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl border border-gray-200">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Reset Password</h2>
              <p className="text-gray-600 text-sm">
                Enter your email address and we'll send you instructions to reset your password.
                Only users created by the administrator can use this feature.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="forgot-email" className="text-sm font-medium text-gray-700">
                  Email Address
                </Label>
                <div className="relative mt-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                  </div>
                  <Input
                    id="forgot-email"
                    type="email"
                    value={forgotPasswordEmail}
                    onChange={(e) => setForgotPasswordEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="pl-10 h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg"
                    data-testid="input-forgot-email"
                  />
                </div>
              </div>

              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                <div className="flex items-start space-x-3">
                  <div className="text-amber-600 mt-0.5">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 14.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-amber-800 mb-2">Important Notes</p>
                    <ul className="text-sm text-amber-700 space-y-1">
                      <li>• Only for users created by administrator</li>
                      <li>• Check spam/junk folder if email doesn't arrive</li>
                      <li>• Email may take 2-5 minutes to be delivered</li>
                      <li>• Contact administrator if no email received</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3 pt-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowForgotPassword(false);
                    setForgotPasswordEmail('');
                  }}
                  className="flex-1 h-12"
                  data-testid="button-cancel-forgot"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleForgotPassword}
                  disabled={isSendingReset}
                  className="flex-1 h-12 bg-blue-600 hover:bg-blue-700"
                  data-testid="button-send-reset"
                >
                  {isSendingReset ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      <span>Sending...</span>
                    </div>
                  ) : (
                    "Send Reset Email"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}