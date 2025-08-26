import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

let adminApp: App | null = null;

export function getFirebaseAdminApp() {
  if (adminApp) return adminApp;

  // Check if app already exists
  const existingApps = getApps();
  if (existingApps.length > 0) {
    adminApp = existingApps[0];
    return adminApp;
  }

  // Check if Firebase Admin SDK credentials are configured
  const requiredEnvVars = [
    'FIREBASE_ADMIN_PROJECT_ID',
    'FIREBASE_ADMIN_PRIVATE_KEY',
    'FIREBASE_ADMIN_CLIENT_EMAIL'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.log('Firebase Admin SDK not configured - Auth deletion will be manual');
    console.log('Missing environment variables:', missingVars.join(', '));
    return null;
  }

  try {
    // Initialize Firebase Admin with service account credentials
    // Fix private key formatting - handle both escaped and raw formats
    let privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY || '';
    
    // If the key doesn't start with -----BEGIN, it might be missing proper formatting
    if (!privateKey.startsWith('-----BEGIN PRIVATE KEY-----')) {
      console.error('Private key format error: Key must start with -----BEGIN PRIVATE KEY-----');
      return null;
    }
    
    // Replace escaped newlines with actual newlines
    privateKey = privateKey.replace(/\\n/g, '\n');
    
    const serviceAccount = {
      type: process.env.FIREBASE_ADMIN_TYPE || 'service_account',
      project_id: process.env.FIREBASE_ADMIN_PROJECT_ID,
      private_key_id: process.env.FIREBASE_ADMIN_PRIVATE_KEY_ID,
      private_key: privateKey,
      client_email: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_ADMIN_CLIENT_ID,
      auth_uri: process.env.FIREBASE_ADMIN_AUTH_URI || 'https://accounts.google.com/o/oauth2/auth',
      token_uri: process.env.FIREBASE_ADMIN_TOKEN_URI || 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: process.env.FIREBASE_ADMIN_AUTH_PROVIDER_X509_CERT_URL || 'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url: process.env.FIREBASE_ADMIN_CLIENT_X509_CERT_URL
    };

    adminApp = initializeApp({
      credential: cert(serviceAccount as any),
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID
    });
    
    console.log('✅ Firebase Admin SDK initialized successfully');
    return adminApp;
  } catch (error) {
    console.error('Failed to initialize Firebase Admin:', error);
    return null;
  }
}

export async function deleteUserFromFirebaseAuth(uid: string): Promise<boolean> {
  try {
    const app = getFirebaseAdminApp();
    if (!app) {
      console.warn('Firebase Admin not available - cannot delete from Auth');
      return false;
    }

    const auth = getAuth(app);
    await auth.deleteUser(uid);
    console.log('✅ User deleted from Firebase Auth:', uid);
    return true;
  } catch (error) {
    console.error('Failed to delete user from Firebase Auth:', error);
    return false;
  }
}