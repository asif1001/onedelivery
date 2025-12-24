/**
 * One-time admin setup utility
 * Run this to create the admin user in Firebase Auth to match Firestore
 */

import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

export const createAdminUser = async () => {
  try {
    // Admin user details that match your Firestore document
    const adminEmail = 'asif.s@ekkanoo.com.bh';
    const adminPassword = 'Admin123!'; // You should change this to a secure password
    
    console.log('Creating admin user in Firebase Auth...');
    
    // Create user in Firebase Authentication
    const userCredential = await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
    const user = userCredential.user;
    
    console.log('Admin user created with UID:', user.uid);
    
    // Create/update user document in Firestore
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      email: adminEmail,
      role: 'admin',
      displayName: 'Asif S',
      photoURL: null,
      createdAt: new Date(),
      lastLoginAt: new Date(),
      active: true
    });
    
    console.log('Admin user document created in Firestore');
    
    return {
      success: true,
      uid: user.uid,
      email: adminEmail,
      message: 'Admin user created successfully'
    };
    
  } catch (error: any) {
    console.error('Error creating admin user:', error);
    
    if (error.code === 'auth/email-already-in-use') {
      return {
        success: false,
        message: 'Admin user already exists in Firebase Auth'
      };
    }
    
    return {
      success: false,
      message: error.message || 'Failed to create admin user'
    };
  }
};

// Call this function in the browser console to create the admin user
// createAdminUser().then(result => console.log(result));