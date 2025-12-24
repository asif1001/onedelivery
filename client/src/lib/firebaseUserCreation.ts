import { createUserWithEmailAndPassword, updateProfile, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

export interface CreateUserData {
  email: string;
  password: string;
  displayName: string;
  role: string;
  branchIds?: string[];
  empNo?: string;
  driverLicenceNo?: string;
  tankerLicenceNo?: string;
  licenceExpiryDate?: string;
}

export async function createFirebaseUserReal(userData: CreateUserData) {
  try {
    console.log(`🔥 Creating Firebase user: ${userData.displayName} (${userData.email})`);
    
    // Step 1: Check if user already exists in Firestore
    const usersCollection = collection(db, 'users');
    const emailQuery = query(usersCollection, where('email', '==', userData.email));
    const existingUsers = await getDocs(emailQuery);
    
    if (!existingUsers.empty) {
      throw new Error(`User with email ${userData.email} already exists in the database`);
    }
    
    // Step 2: Create user in Firebase Authentication
    const userCredential = await createUserWithEmailAndPassword(
      auth, 
      userData.email, 
      userData.password
    );
    
    const user = userCredential.user;
    console.log(`✅ Firebase Auth user created with UID: ${user.uid}`);
    
    // Step 3: Update user profile with display name
    await updateProfile(user, {
      displayName: userData.displayName
    });
    
    // Step 4: Save user data to Firestore
    const userDocData = {
      uid: user.uid,
      email: user.email,
      displayName: userData.displayName,
      firstName: userData.displayName.split(' ')[0],
      lastName: userData.displayName.split(' ').slice(1).join(' ') || '',
      role: userData.role,
      branchIds: userData.branchIds || [],
      empNo: userData.empNo || '',
      driverLicenceNo: userData.driverLicenceNo || '',
      tankerLicenceNo: userData.tankerLicenceNo || '',
      licenceExpiryDate: userData.licenceExpiryDate ? new Date(userData.licenceExpiryDate) : null,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      emailVerified: user.emailVerified
    };
    
    // Save to Firestore users collection
    try {
      await setDoc(doc(db, 'users', user.uid), userDocData);
      console.log(`📄 User data saved to Firestore collection 'users' with UID: ${user.uid}`);
    } catch (firestoreError) {
      console.error('❌ Firestore save error:', firestoreError);
      console.log('🔍 User doc data:', userDocData);
      throw new Error(`Failed to save user to Firestore: ${(firestoreError as any).message}`);
    }
    
    return {
      ...userDocData,
      id: user.uid
    };
    
  } catch (error: any) {
    console.error('Real Firebase user creation error:', error);
    
    // Handle specific Firebase Auth errors
    if (error.code === 'auth/email-already-in-use') {
      throw new Error(`User with email ${userData.email} already exists in Firebase Authentication`);
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('Please enter a valid email address');
    } else if (error.code === 'auth/weak-password') {
      throw new Error('Password should be at least 6 characters long');
    } else if (error.message && error.message.includes('already exists in the database')) {
      throw error; // Re-throw our custom database check error
    }
    
    throw new Error(`Failed to create Firebase user: ${error.message}`);
  }
}

// Function to update user password (admin functionality)
export async function updateUserPassword(userUid: string, newPassword: string) {
  try {
    console.log(`🔑 Admin updating password for user: ${userUid}`);
    
    // Note: Firebase client SDK doesn't allow admin password updates
    // Instead, we'll use Firebase Auth's sendPasswordResetEmail
    // This is the secure way to handle password changes
    
    // First, get the user's email from Firestore
    const userDoc = await doc(db, 'users', userUid);
    const userData = await getDocs(collection(db, 'users'));
    const user = userData.docs.find(doc => doc.id === userUid);
    
    if (!user) {
      throw new Error('User not found in database');
    }
    
    const userEmail = user.data().email;
    
    if (!userEmail) {
      throw new Error('User email not found');
    }
    
    // Import sendPasswordResetEmail
    const { sendPasswordResetEmail } = await import('firebase/auth');
    
    // Send password reset email to the user
    await sendPasswordResetEmail(auth, userEmail);
    
    console.log(`✅ Password reset email sent to: ${userEmail}`);
    
    return {
      success: true,
      message: `Password reset email sent to ${userEmail}. User will need to check their email and follow the reset link.`
    };
    
  } catch (error: any) {
    console.error('❌ Password update error:', error);
    throw new Error(`Failed to initiate password reset: ${error.message}`);
  }
}