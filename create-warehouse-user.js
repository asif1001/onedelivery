// Script to create a test warehouse user for authentication testing
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from './client/src/lib/firebase.js';

async function createWarehouseUser() {
  try {
    const email = 'warehouse@ekkanoo.com.bh';
    const password = 'warehouse123';
    const displayName = 'Warehouse Manager';
    
    console.log('Creating warehouse test user...');
    
    // Create Firebase Auth user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Create Firestore user document
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      email: user.email,
      displayName: displayName,
      role: 'warehouse',
      active: true,
      createdAt: new Date(),
      lastLoginAt: new Date()
    });
    
    console.log('✅ Warehouse user created successfully!');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log(`UID: ${user.uid}`);
    
  } catch (error) {
    console.error('Error creating warehouse user:', error);
    if (error.code === 'auth/email-already-in-use') {
      console.log('Warehouse user already exists - you can use the existing credentials');
    }
  }
}

createWarehouseUser();