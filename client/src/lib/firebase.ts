import { initializeApp, getApps } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut as firebaseSignOut, 
  onAuthStateChanged, 
  User as FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  collection,
  getDocs,
  query,
  orderBy,
  updateDoc,
  deleteDoc,
  where,
  writeBatch,
  addDoc,
  Timestamp,
  runTransaction,
  onSnapshot
} from 'firebase/firestore';
import { 
  getStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL,
  deleteObject 
} from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase with enhanced error handling
let app;
try {
  // Validate required config
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.appId) {
    console.error('Missing Firebase configuration:', {
      hasApiKey: !!firebaseConfig.apiKey,
      hasProjectId: !!firebaseConfig.projectId,
      hasAppId: !!firebaseConfig.appId
    });
    throw new Error('Firebase configuration is incomplete');
  }
  
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  console.log('Firebase initialized successfully with project:', firebaseConfig.projectId);
  console.log('Firebase config used:', {
    projectId: firebaseConfig.projectId,
    authDomain: firebaseConfig.authDomain,
    hasApiKey: !!firebaseConfig.apiKey,
    hasAppId: !!firebaseConfig.appId
  });
} catch (error) {
  console.error('Firebase initialization error:', error);
  // Create a minimal error display instead of crashing
  document.body.innerHTML = `
    <div style="
      min-height: 100vh; 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      background: linear-gradient(to bottom right, #3b82f6, #8b5cf6);
      font-family: system-ui, -apple-system, sans-serif;
    ">
      <div style="
        background: white; 
        padding: 2rem; 
        border-radius: 0.5rem; 
        box-shadow: 0 10px 25px rgba(0,0,0,0.1);
        text-align: center;
        max-width: 400px;
      ">
        <h1 style="color: #dc2626; margin: 0 0 1rem 0;">Configuration Error</h1>
        <p style="color: #374151; margin: 0 0 1rem 0;">
          Firebase configuration is missing or invalid. Please check the deployment setup.
        </p>
        <p style="color: #6b7280; font-size: 0.875rem; margin: 0;">
          Contact administrator for assistance.
        </p>
      </div>
    </div>
  `;
  throw error;
}

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service  
export const db = getFirestore(app);

// Initialize Firebase Storage and get a reference to the service
export const storage = getStorage(app);

// Watermark utility function to add branch name and timestamp to image
const addWatermarkToImage = async (imageUrl: string, branchName: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.crossOrigin = 'anonymous';
    img.setAttribute('crossorigin', 'anonymous');
    
    img.onload = () => {
      try {
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Draw the original image
        ctx!.drawImage(img, 0, 0);
        
        // Prepare watermark text
        const now = new Date();
        const timestamp = now.toLocaleDateString() + ', ' + now.toLocaleTimeString();
        const watermarkText = `${branchName} | ${timestamp}`;
        
        // Set up text styling
        const fontSize = Math.max(16, canvas.width * 0.03);
        ctx!.font = `bold ${fontSize}px Arial`;
        ctx!.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx!.strokeStyle = 'rgba(0, 0, 0, 0.8)';
        ctx!.lineWidth = 2;
        
        // Position text at bottom-left with padding
        const x = 20;
        const y = canvas.height - 20;
        
        // Draw text with outline
        ctx!.strokeText(watermarkText, x, y);
        ctx!.fillText(watermarkText, x, y);
        
        // Convert to blob
        canvas.toBlob((blob) => {
          if (blob) {
            const newImageUrl = URL.createObjectURL(blob);
            resolve(newImageUrl);
          } else {
            reject(new Error('Failed to create watermarked image blob'));
          }
        }, 'image/jpeg', 0.9);
        
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => reject(new Error('Failed to load image for watermarking'));
    img.src = imageUrl;
  });
};

// Function to update photos with correct watermarks after transaction is saved
// Function to download all photos in a date range as ZIP
export const downloadPhotosInDateRange = async (startDate: string, endDate: string): Promise<void> => {
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // Include full end date

    console.log('📅 Fetching transactions from', start, 'to', end);

    // Get all transactions and filter manually since Firestore date queries can be problematic
    const allTransactionsQuery = query(collection(db, 'transactions'));
    const allSnapshot = await getDocs(allTransactionsQuery);
    const allTransactions = allSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as any[];

    console.log('📊 Total transactions found:', allTransactions.length);

    // Filter transactions by date manually to handle different timestamp fields
    const transactions = allTransactions.filter(transaction => {
      const transactionDate = new Date(
        transaction.timestamp?.toDate?.() || 
        transaction.timestamp || 
        transaction.createdAt?.toDate?.() ||
        transaction.createdAt ||
        transaction.actualDeliveryStartTime || 
        0
      );
      
      const isInRange = transactionDate >= start && transactionDate <= end;
      if (isInRange) {
        console.log('✅ Found transaction in range:', {
          id: transaction.id,
          date: transactionDate,
          photos: transaction.photos ? Object.keys(transaction.photos).length : 0
        });
      }
      return isInRange;
    });

    console.log(`📦 Found ${transactions.length} transactions with photos`);

    if (transactions.length === 0) {
      throw new Error('No transactions found in the selected date range');
    }

    // Collect all photos with metadata
    const photoData: Array<{
      url: string;
      filename: string;
      transactionId: string;
      branchName: string;
      photoType: string;
      timestamp: string;
    }> = [];

    for (const transaction of transactions) {
      if (transaction.photos) {
        for (const [photoType, photoUrl] of Object.entries(transaction.photos)) {
          if (typeof photoUrl === 'string' && photoUrl) {
            const transactionDate = new Date(
              transaction.timestamp?.toDate?.() || 
              transaction.timestamp || 
              transaction.createdAt?.toDate?.() ||
              transaction.createdAt ||
              transaction.actualDeliveryStartTime || 
              0
            );
            const timestamp = transactionDate.toISOString().split('T')[0]; // YYYY-MM-DD format
            
            const filename = `${timestamp}_${transaction.branchName || 'Unknown'}_${photoType}_${transaction.id}.jpg`
              .replace(/[^a-zA-Z0-9._-]/g, '_'); // Clean filename
            
            photoData.push({
              url: photoUrl,
              filename,
              transactionId: transaction.id,
              branchName: transaction.branchName || 'Unknown',
              photoType,
              timestamp
            });
          }
        }
      }
    }

    console.log(`🖼️ Collected ${photoData.length} photos for download`);

    if (photoData.length === 0) {
      throw new Error('No photos found in the selected date range');
    }

    // Create and download ZIP file
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();

    // Add photos to ZIP
    let successCount = 0;
    let failCount = 0;
    
    for (const photo of photoData) {
      try {
        console.log(`📥 Downloading: ${photo.filename}`);
        
        // Use proxy endpoint to handle Firebase Storage CORS issues
        const proxyUrl = `/api/proxy-photo?url=${encodeURIComponent(photo.url)}`;
        const response = await fetch(proxyUrl, {
          method: 'GET',
          cache: 'no-cache',
          headers: {
            'Accept': 'image/*'
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        // Check if response actually contains image data
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.startsWith('image/')) {
          throw new Error(`Invalid content type: ${contentType}. Expected image.`);
        }
        
        const blob = await response.blob();
        
        // Verify blob is valid and not empty
        if (!blob || blob.size === 0) {
          throw new Error('Received empty or invalid blob');
        }
        
        // Add to ZIP file
        zip.file(photo.filename, blob);
        successCount++;
        
        console.log(`✅ Successfully added: ${photo.filename} (${blob.size} bytes)`);
        
      } catch (error) {
        failCount++;
        console.error(`❌ Failed to download ${photo.filename}:`, error);
        
        // Try alternative approach - create a text file with error info instead of breaking
        const errorInfo = `Failed to download photo: ${photo.filename}\nURL: ${photo.url}\nError: ${error}\nTransaction: ${photo.transactionId}\nBranch: ${photo.branchName}\nType: ${photo.photoType}`;
        zip.file(`ERROR_${photo.filename.replace('.jpg', '.txt')}`, errorInfo);
        
        // Continue with other photos instead of breaking the entire process
        continue;
      }
    }

    // Generate ZIP file with compression
    console.log(`🗜️ Generating ZIP file... (${successCount} photos successful, ${failCount} failed)`);
    const zipBlob = await zip.generateAsync({ 
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: {
        level: 6 // Balanced compression
      }
    });

    // Download ZIP file
    const zipFilename = `photos_${startDate}_to_${endDate}_${successCount}photos.zip`;
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = zipFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log(`✅ ZIP download completed: ${successCount}/${photoData.length} photos successfully downloaded`);
    
    if (failCount > 0) {
      console.warn(`⚠️ ${failCount} photos failed to download. Check error logs in ZIP file.`);
    }

  } catch (error) {
    console.error('❌ Photo download error:', error);
    throw error;
  }
};

// Function to delete all photos in a date range
export const deletePhotosInDateRange = async (startDate: string, endDate: string): Promise<number> => {
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // Include full end date

    console.log('🗑️ Fetching transactions for deletion from', start, 'to', end);

    // Get all transactions and filter manually 
    const allTransactionsQuery = query(collection(db, 'transactions'));
    const allSnapshot = await getDocs(allTransactionsQuery);
    const allTransactions = allSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as any[];

    // Filter transactions by date manually to handle different timestamp fields
    const transactions = allTransactions.filter(transaction => {
      const transactionDate = new Date(
        transaction.timestamp?.toDate?.() || 
        transaction.timestamp || 
        transaction.createdAt?.toDate?.() ||
        transaction.createdAt ||
        transaction.actualDeliveryStartTime || 
        0
      );
      
      return transactionDate >= start && transactionDate <= end;
    });

    console.log(`🔍 Found ${transactions.length} transactions to process`);

    let deletedCount = 0;

    for (const transaction of transactions) {
      if (transaction.photos) {
        for (const [photoType, photoUrl] of Object.entries(transaction.photos)) {
          if (typeof photoUrl === 'string' && photoUrl) {
            try {
              // Extract file path from Firebase Storage URL
              const url = new URL(photoUrl);
              const pathMatch = url.pathname.match(/\/o\/(.+?)\?/);
              if (pathMatch) {
                const filePath = decodeURIComponent(pathMatch[1]);
                
                // Check if path is in either delivery-photos or loading-photos folder
                // IMPORTANT: Exclude logo/ folder from deletion to preserve app branding
                if ((filePath.startsWith('delivery-photos/') || filePath.startsWith('loading-photos/')) && 
                    !filePath.startsWith('logo/')) {
                  const fileRef = ref(storage, filePath);
                  
                  console.log(`🗑️ Deleting from storage: ${filePath}`);
                  await deleteObject(fileRef);
                  deletedCount++;
                } else {
                  console.log(`⚠️ Skipping file not in expected folders or protected folder (logo/): ${filePath}`);
                }
              }
            } catch (error) {
              console.error(`❌ Failed to delete photo from ${photoType}:`, error);
              // Continue with other photos
            }
          }
        }

        // Update transaction to remove photo URLs
        try {
          const transactionRef = doc(db, 'transactions', transaction.id);
          await updateDoc(transactionRef, { photos: {} });
          console.log(`✅ Cleared photo references from transaction ${transaction.id}`);
        } catch (error) {
          console.error(`❌ Failed to update transaction ${transaction.id}:`, error);
        }
      }
    }

    console.log(`✅ Deleted ${deletedCount} photos from Firebase Storage`);
    return deletedCount;

  } catch (error) {
    console.error('❌ Photo deletion error:', error);
    throw error;
  }
};

export const updatePhotosWithCorrectWatermarks = async (
  transaction: any,
  branchName: string
): Promise<any> => {
  try {
    console.log('🔄 Starting post-transaction watermark update for:', branchName);
    
    const photos = transaction.photos;
    const updatedPhotos: any = {};
    
    // Update each photo with correct watermark  
    for (const [photoType, photoUrl] of Object.entries(photos)) {
      if (typeof photoUrl === 'string') {
        console.log(`🖼️ Re-watermarking ${photoType} with correct branch: ${branchName}`);
        
        try {
          // Add correct watermark directly to the Firebase Storage URL
          const watermarkedImageUrl = await addWatermarkToImage(photoUrl, branchName);
          
          // Convert watermarked image to blob for upload
          const watermarkedResponse = await fetch(watermarkedImageUrl);
          const watermarkedBlob = await watermarkedResponse.blob();
          
          // Upload new watermarked image
          const newPhotoUrl = await uploadPhotoToFirebaseStorage(watermarkedBlob);
          updatedPhotos[photoType] = newPhotoUrl;
          
          // Clean up temporary URL
          URL.revokeObjectURL(watermarkedImageUrl);
          
          console.log(`✅ Updated ${photoType} with correct watermark`);
          
        } catch (photoError) {
          console.error(`❌ Failed to update ${photoType}:`, photoError);
          // Keep original photo if watermarking fails
          updatedPhotos[photoType] = photoUrl;
        }
      } else {
        // Keep photos that don't need updating
        updatedPhotos[photoType] = photoUrl;
      }
    }
    
    // Update transaction with new photo URLs
    const updatedTransaction = {
      ...transaction,
      photos: updatedPhotos
    };
    
    // Update in Firestore
    const transactionRef = doc(db, 'transactions', transaction.id || `${transaction.loadSessionId}_${Date.now()}`);
    await updateDoc(transactionRef, { photos: updatedPhotos });
    
    console.log('✅ All photos updated with correct watermarks');
    return updatedTransaction;
    
  } catch (error) {
    console.error('❌ Failed to update photos with correct watermarks:', error);
    // Return original transaction if update fails
    return transaction;
  }
};

// Add retry logic for Firebase operations
const retryOperation = async (operation: () => Promise<any>, maxRetries = 3, delay = 1000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error: any) {
      console.log(`Attempt ${i + 1} failed:`, error.code);
      
      if (error.code === 'unavailable' && i < maxRetries - 1) {
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
        continue;
      }
      throw error;
    }
  }
};

/**
 * CASCADING UPDATE FUNCTIONS
 * These functions ensure that when you change branch, oil type, or user names,
 * the changes are propagated throughout the entire app and all related records.
 */

// Update branch name and cascade to all related records
export const updateBranchNameCascading = async (branchId: string, newName: string): Promise<void> => {
  try {
    console.log(`🔄 Starting cascading update for branch ${branchId}: new name "${newName}"`);
    
    // Get current branch data first
    const branchDoc = await getDoc(doc(db, 'branches', branchId));
    if (!branchDoc.exists()) {
      throw new Error('Branch not found');
    }
    
    const oldName = branchDoc.data().name;
    console.log(`📝 Updating branch from "${oldName}" to "${newName}"`);
    
    // 1. Update the main branch document
    await updateDoc(doc(db, 'branches', branchId), {
      name: newName,
      updatedAt: Timestamp.now()
    });
    
    // 2. Update all transactions with this branch
    const transactionsQuery = query(
      collection(db, 'transactions'),
      where('branchId', '==', branchId)
    );
    const transactionsSnapshot = await getDocs(transactionsQuery);
    const transactionUpdates = transactionsSnapshot.docs.map(doc => 
      updateDoc(doc.ref, { branchName: newName })
    );
    
    // 3. Update all tank update logs with this branch
    const logsQuery = query(
      collection(db, 'tankUpdateLogs'),
      where('branchName', '==', oldName)
    );
    const logsSnapshot = await getDocs(logsQuery);
    const logUpdates = logsSnapshot.docs.map(doc => 
      updateDoc(doc.ref, { branchName: newName })
    );
    
    // 4. Update all complaints with this branch
    const complaintsQuery = query(
      collection(db, 'complaints'),
      where('branchName', '==', oldName)
    );
    const complaintsSnapshot = await getDocs(complaintsQuery);
    const complaintUpdates = complaintsSnapshot.docs.map(doc => 
      updateDoc(doc.ref, { branchName: newName })
    );
    
    // 5. Update all tasks with this branch
    const tasksQuery = query(
      collection(db, 'tasks'),
      where('branchName', '==', oldName)
    );
    const tasksSnapshot = await getDocs(tasksQuery);
    const taskUpdates = tasksSnapshot.docs.map(doc => 
      updateDoc(doc.ref, { branchName: newName })
    );
    
    // Execute all updates in parallel
    await Promise.all([
      ...transactionUpdates,
      ...logUpdates,
      ...complaintUpdates,
      ...taskUpdates
    ]);
    
    console.log(`✅ Cascading update completed for branch "${newName}"`);
    console.log(`📊 Updated: ${transactionUpdates.length} transactions, ${logUpdates.length} logs, ${complaintUpdates.length} complaints, ${taskUpdates.length} tasks`);
    
  } catch (error) {
    console.error('❌ Error in cascading branch update:', error);
    throw error;
  }
};

// Update oil type name and cascade to all related records
export const updateOilTypeNameCascading = async (oilTypeId: string, newName: string): Promise<void> => {
  try {
    console.log(`🔄 Starting cascading update for oil type ${oilTypeId}: new name "${newName}"`);
    
    // Get current oil type data first
    const oilTypeDoc = await getDoc(doc(db, 'oilTypes', oilTypeId));
    if (!oilTypeDoc.exists()) {
      throw new Error('Oil type not found');
    }
    
    const oldName = oilTypeDoc.data().name;
    console.log(`📝 Updating oil type from "${oldName}" to "${newName}"`);
    
    // 1. Update the main oil type document
    await updateDoc(doc(db, 'oilTypes', oilTypeId), {
      name: newName,
      updatedAt: Timestamp.now()
    });
    
    // 2. Update all transactions with this oil type
    const transactionsQuery = query(
      collection(db, 'transactions'),
      where('oilTypeId', '==', oilTypeId)
    );
    const transactionsSnapshot = await getDocs(transactionsQuery);
    const transactionUpdates = transactionsSnapshot.docs.map(doc => 
      updateDoc(doc.ref, { oilTypeName: newName })
    );
    
    // 3. Update all tank update logs with this oil type
    const logsQuery = query(
      collection(db, 'tankUpdateLogs'),
      where('oilTypeName', '==', oldName)
    );
    const logsSnapshot = await getDocs(logsQuery);
    const logUpdates = logsSnapshot.docs.map(doc => 
      updateDoc(doc.ref, { oilTypeName: newName })
    );
    
    // 4. Update oil tanks in branch documents (more complex - need to update nested arrays)
    const branchesSnapshot = await getDocs(collection(db, 'branches'));
    const branchUpdates: Promise<void>[] = [];
    
    for (const branchDoc of branchesSnapshot.docs) {
      const branchData = branchDoc.data();
      if (branchData.oilTanks && Array.isArray(branchData.oilTanks)) {
        let updated = false;
        const updatedTanks = branchData.oilTanks.map((tank: any) => {
          if (tank.oilTypeId === oilTypeId) {
            updated = true;
            return { ...tank, oilTypeName: newName };
          }
          return tank;
        });
        
        if (updated) {
          branchUpdates.push(updateDoc(branchDoc.ref, { oilTanks: updatedTanks }));
        }
      }
    }
    
    // Execute all updates in parallel
    await Promise.all([
      ...transactionUpdates,
      ...logUpdates,
      ...branchUpdates
    ]);
    
    console.log(`✅ Cascading update completed for oil type "${newName}"`);
    console.log(`📊 Updated: ${transactionUpdates.length} transactions, ${logUpdates.length} logs, ${branchUpdates.length} branch tanks`);
    
  } catch (error) {
    console.error('❌ Error in cascading oil type update:', error);
    throw error;
  }
};

// Update user name and cascade to all related records
export const updateUserNameCascading = async (userId: string, newDisplayName: string): Promise<void> => {
  try {
    console.log(`🔄 Starting cascading update for user ${userId}: new name "${newDisplayName}"`);
    
    // Get current user data first
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      throw new Error('User not found');
    }
    
    const oldDisplayName = userDoc.data().displayName || userDoc.data().email;
    console.log(`📝 Updating user from "${oldDisplayName}" to "${newDisplayName}"`);
    
    // 1. Update the main user document
    await updateDoc(doc(db, 'users', userId), {
      displayName: newDisplayName,
      updatedAt: Timestamp.now()
    });
    
    // 2. Update all transactions with this driver
    const transactionsQuery = query(
      collection(db, 'transactions'),
      where('driverUid', '==', userId)
    );
    const transactionsSnapshot = await getDocs(transactionsQuery);
    const transactionUpdates = transactionsSnapshot.docs.map(doc => 
      updateDoc(doc.ref, { driverName: newDisplayName })
    );
    
    // 3. Update all tank update logs by this user
    const logsQuery = query(
      collection(db, 'tankUpdateLogs'),
      where('updatedBy', '==', oldDisplayName)
    );
    const logsSnapshot = await getDocs(logsQuery);
    const logUpdates = logsSnapshot.docs.map(doc => 
      updateDoc(doc.ref, { updatedBy: newDisplayName })
    );
    
    // 4. Update all complaints raised by this user
    const complaintsQuery = query(
      collection(db, 'complaints'),
      where('reportedBy', '==', oldDisplayName)
    );
    const complaintsSnapshot = await getDocs(complaintsQuery);
    const complaintUpdates = complaintsSnapshot.docs.map(doc => 
      updateDoc(doc.ref, { reportedBy: newDisplayName })
    );
    
    // 5. Update all tasks assigned to this user
    const tasksQuery = query(
      collection(db, 'tasks'),
      where('assignedToName', '==', oldDisplayName)
    );
    const tasksSnapshot = await getDocs(tasksQuery);
    const taskUpdates = tasksSnapshot.docs.map(doc => 
      updateDoc(doc.ref, { assignedToName: newDisplayName })
    );
    
    // Execute all updates in parallel
    await Promise.all([
      ...transactionUpdates,
      ...logUpdates,
      ...complaintUpdates,
      ...taskUpdates
    ]);
    
    console.log(`✅ Cascading update completed for user "${newDisplayName}"`);
    console.log(`📊 Updated: ${transactionUpdates.length} transactions, ${logUpdates.length} logs, ${complaintUpdates.length} complaints, ${taskUpdates.length} tasks`);
    
  } catch (error) {
    console.error('❌ Error in cascading user update:', error);
    throw error;
  }
};

/**
 * BRANCH AND TANK ACTIVATION/DEACTIVATION FUNCTIONS
 * These functions manage active/inactive status for branches and individual tanks
 */

// Toggle branch active status
export const toggleBranchStatus = async (branchId: string, isActive: boolean): Promise<void> => {
  try {
    console.log(`🔄 ${isActive ? 'Activating' : 'Deactivating'} branch: ${branchId}`);
    
    await updateDoc(doc(db, 'branches', branchId), {
      isActive: isActive,
      updatedAt: Timestamp.now()
    });
    
    console.log(`✅ Branch ${isActive ? 'activated' : 'deactivated'} successfully`);
  } catch (error) {
    console.error('❌ Error toggling branch status:', error);
    throw error;
  }
};

// Toggle tank active status within a branch
export const toggleTankStatus = async (branchId: string, tankIndex: number, isActive: boolean): Promise<void> => {
  try {
    console.log(`🔄 ${isActive ? 'Activating' : 'Deactivating'} tank ${tankIndex} in branch: ${branchId}`);
    
    // Get current branch data
    const branchDoc = await getDoc(doc(db, 'branches', branchId));
    if (!branchDoc.exists()) {
      throw new Error('Branch not found');
    }
    
    const branchData = branchDoc.data();
    if (!branchData.oilTanks || !Array.isArray(branchData.oilTanks)) {
      throw new Error('No oil tanks found in branch');
    }
    
    if (tankIndex >= branchData.oilTanks.length) {
      throw new Error('Tank index out of range');
    }
    
    // Update the specific tank's status
    const updatedTanks = [...branchData.oilTanks];
    updatedTanks[tankIndex] = {
      ...updatedTanks[tankIndex],
      isActive: isActive
    };
    
    // Update the branch document
    await updateDoc(doc(db, 'branches', branchId), {
      oilTanks: updatedTanks,
      updatedAt: Timestamp.now()
    });
    
    console.log(`✅ Tank ${tankIndex} ${isActive ? 'activated' : 'deactivated'} successfully`);
  } catch (error) {
    console.error('❌ Error toggling tank status:', error);
    throw error;
  }
};

// Get only active branches for warehouse operations
export const getActiveBranchesOnly = async (): Promise<any[]> => {
  try {
    const branchesQuery = query(collection(db, "branches"), orderBy("name"));

    const snapshot = await getDocs(branchesQuery);
    const allBranches: any[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Filter active branches (isActive is true or undefined/null - default to active)
    const activeBranches = allBranches.filter(
      (branch: any) => branch.isActive !== false
    );

    // Ensure "Main Depot" or similar is always available if the list is empty
    if (activeBranches.length === 0) {
      console.log("⚠️ No active branches found, adding fallback depot");
      activeBranches.push({
        id: "main-depot",
        name: "Main Depot",
        isActive: true,
      });
    }

    console.log(
      `📋 Retrieved ${activeBranches.length} active branches out of ${allBranches.length} total`
    );
    return activeBranches;
  } catch (error) {
    console.error("❌ Error fetching active branches:", error);
    // Return a minimal list instead of crashing
    return [
      {
        id: "main-depot",
        name: "Main Depot (Fallback)",
        isActive: true,
      },
    ];
  }
};

/**
 * Upload a photo to Firebase Storage
 * @param file - The image file or blob to upload
 * @param folder - The folder path in storage (e.g., 'photos', 'delivery-photos')
 * @returns Promise<string> - The download URL of the uploaded image
 */
// Compress image before upload to reduce storage size while maintaining quality
const compressImage = async (file: Blob, quality: number = 0.8, maxWidth: number = 1200): Promise<Blob> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const img = new Image();
    
    img.onload = () => {
      // Calculate new dimensions while maintaining aspect ratio
      let { width, height } = img;
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        }
      }, 'image/jpeg', quality);
    };
    
    img.src = URL.createObjectURL(file);
  });
};

// Original working photo upload function - restored to working state
export const uploadPhotoToFirebaseStorage = async (file: File | Blob, folder: string = 'photos'): Promise<string> => {
  try {
    console.log('📷 Starting photo upload to folder:', folder);
    
    // Compress image before upload to reduce storage size
    const compressedFile = await compressImage(file, 0.8, 1200);
    
    // Generate unique filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${timestamp}-${Math.random().toString(36).substr(2, 9)}.jpg`;
    const filePath = `${folder}/${filename}`;
    
    console.log('📁 Upload path:', filePath);
    
    // Create storage reference - using the initialized storage from config
    const storageRef = ref(storage, filePath);
    
    // Upload compressed file directly without additional authentication
    console.log('⬆️ Uploading compressed photo to Firebase Storage...');
    const snapshot = await uploadBytes(storageRef, compressedFile);
    
    // Get download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log('✅ Photo uploaded successfully:', downloadURL);
    
    return downloadURL;
  } catch (error: any) {
    console.error('❌ Error uploading photo to Firebase Storage:', error);
    // Return a more specific error message
    if (error.code === 'storage/unauthorized') {
      throw new Error('Storage permission denied. Please check Firebase rules.');
    }
    throw new Error(`Upload failed: ${error.message || 'Unknown error'}`);
  }
};

// Upload complaint photo with watermark - using the original working approach
export const uploadComplaintPhoto = async (file: File, userId: string): Promise<string> => {
  try {
    console.log('Starting complaint photo upload for user:', userId);
    
    // Create watermarked image using the original working approach
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    return new Promise((resolve, reject) => {
      img.onload = async () => {
        try {
          canvas.width = img.width;
          canvas.height = img.height;
          
          // Draw the original image
          ctx?.drawImage(img, 0, 0);
          
          // Add watermark
          if (ctx) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(0, canvas.height - 80, canvas.width, 80);
            
            ctx.fillStyle = 'white';
            ctx.font = '16px Arial';
            ctx.fillText(
              `${new Date().toLocaleString()} - Complaint Evidence`,
              10,
              canvas.height - 50
            );
            ctx.fillText(
              `Reported by: ${userId}`,
              10,
              canvas.height - 25
            );
          }
          
          // Convert to blob and use the original working upload function
          canvas.toBlob(async (watermarkedBlob) => {
            if (watermarkedBlob) {
              try {
                // Use the original uploadPhotoToFirebaseStorage function that was working
                const downloadURL = await uploadPhotoToFirebaseStorage(watermarkedBlob);
                console.log('Complaint photo upload successful:', downloadURL);
                resolve(downloadURL);
              } catch (uploadError) {
                console.error('Upload failed:', uploadError);
                const errorMessage = uploadError instanceof Error ? uploadError.message : 'Unknown upload error';
                reject(new Error(`Upload failed: ${errorMessage}`));
              }
            } else {
              reject(new Error('Failed to create watermarked image'));
            }
          }, 'image/jpeg', 0.9);
          
        } catch (error) {
          console.error('Error in watermarking process:', error);
          reject(error);
        }
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
    
  } catch (error) {
    console.error('Error uploading complaint photo:', error);
    throw error;
  }
};

// Upload any type of document/file to Firebase Storage
export const uploadDocumentToFirebaseStorage = async (file: File, folder: string = 'documents'): Promise<string> => {
  try {
    console.log('📄 Starting document upload to folder:', folder);
    console.log('📄 File details:', { name: file.name, size: file.size, type: file.type });
    
    // Generate unique filename with timestamp and preserve original extension
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileExtension = file.name.split('.').pop() || 'unknown';
    const baseFileName = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
    const filename = `${timestamp}-${Math.random().toString(36).substr(2, 9)}-${baseFileName}.${fileExtension}`;
    const filePath = `${folder}/${filename}`;
    
    console.log('📁 Upload path:', filePath);
    
    // Create storage reference
    const storageRef = ref(storage, filePath);
    
    // Upload file directly without compression (since it's not necessarily an image)
    console.log('⬆️ Uploading document to Firebase Storage...');
    const snapshot = await uploadBytes(storageRef, file);
    
    // Get download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log('✅ Document uploaded successfully:', downloadURL);
    
    return downloadURL;
  } catch (error: any) {
    console.error('❌ Error uploading document to Firebase Storage:', error);
    // Return a more specific error message
    if (error.code === 'storage/unauthorized') {
      throw new Error('Storage permission denied. Please check Firebase rules.');
    }
    throw new Error(`Upload failed: ${error.message || 'Unknown error'}`);
  }
};

// Delete complaint document
export const deleteComplaintDocument = async (complaintId: string, documentId: string) => {
  try {
    const complaintRef = doc(db, 'complaints', complaintId);
    const complaintSnap = await getDoc(complaintRef);
    
    if (!complaintSnap.exists()) {
      throw new Error('Complaint not found');
    }
    
    const currentComplaint = complaintSnap.data();
    const updatedDocuments = (currentComplaint.documents || []).filter((doc: any) => doc.id !== documentId);
    
    // Add deletion log to comments
    const deletionLog = {
      id: Date.now().toString(),
      text: `Document deleted: ${currentComplaint.documents?.find((doc: any) => doc.id === documentId)?.name || 'Unknown'}`,
      author: 'System',
      timestamp: new Date(),
      type: 'document_delete'
    };
    
    const updatedComments = [...(currentComplaint.comments || []), deletionLog];
    
    await updateDoc(complaintRef, {
      documents: updatedDocuments,
      comments: updatedComments,
      lastUpdated: new Date(),
      updatedBy: 'system'
    });
    
    return deletionLog;
  } catch (error) {
    console.error('Error deleting complaint document:', error);
    throw error;
  }
};

// Function to get photo statistics in a date range
export const getPhotoStatistics = async (startDate: string, endDate: string): Promise<{ photoCount: number, transactionCount: number }> => {
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    console.log('🔍 Getting photo statistics from', start, 'to', end);

    // Get all transactions without date filter first to debug
    const allTransactionsQuery = query(collection(db, 'transactions'));
    const allSnapshot = await getDocs(allTransactionsQuery);
    const allTransactions = allSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as any[];

    console.log('📊 Total transactions in database:', allTransactions.length);
    
    // Log first few transactions to see their structure
    if (allTransactions.length > 0) {
      console.log('📄 Sample transaction structure:', {
        timestamp: allTransactions[0].timestamp,
        createdAt: allTransactions[0].createdAt,
        actualDeliveryStartTime: allTransactions[0].actualDeliveryStartTime,
        photos: allTransactions[0].photos ? Object.keys(allTransactions[0].photos) : 'No photos'
      });
    }

    // Filter transactions by date manually to handle different timestamp fields
    const transactions = allTransactions.filter(transaction => {
      const transactionDate = new Date(
        transaction.timestamp?.toDate?.() || 
        transaction.timestamp || 
        transaction.createdAt?.toDate?.() ||
        transaction.createdAt ||
        transaction.actualDeliveryStartTime || 
        0
      );
      
      const isInRange = transactionDate >= start && transactionDate <= end;
      if (isInRange) {
        console.log('✅ Transaction in range:', {
          id: transaction.id,
          date: transactionDate,
          photos: transaction.photos ? Object.keys(transaction.photos).length : 0
        });
      }
      return isInRange;
    });

    let photoCount = 0;
    for (const transaction of transactions) {
      if (transaction.photos) {
        photoCount += Object.keys(transaction.photos).length;
      }
    }

    console.log(`📸 Found ${photoCount} photos in ${transactions.length} transactions`);

    return {
      photoCount,
      transactionCount: transactions.length
    };
  } catch (error) {
    console.error('Error getting photo statistics:', error);
    return { photoCount: 0, transactionCount: 0 };
  }
};



// Google Auth Provider
const googleProvider = new GoogleAuthProvider();

// Auth functions
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    // Save user data to Firestore
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      createdAt: new Date(),
      lastLoginAt: new Date(),
    }, { merge: true });
    
    return user;
  } catch (error) {
    console.error('Error signing in with Google:', error);
    throw error;
  }
};

export const signOut = async () => {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
};

// Get user data from Firestore with retry logic
export const getUserData = async (uid: string) => {
  return retryOperation(async () => {
    console.log('Fetching user data for UID:', uid);
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      console.log('Found user data:', userData);
      return userData;
    }
    console.log('No user document found for UID:', uid);
    return null;
  });
};

// Alias for getUserData for compatibility
export const getUserByUid = getUserData;

// Email/password authentication with retry logic
export const signInWithEmail = async (email: string, password: string) => {
  return retryOperation(async () => {
    const result = await signInWithEmailAndPassword(auth, email, password);
    const user = result.user;
    
    // Check if user exists in Firestore, if not create them
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    
    if (!userDoc.exists()) {
      // Create new user record with role based on email
      const role = (email === 'asif.s@ekkanoo.com.bh' || email === 'asif1001@gmail.com' || email.toLowerCase().includes('admin')) ? 'admin' : 'driver';
      
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        role: role,
        displayName: user.displayName || email.split('@')[0],
        photoURL: user.photoURL,
        createdAt: new Date(),
        lastLoginAt: new Date(),
        active: true
      });
    } else {
      // Update last login time for existing user
      await setDoc(doc(db, 'users', user.uid), {
        lastLoginAt: new Date(),
      }, { merge: true });
    }
    
    return user;
  });
};

// Create user with email and password (for first-time login)
export const createUserWithEmail = async (email: string, password: string) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    const user = result.user;
    
    // Determine role based on email patterns
    let role = 'driver'; // default role
    
    // Admin users
    if (email === 'asif.s@ekkanoo.com.bh' || email === 'asif1001@gmail.com' || email.toLowerCase().includes('admin')) {
      role = 'admin';
    }
    // Warehouse users
    else if (email.toLowerCase().includes('warehouse') || 
             email.toLowerCase().includes('inventory') || 
             email === 'warehouse@ekkanoo.com.bh') {
      role = 'warehouse';
    }
    // Branch users - specific emails or containing branch/manager keywords
    else if (email === 'husain.m@ekkanoo.com.bh' || 
             email === 'husain.new@ekkanoo.com.bh' ||
             email.toLowerCase().includes('branch') || 
             email.toLowerCase().includes('manager') ||
             email.toLowerCase().includes('husain')) {
      role = 'branch_user';
    }
    // Default to driver for other @ekkanoo.com.bh emails
    else if (email.endsWith('@ekkanoo.com.bh')) {
      role = 'driver';
    }
    
    // Save user data to Firestore with branch assignments for branch users
    const userData = {
      uid: user.uid,
      email: user.email,
      role: role,
      displayName: user.displayName || email.split('@')[0],
      photoURL: user.photoURL,
      createdAt: new Date(),
      lastLoginAt: new Date(),
      active: true
    };
    
    // Add branch assignments for specific branch users
    if (role === 'branch_user') {
      if (email === 'husain.m@ekkanoo.com.bh' || email === 'husain.new@ekkanoo.com.bh') {
        (userData as any).branchIds = ['branch-arad', 'branch-main-tank']; // Arad & Main Tank branches
      } else {
        (userData as any).branchIds = []; // Default empty for other branch users
      }
    }
    
    await setDoc(doc(db, 'users', user.uid), userData, { merge: true });
    
    return user;
  } catch (error) {
    console.error('Error creating user with email:', error);
    throw error;
  }
};

// Get deliveries for a specific driver
export const getUserDeliveries = async (driverId: string) => {
  try {
    // In a real app, this would query Firestore
    // For now, return empty array
    return [];
  } catch (error) {
    console.error('Error getting user deliveries:', error);
    return [];
  }
};

// Get complaints for a specific driver
export const getUserComplaints = async (driverId: string) => {
  try {
    const complaintsCollection = collection(db, 'complaints');
    // First try to get all documents, then filter client-side to avoid index issues
    const snapshot = await getDocs(complaintsCollection);
    const complaints = snapshot.docs
      .map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        createdAt: doc.data().createdAt || new Date(),
        updatedAt: doc.data().updatedAt || new Date(),
        resolvedAt: doc.data().resolvedAt || null
      }))
      .filter((complaint: any) => complaint.reportedBy === driverId)
      .sort((a: any, b: any) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
        return dateB.getTime() - dateA.getTime();
      });
    
    return complaints;
  } catch (error) {
    console.error('Error getting user complaints:', error);
    return [];
  }
};

// Admin functions
export const getAllDeliveries = async () => {
  try {
    // In a real app, this would query Firestore
    // For now, return empty array
    return [];
  } catch (error) {
    console.error('Error getting all deliveries:', error);
    return [];
  }
};

export const getAllComplaints = async () => {
  try {
    const complaintsCollection = collection(db, 'complaints');
    const snapshot = await getDocs(complaintsCollection);
    return snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      resolvedAt: doc.data().resolvedAt?.toDate() || null
    }));
  } catch (error) {
    console.error('Error getting all complaints:', error);
    return [];
  }
};

// Universal function to get next formatted ID in yyyy-00000 format
export const getNextFormattedId = async (type: string): Promise<string> => {
  try {
    const currentYear = new Date().getFullYear().toString();
    const counterRef = doc(db, 'counters', `${type}_${currentYear}`);
    const counterDoc = await getDoc(counterRef);
    
    if (!counterDoc.exists()) {
      // Initialize counter for this year
      await setDoc(counterRef, { value: 1 });
      return `${currentYear}-00001`;
    }
    
    const currentValue = counterDoc.data().value || 0;
    const nextValue = currentValue + 1;
    
    // Update counter
    await updateDoc(counterRef, { value: nextValue });
    
    // Format as 5-digit number with leading zeros
    const sequenceNumber = nextValue.toString().padStart(5, '0');
    return `${currentYear}-${sequenceNumber}`;
  } catch (error) {
    console.error(`Error getting next ${type} ID:`, error);
    // Fallback to timestamp-based numbering with year prefix
    const currentYear = new Date().getFullYear();
    const fallbackSequence = (Date.now() % 100000).toString().padStart(5, '0');
    return `${currentYear}-${fallbackSequence}`;
  }
};

// Function to get next sequential number for complaints (legacy compatibility)
const getNextComplaintNumber = async (): Promise<number> => {
  const formattedId = await getNextFormattedId('complaints');
  // Extract the sequence number for legacy compatibility
  return parseInt(formattedId.split('-')[1]);
};

// Function to get next sequential number for tasks (legacy compatibility)
const getNextTaskNumber = async (): Promise<number> => {
  const formattedId = await getNextFormattedId('tasks');
  // Extract the sequence number for legacy compatibility
  return parseInt(formattedId.split('-')[1]);
};

export const saveComplaint = async (complaintData: any) => {
  try {
    const complaintRef = doc(collection(db, 'complaints'));
    const complaintNumber = await getNextComplaintNumber();
    const complaintId = await getNextFormattedId('complaints'); // New formatted ID
    
    // Create clean data object with Firestore-compatible fields
    const cleanComplaintData = {
      complaintNumber, // Sequential number (for legacy compatibility)
      complaintId, // New formatted ID (yyyy-00000)
      title: complaintData.title || '',
      description: complaintData.description || '',
      category: complaintData.category || 'other',
      priority: complaintData.priority || 'medium',
      status: complaintData.status || 'open',
      reportedBy: complaintData.reportedBy || '',
      reportedByName: complaintData.reportedByName || complaintData.reporterName || '',
      reporterName: complaintData.reporterName || complaintData.reportedByName || '',
      photos: complaintData.photos || [],
      photoUrls: complaintData.photoUrls || complaintData.photos || [],
      watermarkedPhotos: complaintData.watermarkedPhotos || complaintData.photos || [],
      location: complaintData.location || '',
      branchName: complaintData.branchName || '',
      id: complaintRef.id,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };
    
    await setDoc(complaintRef, cleanComplaintData);
    return cleanComplaintData;
  } catch (error) {
    console.error('Error saving complaint:', error);
    throw error;
  }
};

export const createComplaint = async (complaintData: any) => {
  try {
    const complaintRef = doc(collection(db, 'complaints'));
    const complaintNumber = await getNextComplaintNumber();
    
    // Create clean data object with Firestore-compatible fields
    const cleanComplaintData = {
      complaintNumber, // Sequential number (1, 2, 3...)
      title: complaintData.title || '',
      description: complaintData.description || '',
      category: complaintData.category || 'other',
      priority: complaintData.priority || 'medium',
      status: complaintData.status || 'open',
      reportedBy: complaintData.reportedBy || '',
      reportedByName: complaintData.reportedByName || complaintData.reporterName || '',
      reporterName: complaintData.reporterName || complaintData.reportedByName || '',
      photos: complaintData.photos || [],
      photoUrls: complaintData.photoUrls || complaintData.photos || [],
      watermarkedPhotos: complaintData.watermarkedPhotos || complaintData.photos || [],
      location: complaintData.location || '',
      branchId: complaintData.branchId || '',
      branchName: complaintData.branchName || '',
      createdBy: complaintData.createdBy || '',
      assignedTo: complaintData.assignedTo || '',
      id: complaintRef.id,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };
    
    await setDoc(complaintRef, cleanComplaintData);
    return cleanComplaintData;
  } catch (error) {
    console.error('Error creating complaint:', error);
    throw error;
  }
};

// Function to create task with sequential numbering
export const createTask = async (taskData: any) => {
  try {
    const taskRef = doc(collection(db, 'tasks'));
    const taskNumber = await getNextTaskNumber();
    const taskId = await getNextFormattedId('tasks'); // New formatted ID
    
    // Create clean data object with Firestore-compatible fields
    const cleanTaskData = {
      taskNumber, // Sequential number (for legacy compatibility)
      taskId, // New formatted ID (yyyy-00000)
      title: taskData.title || '',
      description: taskData.description || '',
      priority: taskData.priority || 'medium',
      status: taskData.status || 'pending',
      assignedTo: taskData.assignedTo || '',
      assignedToName: taskData.assignedToName || '',
      dueDate: taskData.dueDate ? Timestamp.fromDate(new Date(taskData.dueDate)) : null,
      createdBy: taskData.createdBy || '',
      createdByName: taskData.createdByName || '', // Enhanced: Save creator display name
      id: taskRef.id,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };
    
    await setDoc(taskRef, cleanTaskData);
    return cleanTaskData;
  } catch (error) {
    console.error('Error creating task:', error);
    throw error;
  }
};

export const updateComplaint = async (id: string, complaintData: any) => {
  try {
    const complaintRef = doc(db, 'complaints', id);
    await updateDoc(complaintRef, {
      ...complaintData,
      updatedAt: new Date()
    });
  } catch (error) {
    console.error('Error updating complaint:', error);
    throw error;
  }
};

export const getAllUsers = async () => {
  try {
    const usersCollection = collection(db, 'users');
    const snapshot = await getDocs(usersCollection);
    return snapshot.docs.map(doc => doc.data());
  } catch (error) {
    console.error('Error getting all users:', error);
    return [];
  }
};

// Create new driver account (for admin)
export const createDriverAccount = async (driverData: any) => {
  try {
    // Create Firebase Auth user with email and password
    const result = await createUserWithEmailAndPassword(auth, driverData.email, driverData.password);
    const user = result.user;
    
    // Create user document in Firestore with all driver data
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      email: user.email,
      role: 'driver',
      displayName: driverData.displayName, // This is the full name/username
      photoURL: user.photoURL,
      createdAt: new Date(),
      lastLoginAt: new Date(),
      active: true,
      empNo: driverData.empNo,
      driverLicenceNo: driverData.driverLicenceNo,
      tankerLicenceNo: driverData.tankerLicenceNo || driverData.driverLicenceNo, // backward compatibility
      licenceExpiryDate: driverData.licenceExpiryDate
    });
    
    return user;
  } catch (error: any) {
    console.error('Error creating driver account:', error);
    if (error.code === 'auth/email-already-in-use') {
      throw new Error('Email is already registered. Please use a different email address.');
    } else if (error.code === 'auth/weak-password') {
      throw new Error('Password is too weak. Please choose a stronger password.');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('Invalid email address format.');
    }
    throw error;
  }
};

// Update driver data (for admin)
export const updateDriverData = async (uid: string, updateData: any) => {
  try {
    // Check if email is being updated
    const isEmailUpdate = updateData.email;
    let originalEmail = '';
    
    if (isEmailUpdate) {
      // Get current email before updating
      const userDoc = await getDoc(doc(db, 'users', uid));
      originalEmail = userDoc.data()?.email || '';
      
      // First update Firebase Auth email via backend API
      try {
        const response = await fetch('/api/admin/update-user-email', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            uid: uid,
            newEmail: updateData.email,
            oldEmail: originalEmail
          }),
        });
        
        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.message || 'Failed to update email in Firebase Auth');
        }
        
        console.log('✅ Firebase Auth email updated successfully');
      } catch (authError: any) {
        console.error('Firebase Auth email update failed:', authError);
        throw new Error(`Failed to update login email: ${authError.message}`);
      }
    }
    
    // Update Firestore document
    await updateDoc(doc(db, 'users', uid), {
      ...updateData,
      updatedAt: new Date()
    });
    
    console.log('✅ User data updated in both Firebase Auth and Firestore');
    return true;
  } catch (error: any) {
    console.error('Error updating driver data:', error);
    throw error;
  }
};

// Delete driver account (for admin) - removes both Auth and Firestore
export const deleteDriverAccount = async (uid: string) => {
  try {
    // First delete from Firestore
    await deleteDoc(doc(db, 'users', uid));
    
    // Note: Deleting from Firebase Auth requires Admin SDK on backend
    // The backend should handle Firebase Auth user deletion
    // For now, we'll mark as deleted in Firestore
    
    return true;
  } catch (error: any) {
    console.error('Error deleting driver account:', error);
    throw error;
  }
};

// Change driver password (for admin) - requires backend implementation
export const changeDriverPassword = async (uid: string, newPassword: string) => {
  try {
    // This requires Firebase Admin SDK and should be implemented on backend
    // We'll create an API endpoint for this
    const response = await fetch('/api/admin/change-driver-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        uid,
        newPassword
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to change password');
    }
    
    return true;
  } catch (error: any) {
    console.error('Error changing driver password:', error);
    throw error;
  }
};

// Branch management functions
export const saveBranch = async (branchData: any) => {
  try {
    const branchRef = doc(collection(db, 'branches'));
    const branchWithId = {
      ...branchData,
      id: branchRef.id,
      active: true,
      createdAt: new Date()
    };
    await setDoc(branchRef, branchWithId);
    return branchWithId;
  } catch (error) {
    console.error('Error saving branch:', error);
    throw error;
  }
};

export const getAllBranches = async () => {
  try {
    const branchesCollection = collection(db, 'branches');
    const snapshot = await getDocs(branchesCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
  } catch (error) {
    console.error('Error getting all branches:', error);
    return [];
  }
};

export const updateBranch = async (id: string, branchData: any) => {
  try {
    const branchRef = doc(db, 'branches', id);
    await updateDoc(branchRef, branchData);
  } catch (error) {
    console.error('Error updating branch:', error);
    throw error;
  }
};

export const syncBranchOilTanks = async (
  branchId: string,
  oilTanks: Array<{
    id?: string;
    oilTypeId: string;
    oilTypeName?: string;
    capacity: number;
    currentLevel?: number;
    tankName?: string;
    isActive?: boolean;
  }>,
): Promise<void> => {
  try {
    const tanksCollection = collection(db, 'oilTanks');
    const existingSnapshot = await getDocs(
      query(tanksCollection, where('branchId', '==', branchId)),
    );

    const existingById = new Map<string, any>();
    for (const tankDoc of existingSnapshot.docs) {
      existingById.set(tankDoc.id, { id: tankDoc.id, ...tankDoc.data() });
    }

    const batch = writeBatch(db);
    const keepIds = new Set<string>();

    const tanksList = oilTanks || [];
    for (let index = 0; index < tanksList.length; index++) {
      const tank = tanksList[index];
      const existing = tank.id ? existingById.get(tank.id) : undefined;
      const tankRef = existing?.id ? doc(db, 'oilTanks', existing.id) : doc(tanksCollection);
      const tankId = existing?.id || tankRef.id;
      keepIds.add(tankId);

      const resolvedTankName =
        (tank.tankName ?? '').toString().trim() ||
        (existing?.tankName ?? '').toString().trim() ||
        `Tank ${index + 1}`;

      batch.set(
        tankRef,
        {
          id: tankId,
          branchId,
          oilTypeId: tank.oilTypeId,
          oilTypeName: tank.oilTypeName ?? existing?.oilTypeName ?? '',
          capacity: Number(tank.capacity) || 0,
          currentLevel: Number(tank.currentLevel ?? existing?.currentLevel ?? 0) || 0,
          tankName: resolvedTankName,
          active: tank.isActive ?? existing?.active ?? true,
          updatedAt: new Date(),
          createdAt: existing?.createdAt ?? new Date(),
        },
        { merge: true },
      );
    }

    // Deactivate tanks that were removed in the edit UI
    for (const tankDoc of existingSnapshot.docs) {
      if (!keepIds.has(tankDoc.id)) {
        batch.set(
          tankDoc.ref,
          {
            active: false,
            updatedAt: new Date(),
          },
          { merge: true },
        );
      }
    }

    await batch.commit();
  } catch (error) {
    console.error('Error syncing branch oil tanks:', error);
    throw error;
  }
};

export const deleteBranch = async (id: string) => {
  try {
    const batch = writeBatch(db);
    
    // Delete the branch
    const branchRef = doc(db, 'branches', id);
    batch.delete(branchRef);
    
    // Delete related transactions
    const transactionsQuery = query(
      collection(db, 'transactions'),
      where('branchId', '==', id)
    );
    const transactionsSnapshot = await getDocs(transactionsQuery);
    transactionsSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    // Delete related deliveries
    const deliveriesQuery = query(
      collection(db, 'deliveries'),
      where('branchId', '==', id)
    );
    const deliveriesSnapshot = await getDocs(deliveriesQuery);
    deliveriesSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    // Delete related oil tanks
    const oilTanksQuery = query(
      collection(db, 'oilTanks'),
      where('branchId', '==', id)
    );
    const oilTanksSnapshot = await getDocs(oilTanksQuery);
    oilTanksSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    // Delete related tank update logs
    const tankUpdateLogsQuery = query(
      collection(db, 'tankUpdateLogs'),
      where('branchId', '==', id)
    );
    const tankUpdateLogsSnapshot = await getDocs(tankUpdateLogsQuery);
    tankUpdateLogsSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    console.log(`Branch ${id} and all related records (transactions, deliveries, oil tanks, tank logs) deleted successfully`);
  } catch (error) {
    console.error('Error deleting branch with cascading delete:', error);
    throw error;
  }
};

// Oil type management functions
export const saveOilType = async (oilTypeData: any) => {
  try {
    const oilTypeRef = doc(collection(db, 'oilTypes'));
    const oilTypeWithId = {
      ...oilTypeData,
      id: oilTypeRef.id,
      active: true,
      createdAt: new Date()
    };
    await setDoc(oilTypeRef, oilTypeWithId);
    return oilTypeWithId;
  } catch (error) {
    console.error('Error saving oil type:', error);
    throw error;
  }
};

export const getAllOilTypes = async () => {
  try {
    const oilTypesCollection = collection(db, 'oilTypes');
    const snapshot = await getDocs(oilTypesCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
  } catch (error) {
    console.error('Error getting all oil types:', error);
    return [];
  }
};

export const updateOilType = async (id: string, oilTypeData: any) => {
  try {
    const oilTypeRef = doc(db, 'oilTypes', id);
    await updateDoc(oilTypeRef, oilTypeData);
  } catch (error) {
    console.error('Error updating oil type:', error);
    throw error;
  }
};

export const deleteOilType = async (id: string) => {
  try {
    const batch = writeBatch(db);
    
    // Delete the oil type
    const oilTypeRef = doc(db, 'oilTypes', id);
    batch.delete(oilTypeRef);
    
    // Delete related transactions
    const transactionsQuery = query(
      collection(db, 'transactions'),
      where('oilTypeId', '==', id)
    );
    const transactionsSnapshot = await getDocs(transactionsQuery);
    transactionsSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    // Delete related load sessions
    const loadSessionsQuery = query(
      collection(db, 'loadSessions'),
      where('oilTypeId', '==', id)
    );
    const loadSessionsSnapshot = await getDocs(loadSessionsQuery);
    loadSessionsSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    // Delete related deliveries
    const deliveriesQuery = query(
      collection(db, 'deliveries'),
      where('oilTypeId', '==', id)
    );
    const deliveriesSnapshot = await getDocs(deliveriesQuery);
    deliveriesSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    console.log(`Oil type ${id} and all related records deleted successfully`);
  } catch (error) {
    console.error('Error deleting oil type with cascading delete:', error);
    throw error;
  }
};

// Driver management functions  
export const updateDriver = async (id: string, driverData: any) => {
  try {
    console.log('📝 Updating user with data:', id, driverData);
    
    // Clean data to avoid issues with undefined arrays/objects
    const cleanData = { ...driverData };
    
    // Ensure branchIds is always an array 
    if (cleanData.branchIds) {
      if (typeof cleanData.branchIds === 'string') {
        cleanData.branchIds = [cleanData.branchIds];
      } else if (!Array.isArray(cleanData.branchIds)) {
        cleanData.branchIds = [];
      }
    }
    
    // Remove any undefined/null values that could cause issues
    Object.keys(cleanData).forEach(key => {
      if (cleanData[key] === undefined || cleanData[key] === null) {
        delete cleanData[key];
      }
    });
    
    console.log('📝 Clean data for update:', cleanData);
    
    const userRef = doc(db, 'users', id);
    await updateDoc(userRef, {
      ...cleanData,
      updatedAt: new Date()
    });
    
    console.log('✅ User updated successfully');
  } catch (error) {
    console.error('Error updating driver:', error);
    throw error;
  }
};

export const deleteDriver = async (id: string) => {
  try {
    console.log('🗑️ Starting complete user deletion for:', id);
    
    // Step 1: Get user data before deletion
    const userRef = doc(db, 'users', id);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      throw new Error('User not found in database');
    }
    
    const userData = userSnap.data();
    console.log('📋 User data retrieved:', userData.email);
    
    // Step 2: Delete related data first (cascading delete)
    const batch = writeBatch(db);
    
    // Delete user's complaints
    const complaintsQuery = query(
      collection(db, 'complaints'),
      where('reportedBy', '==', id)
    );
    const complaintsSnapshot = await getDocs(complaintsQuery);
    complaintsSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    console.log(`📝 Queued ${complaintsSnapshot.docs.length} complaints for deletion`);
    
    // Delete user's tasks (if assigned)
    const tasksQuery = query(
      collection(db, 'tasks'),
      where('assignedTo', '==', id)
    );
    const tasksSnapshot = await getDocs(tasksQuery);
    tasksSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    console.log(`📋 Queued ${tasksSnapshot.docs.length} tasks for deletion`);
    
    // Delete user's transactions/deliveries
    const transactionsQuery = query(
      collection(db, 'transactions'),
      where('driverId', '==', id)
    );
    const transactionsSnapshot = await getDocs(transactionsQuery);
    transactionsSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    console.log(`🚛 Queued ${transactionsSnapshot.docs.length} transactions for deletion`);
    
    // Delete user from Firestore
    batch.delete(userRef);
    
    // Step 3: Execute batch delete for Firestore data
    await batch.commit();
    console.log('✅ Firestore data deleted successfully');
    
    // Step 4: Delete from Firebase Authentication
    try {
      console.log('🔄 Attempting Firebase Auth deletion via server...');
      const response = await fetch('/api/admin/delete-user', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uid: id, email: userData.email })
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.authDeleted) {
          console.log('✅ Firebase Auth user deleted successfully');
        } else {
          console.warn('⚠️ Firebase Auth deletion not configured:', result.manualStep);
        }
      } else {
        console.warn('⚠️ Server responded with error for Auth deletion');
      }
    } catch (authError) {
      console.warn('⚠️ Firebase Auth deletion request failed:', authError);
    }
    
    console.log('🎉 User deletion completed:', userData.email);
    
  } catch (error) {
    console.error('Error deleting driver:', error);
    throw error;
  }
};

// Task management functions
export const saveTask = async (taskData: any) => {
  try {
    console.log('Creating task with data:', taskData);
    
    // Validate required fields
    if (!taskData.title || !taskData.dueDate) {
      throw new Error('Title and due date are required');
    }
    
    const taskRef = doc(collection(db, 'tasks'));
    const taskWithId = {
      title: taskData.title,
      description: taskData.description || '',
      priority: taskData.priority || 'medium',
      status: 'pending',
      assignedTo: taskData.assignedTo || null,
      assignedToName: taskData.assignedToName || '', // Enhanced: Save display name
      createdBy: taskData.createdBy || '',
      createdByName: taskData.createdByName || '', // Enhanced: Save creator display name
      attachments: taskData.attachments || [], // File attachments array
      id: taskRef.id,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      dueDate: Timestamp.fromDate(taskData.dueDate)
    };
    
    console.log('Saving task to Firestore:', taskWithId);
    await setDoc(taskRef, taskWithId);
    console.log('Task saved successfully');
    
    return {
      ...taskWithId,
      createdAt: taskWithId.createdAt.toDate(),
      updatedAt: taskWithId.updatedAt.toDate(),
      dueDate: taskWithId.dueDate.toDate()
    };
  } catch (error) {
    console.error('Error saving task:', error);
    throw error;
  }
};

export const getAllTasks = async () => {
  try {
    const tasksCollection = collection(db, 'tasks');
    const q = query(tasksCollection, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        // Convert Firestore Timestamps to Date objects
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        dueDate: data.dueDate?.toDate() || new Date()
      };
    });
  } catch (error) {
    console.error('Error getting all tasks:', error);
    return [];
  }
};

export const updateTask = async (id: string, taskData: any) => {
  try {
    const taskRef = doc(db, 'tasks', id);
    const updateData = {
      ...taskData,
      updatedAt: Timestamp.now()
    };
    // Convert dueDate to Timestamp if it's provided and is a Date
    if (taskData.dueDate && taskData.dueDate instanceof Date) {
      updateData.dueDate = Timestamp.fromDate(taskData.dueDate);
    }
    await updateDoc(taskRef, updateData);
  } catch (error) {
    console.error('Error updating task:', error);
    throw error;
  }
};

export const deleteTask = async (id: string) => {
  try {
    const taskRef = doc(db, 'tasks', id);
    await deleteDoc(taskRef);
  } catch (error) {
    console.error('Error deleting task:', error);
    throw error;
  }
};

// Helper function to get current user ID
const getCurrentUserId = () => {
  // Priority: 1. Firebase Auth current user, 2. Local storage session, 3. 'anonymous'
  if (auth.currentUser?.uid) return auth.currentUser.uid;

  const savedUser = localStorage.getItem("currentUser");
  if (savedUser) {
    try {
      const parsedUser = JSON.parse(savedUser);
      return parsedUser.uid || parsedUser.id || "anonymous";
    } catch (e) {
      console.error("Error parsing stored user for UID:", e);
    }
  }

  return "anonymous";
};

// Helper for robust Firestore operations with retries
export const withRetry = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      // Don't retry if it's a permission error
      if (error?.code === "permission-denied") throw error;

      console.warn(
        `⚠️ Firestore operation failed (attempt ${i + 1}/${maxRetries}):`,
        error.message || error
      );
      if (i < maxRetries - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, delay * Math.pow(2, i))
        );
      }
    }
  }
  throw lastError;
};

// Tanker Vehicle Management Functions
export const getTankerVehicle = async (driverUid: string) => {
  try {
    const tankerRef = doc(db, 'tankerVehicles', driverUid);
    const tankerSnap = await getDoc(tankerRef);
    
    if (tankerSnap.exists()) {
      return tankerSnap.data();
    } else {
      // Create default tanker for driver
      const defaultTanker = {
        driverUid,
        capacity: 10000, // 10,000L default capacity
        currentLevel: 0,
        oilTypeId: null,
        oilTypeName: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      await setDoc(tankerRef, defaultTanker);
      return defaultTanker;
    }
  } catch (error) {
    console.error('Error getting tanker vehicle:', error);
    throw error;
  }
};

export const updateTankerVehicle = async (driverUid: string, updateData: any) => {
  try {
    const tankerRef = doc(db, 'tankerVehicles', driverUid);
    await updateDoc(tankerRef, {
      ...updateData,
      updatedAt: new Date()
    });
    
    console.log('🚛 Tanker vehicle updated:', {
      driverUid,
      newLevel: updateData.currentLevel,
      timestamp: new Date().toLocaleString()
    });
  } catch (error) {
    console.error('Error updating tanker vehicle:', error);
    throw error;
  }
};

// Load Session and Transaction Management Functions with Inventory Control
export const createLoadSession = async (loadSessionData: any) => {
  try {
    const driverUid = loadSessionData.driverUid || getCurrentUserId();
    const loadingQuantity = Number(loadSessionData.totalLoadedLiters || 0);
    const sourceLocationId = loadSessionData.loadLocationId;

    console.log("🚛 Starting loading operation with concurrent-safe inventory control:", {
      driverUid,
      quantity: loadingQuantity,
      sourceLocation: sourceLocationId,
      oilType: loadSessionData.oilTypeName,
    });

    // Generate IDs before transaction
    const loadSessionRef = doc(collection(db, "loadSessions"));
    const loadSessionId = await getNextFormattedId("load_sessions");

    // Use a transaction for the entire loading operation to ensure consistency
    const result = await runTransaction(db, async (transaction) => {
      // 1. Get driver's tanker vehicle
      const tankerRef = doc(db, 'tankerVehicles', driverUid);
      const tankerSnap = await transaction.get(tankerRef);
      
      let tankerData;
      if (tankerSnap.exists()) {
        tankerData = tankerSnap.get(); // Using .get() for consistency
      } else {
        tankerData = {
          driverUid,
          capacity: 10000,
          currentLevel: 0,
          oilTypeId: null,
          oilTypeName: null,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        transaction.set(tankerRef, tankerData);
      }

      const tankerBefore = Number(tankerData.currentLevel || 0);
      const newTankerLevel = tankerBefore + loadingQuantity;

      // 2. Branch update (if loading from a branch)
      let branchTankBefore = null;
      let branchTankAfter = null;
      let branchTankId = null;

      if (sourceLocationId && sourceLocationId !== "main-depot") {
        const branchRef = doc(db, "branches", sourceLocationId);
        const branchSnap = await transaction.get(branchRef);

        if (branchSnap.exists()) {
          const branchData = branchSnap.data();
          const oilTanks = [...(branchData.oilTanks || [])];

          // Determine which tank to use
          let selectedTankIndex = -1;
          
          // If a specific tank index was provided from the UI, use it
          if (loadSessionData.tankIndex !== undefined && loadSessionData.tankIndex >= 0 && loadSessionData.tankIndex < oilTanks.length) {
            // Verify it matches the oil type just in case
            if (oilTanks[loadSessionData.tankIndex].oilTypeId === loadSessionData.oilTypeId) {
              selectedTankIndex = loadSessionData.tankIndex;
              console.log(`🎯 Using specific tank index ${selectedTankIndex} as requested`);
            }
          }
          
          // Fallback: Find first tank with matching oil type if no index or invalid index provided
          if (selectedTankIndex === -1) {
            for (let i = 0; i < oilTanks.length; i++) {
              if (oilTanks[i].oilTypeId === loadSessionData.oilTypeId) {
                selectedTankIndex = i;
                break;
              }
            }
          }

          if (selectedTankIndex !== -1) {
            branchTankBefore = Number(oilTanks[selectedTankIndex].currentLevel || 0);
            branchTankId = `tank-${selectedTankIndex}`;
            
            // Deduct quantity
            branchTankAfter = branchTankBefore - loadingQuantity;
            oilTanks[selectedTankIndex] = {
              ...oilTanks[selectedTankIndex],
              currentLevel: branchTankAfter,
              lastUpdated: new Date()
            };

            transaction.update(branchRef, {
              oilTanks: oilTanks,
              updatedAt: new Date()
            });

            // Create a tank update log for the warehouse/branch dashboards
            const logRef = doc(collection(db, 'tankUpdateLogs'));
            transaction.set(logRef, {
              branchId: sourceLocationId,
              branchName: branchData.name || "Unknown Branch",
              oilTypeId: loadSessionData.oilTypeId,
              oilTypeName: loadSessionData.oilTypeName,
              previousLevel: branchTankBefore,
              newLevel: branchTankAfter,
              levelDifference: -loadingQuantity,
              updatedBy: loadSessionData.driverName || "Driver",
              updatedAt: new Date(),
              notes: `Auto-deducted via Oil Loading session ${loadSessionId}`,
              updateType: 'loading',
              sessionId: loadSessionId
            });

            console.log("✅ TRANSACTION: Branch tank inventory deducted and logged:", {
              branchId: sourceLocationId,
              tankIndex: selectedTankIndex,
              before: branchTankBefore,
              after: branchTankAfter,
            });
          }
        }
      }

      // 3. Update tanker vehicle in transaction
      transaction.update(tankerRef, {
        currentLevel: newTankerLevel,
        oilTypeId: loadSessionData.oilTypeId,
        oilTypeName: loadSessionData.oilTypeName,
        updatedAt: new Date()
      });

      return {
        tankerBefore,
        newTankerLevel,
        branchTankBefore,
        branchTankAfter,
        branchTankId
      };
    });

    // 4. Create load session and save transaction record (non-transactional but with retry)
    const loadSessionWithId = {
      ...loadSessionData,
      id: loadSessionRef.id,
      loadSessionId: loadSessionId,
      status: "active",
      createdAt: new Date(),
      timestamp: new Date(),
      createdBy: driverUid,
      remainingLiters: loadingQuantity,
      loadCount: 1,
    };

    await withRetry(() => setDoc(loadSessionRef, loadSessionWithId));

    // Save to transactions collection
    try {
      await saveTransaction({
        type: "loading",
        loadSessionId: loadSessionId,
        oilTypeId: loadSessionData.oilTypeId,
        oilTypeName: loadSessionData.oilTypeName,
        quantity: loadingQuantity,
        loadedLiters: loadingQuantity,
        location: loadSessionData.loadLocationId,
        branchId: loadSessionData.loadLocationId,
        branchName: loadSessionData.loadLocationName,
        loadLocationName: loadSessionData.loadLocationName,
        meterReading: loadSessionData.loadMeterReading,
        loadMeterReading: loadSessionData.loadMeterReading,
        driverName: loadSessionData.driverName,
        driverUid: driverUid,
        photos: {
          meterReadingPhoto: loadSessionData.meterReadingPhoto,
        },
        timestamp: new Date(),
        tankerBefore: result.tankerBefore,
        tankerAfter: result.newTankerLevel,
        branchTankId: result.branchTankId,
        branchTankBefore: result.branchTankBefore,
        branchTankAfter: result.branchTankAfter,
        inventoryUpdated: true,
        outcome: "success",
      });
    } catch (transactionError) {
      console.warn("⚠️ Non-critical error saving loading transaction record:", transactionError);
    }

    return loadSessionWithId;
  } catch (error: any) {
    console.error("❌ Critical error in concurrent-safe createLoadSession:", error);
    // Log failure attempt
    try {
      await saveTransaction({
        type: "loading_failed",
        reason: error.message || "CRITICAL_ERROR",
        driverUid: loadSessionData.driverUid || "unknown",
        oilTypeId: loadSessionData.oilTypeId,
        attemptedQuantity: loadSessionData.totalLoadedLiters,
        timestamp: new Date(),
        outcome: "failure",
      });
    } catch (e) {}
    throw error;
  }
};

export const saveTransaction = async (transactionData: any) => {
  return await withRetry(async () => {
    const transactionRef = doc(collection(db, "transactions"));
    const transactionId = await getNextFormattedId("transactions");
    const transactionWithId = {
      ...transactionData,
      id: transactionRef.id,
      transactionId,
      timestamp: new Date(),
      createdAt: new Date(),
    };

    await setDoc(transactionRef, transactionWithId);
    console.log("✅ Transaction saved successfully:", transactionId);
    return transactionWithId;
  });
};

export const completeDelivery = async (deliveryData: any) => {
  try {
    const driverUid = deliveryData.driverUid || getCurrentUserId();
    const supplyQuantity = Number(
      deliveryData.oilSuppliedLiters || deliveryData.deliveredLiters || 0
    );
    const targetBranchId = deliveryData.branchId;

    console.log("🚚 Starting completeDelivery with concurrent-safe inventory control:", {
      driverUid,
      quantity: supplyQuantity,
      targetBranch: targetBranchId,
      oilType: deliveryData.oilTypeName || "Unknown",
    });

    // Use a transaction for the entire supply operation
    const result = await runTransaction(db, async (transaction) => {
      // 1. Get driver's tanker vehicle
      const tankerRef = doc(db, 'tankerVehicles', driverUid);
      const tankerSnap = await transaction.get(tankerRef);
      
      let tankerData;
      if (tankerSnap.exists()) {
        tankerData = tankerSnap.data();
      } else {
        tankerData = {
          driverUid,
          capacity: 10000,
          currentLevel: 0,
          oilTypeId: null,
          oilTypeName: null,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        transaction.set(tankerRef, tankerData);
      }

      const tankerBefore = Number(tankerData.currentLevel || 0);
      const finalTankerLevel = tankerBefore - supplyQuantity;

      // 2. Branch update
      let branchAddress = "";
      let branchTankBefore = null;
      let branchTankAfter = null;
      let branchTankId = null;

      if (targetBranchId) {
        const branchRef = doc(db, "branches", targetBranchId);
        const branchDoc = await transaction.get(branchRef);

        if (branchDoc.exists()) {
          const branchData = branchDoc.data();
          branchAddress = branchData.address || branchData.location || "";

          // Update branch tank
          const oilTanks = [...(branchData.oilTanks || [])];
          let selectedTankIndex = -1;
          for (let i = 0; i < oilTanks.length; i++) {
            if (oilTanks[i].oilTypeId === deliveryData.oilTypeId) {
              selectedTankIndex = i;
              break;
            }
          }

          if (selectedTankIndex !== -1) {
            const targetTank = oilTanks[selectedTankIndex];
            branchTankBefore = Number(targetTank.currentLevel || 0);
            branchTankId = `tank-${selectedTankIndex}`;
            branchTankAfter = branchTankBefore + supplyQuantity;

            // Cap at capacity only if explicitly required, otherwise allow overfill to match reality
            // User requested: "it should also except that" (referring to modified levels)
            const capacityLimit = targetTank.capacity || 10000;
            if (branchTankAfter > capacityLimit) {
              console.warn(`⚠️ SUPPLY: Destination tank over-capacity. Level: ${branchTankAfter}L, Capacity: ${capacityLimit}L. Proceeding per user requirement.`);
            }

            oilTanks[selectedTankIndex] = {
              ...targetTank,
              currentLevel: branchTankAfter,
              lastUpdated: new Date(),
            };

            transaction.update(branchRef, {
              oilTanks: oilTanks,
              updatedAt: new Date(),
            });

            // Create a tank update log for the warehouse/branch dashboards
            const logRef = doc(collection(db, 'tankUpdateLogs'));
            transaction.set(logRef, {
              branchId: targetBranchId,
              branchName: branchData.name || "Unknown Branch",
              oilTypeId: deliveryData.oilTypeId,
              oilTypeName: deliveryData.oilTypeName,
              previousLevel: branchTankBefore,
              newLevel: branchTankAfter,
              levelDifference: supplyQuantity,
              updatedBy: deliveryData.driverName || "Driver",
              updatedAt: new Date(),
              notes: `Auto-added via Oil Supply session ${deliveryData.loadSessionId || 'direct'}`,
              updateType: 'supply',
              sessionId: deliveryData.loadSessionId || 'direct',
              deliveryOrderId: deliveryData.deliveryOrderId || ''
            });
          } else {
            // No matching tank found - create one
            console.log(`🔧 SUPPLY: No matching tank found at branch. Creating new tank for oil type ${deliveryData.oilTypeName}`);
            branchTankBefore = 0;
            branchTankAfter = supplyQuantity;
            branchTankId = `tank-new`;

            const newTank = {
              oilTypeId: deliveryData.oilTypeId,
              oilTypeName: deliveryData.oilTypeName,
              currentLevel: branchTankAfter,
              capacity: 10000, // Default capacity
              lastUpdated: new Date(),
            };
            oilTanks.push(newTank);

            transaction.update(branchRef, {
              oilTanks: oilTanks,
              updatedAt: new Date(),
            });

            // Create a tank update log for the new tank
            const logRef = doc(collection(db, 'tankUpdateLogs'));
            transaction.set(logRef, {
              branchId: targetBranchId,
              branchName: branchData.name || "Unknown Branch",
              oilTypeId: deliveryData.oilTypeId,
              oilTypeName: deliveryData.oilTypeName,
              previousLevel: 0,
              newLevel: branchTankAfter,
              levelDifference: supplyQuantity,
              updatedBy: deliveryData.driverName || "Driver",
              updatedAt: new Date(),
              notes: `Created new tank and added inventory via Oil Supply session ${deliveryData.loadSessionId || 'direct'}`,
              updateType: 'supply',
              sessionId: deliveryData.loadSessionId || 'direct'
            });
          }
        }
      }

      // 3. Update tanker vehicle in transaction
      transaction.update(tankerRef, {
        currentLevel: finalTankerLevel,
        updatedAt: new Date()
      });

      return {
        tankerBefore,
        finalTankerLevel,
        branchAddress,
        branchTankBefore,
        branchTankAfter,
        branchTankId
      };
    });

    // 4. Update load session (non-transactional but with retry)
    if (deliveryData.loadSessionId) {
      try {
        const loadSessionRef = doc(db, "loadSessions", deliveryData.loadSessionId);
        await withRetry(async () => {
          const lsSnap = await getDoc(loadSessionRef);
          if (lsSnap.exists()) {
            const lsData = lsSnap.data();
            const currentRemaining = Number(lsData.remainingLiters || 0);
            const newRemaining = currentRemaining - supplyQuantity;
            await updateDoc(loadSessionRef, {
              remainingLiters: newRemaining,
              status: newRemaining <= 0 ? "completed" : "active",
              lastSupplyAt: new Date(),
              ...(newRemaining <= 0 && { completedAt: new Date() }),
            });
          }
        });
      } catch (lsError) {
        console.warn("⚠️ Non-critical load session update failure:", lsError);
      }
    }

    // 5. Save delivery record
    const deliveryRef = doc(collection(db, "deliveries"));
    const deliveryWithId = {
      ...deliveryData,
      branchAddress: result.branchAddress,
      id: deliveryRef.id,
      completedAt: new Date(),
      timestamp: new Date(),
      status: "completed",
    };

    await withRetry(() => setDoc(deliveryRef, deliveryWithId));

    // 6. Save transaction record
    try {
      await saveTransaction({
        type: "supply",
        supplyType: "loose",
        loadSessionId: deliveryData.loadSessionId,
        deliveryOrderId: deliveryData.deliveryOrderId,
        branchId: deliveryData.branchId,
        branchName: deliveryData.branchName,
        branchAddress: result.branchAddress,
        oilTypeId: deliveryData.oilTypeId,
        oilTypeName: deliveryData.oilTypeName,
        quantity: supplyQuantity,
        photos: deliveryData.photos,
        driverUid: driverUid,
        driverName: deliveryData.driverName,
        tankerBefore: result.tankerBefore,
        tankerAfter: result.finalTankerLevel,
        branchTankId: result.branchTankId,
        branchTankBefore: result.branchTankBefore,
        branchTankAfter: result.branchTankAfter,
        inventoryUpdated: true,
        outcome: "success",
      });
    } catch (txError) {
      console.warn("⚠️ Non-critical transaction record failure:", txError);
    }

    return deliveryWithId;
  } catch (error: any) {
    console.error("❌ Critical error in concurrent-safe completeDelivery:", error);
    // Log failure attempt
    try {
      await saveTransaction({
        type: "supply_failed",
        reason: error.message || "CRITICAL_ERROR",
        driverUid: deliveryData.driverUid || "unknown",
        branchId: deliveryData.branchId,
        oilTypeId: deliveryData.oilTypeId,
        oilTypeName: deliveryData.oilTypeName,
        attemptedQuantity: supplyQuantity,
        timestamp: new Date(),
        outcome: "failure",
      });
    } catch (e) {}
    throw error;
  }
};

export const getActiveLoadSessions = async () => {
  try {
    const loadSessionsCollection = collection(db, 'loadSessions');
    const snapshot = await getDocs(loadSessionsCollection);
    return snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter((session: any) => session.status === 'active')
      .sort((a: any, b: any) => {
        // Sort by creation date, newest first
        const timeA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
        const timeB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
        return timeB.getTime() - timeA.getTime();
      });
  } catch (error) {
    console.error('Error getting active load sessions:', error);
    return [];
  }
};

// Dedicated function for drum supply transactions
export const completeDrumSupply = async (drumSupplyData: any) => {
  try {
    const driverUid = drumSupplyData.driverUid || getCurrentUserId();
    const supplyQuantity = drumSupplyData.quantity || 0;
    const targetBranchId = drumSupplyData.branchId;

    console.log("🥁 Starting concurrent-safe drum supply operation:", {
      driverUid,
      quantity: supplyQuantity,
      targetBranch: targetBranchId,
      oilType: drumSupplyData.oilTypeName || "Unknown",
    });

    // Use a transaction for the entire drum supply operation
    const result = await runTransaction(db, async (transaction) => {
      // 1. Get tanker with transaction
      const tankerRef = doc(db, 'tankerVehicles', driverUid);
      const tankerSnap = await transaction.get(tankerRef);
      
      let tankerData;
      if (tankerSnap.exists()) {
        tankerData = tankerSnap.data();
      } else {
        tankerData = {
          driverUid,
          capacity: 10000,
          currentLevel: 0,
          oilTypeId: null,
          oilTypeName: null,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        transaction.set(tankerRef, tankerData);
      }

      const tankerBefore = Number(tankerData.currentLevel || 0);
      const finalTankerLevel = tankerBefore - supplyQuantity;

      // 2. Branch update
      let branchAddress = "";
      let branchTankBefore = null;
      let branchTankAfter = null;
      let branchTankId = null;

      if (targetBranchId) {
        const branchRef = doc(db, "branches", targetBranchId);
        const branchDoc = await transaction.get(branchRef);

        if (branchDoc.exists()) {
          const branchData = branchDoc.data();
          branchAddress = branchData.address || branchData.location || "";

          const oilTanks = [...(branchData.oilTanks || [])];
          let selectedTankIndex = -1;
          for (let i = 0; i < oilTanks.length; i++) {
            if (oilTanks[i].oilTypeId === drumSupplyData.oilTypeId) {
              selectedTankIndex = i;
              break;
            }
          }

          if (selectedTankIndex !== -1) {
            const targetTank = oilTanks[selectedTankIndex];
            branchTankBefore = Number(targetTank.currentLevel || 0);
            branchTankId = `tank-${selectedTankIndex}`;
            branchTankAfter = branchTankBefore + supplyQuantity;

            // Allow overfill for drums too
            const capacityLimit = targetTank.capacity || 10000;
            if (branchTankAfter > capacityLimit) {
              console.warn(`⚠️ DRUM SUPPLY: Destination tank over-capacity. Level: ${branchTankAfter}L, Capacity: ${capacityLimit}L.`);
            }

            oilTanks[selectedTankIndex] = {
              ...targetTank,
              currentLevel: branchTankAfter,
              lastUpdated: new Date(),
            };

            transaction.update(branchRef, {
              oilTanks: oilTanks,
              updatedAt: new Date(),
            });

            // Log the drum supply activity
            const logRef = doc(collection(db, 'tankUpdateLogs'));
            transaction.set(logRef, {
              branchId: targetBranchId,
              branchName: branchData.name || "Unknown Branch",
              oilTypeId: drumSupplyData.oilTypeId,
              oilTypeName: drumSupplyData.oilTypeName,
              previousLevel: branchTankBefore,
              newLevel: branchTankAfter,
              levelDifference: supplyQuantity,
              updatedBy: drumSupplyData.driverName || "Driver",
              updatedAt: new Date(),
              notes: `Drum supply: ${drumSupplyData.numberOfDrums} drums of ${drumSupplyData.drumCapacity}L`,
              updateType: 'supply',
              deliveryOrderId: drumSupplyData.deliveryOrderNo || ''
            });

            console.log("✅ DRUM SUPPLY TRANSACTION: Branch tank updated and logged");
          } else {
            // Create tank if missing
            console.log(`🔧 DRUM SUPPLY TRANSACTION: Creating new tank for ${drumSupplyData.oilTypeName}`);
            branchTankBefore = 0;
            branchTankAfter = supplyQuantity;
            branchTankId = "tank-new";

            oilTanks.push({
              oilTypeId: drumSupplyData.oilTypeId,
              oilTypeName: drumSupplyData.oilTypeName,
              currentLevel: branchTankAfter,
              capacity: 10000,
              lastUpdated: new Date(),
            });

            transaction.update(branchRef, {
              oilTanks: oilTanks,
              updatedAt: new Date(),
            });

            // Log the new tank creation from drum supply
            const logRef = doc(collection(db, 'tankUpdateLogs'));
            transaction.set(logRef, {
              branchId: targetBranchId,
              branchName: branchData.name || "Unknown Branch",
              oilTypeId: drumSupplyData.oilTypeId,
              oilTypeName: drumSupplyData.oilTypeName,
              previousLevel: 0,
              newLevel: branchTankAfter,
              levelDifference: supplyQuantity,
              updatedBy: drumSupplyData.driverName || "Driver",
              updatedAt: new Date(),
              notes: `New tank created via Drum supply: ${drumSupplyData.numberOfDrums} drums`,
              updateType: 'supply'
            });
          }
        }
      }

      // 3. Update tanker vehicle in transaction
      transaction.update(tankerRef, {
        currentLevel: finalTankerLevel,
        updatedAt: new Date()
      });

      return {
        tankerBefore,
        finalTankerLevel,
        branchAddress,
        branchTankBefore,
        branchTankAfter,
        branchTankId
      };
    });

    // 4. Save transaction record
    const transactionData = {
      type: "supply",
      supplyType: "drum",
      driverUid: driverUid,
      driverName: drumSupplyData.driverName,
      branchId: drumSupplyData.branchId,
      branchName: drumSupplyData.branchName,
      branchAddress: result.branchAddress,
      oilTypeId: drumSupplyData.oilTypeId,
      oilTypeName: drumSupplyData.oilTypeName,
      deliveryOrderId: drumSupplyData.deliveryOrderNo,
      numberOfDrums: drumSupplyData.numberOfDrums,
      drumCapacity: drumSupplyData.drumCapacity,
      quantity: supplyQuantity,
      photos: drumSupplyData.photos || {},
      timestamp: new Date(),
      createdAt: new Date(),
      status: "completed",
      inventoryUpdated: true,
      tankerBefore: result.tankerBefore,
      tankerAfter: result.finalTankerLevel,
      branchTankId: result.branchTankId,
      branchTankBefore: result.branchTankBefore,
      branchTankAfter: result.branchTankAfter,
      outcome: "success",
    };

    await saveTransaction(transactionData);
    console.log("✅ Drum supply completed successfully");

    return transactionData;
  } catch (error) {
    console.error("❌ Error completing concurrent-safe drum supply:", error);
    throw error;
  }
};

export const getAllTransactions = async () => {
  try {
    const transactionsCollection = collection(db, 'transactions');
    const snapshot = await getDocs(transactionsCollection);
    return snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate() || new Date(),
      createdAt: doc.data().createdAt?.toDate() || new Date()
    })).sort((a: any, b: any) => 
      new Date(b.timestamp?.toDate ? b.timestamp.toDate() : b.timestamp).getTime() - 
      new Date(a.timestamp?.toDate ? a.timestamp.toDate() : a.timestamp).getTime()
    ) as any[];
  } catch (error) {
    console.error('Error getting all transactions:', error);
    return [];
  }
};

// Get all oil types from Firestore
export const getOilTypes = async () => {
  try {
    const oilTypesCollection = collection(db, 'oilTypes');
    const snapshot = await getDocs(oilTypesCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
  } catch (error) {
    console.error('Error getting oil types:', error);
    return [];
  }
};

// Get all branches from Firestore
export const getBranches = async () => {
  try {
    const branchesCollection = collection(db, 'branches');
    const snapshot = await getDocs(branchesCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
  } catch (error) {
    console.error('Error getting branches:', error);
    return [];
  }
};

// Get drum capacities
export const getDrumCapacities = async () => {
  try {
    const drumCapacitiesCollection = collection(db, 'drumCapacities');
    const snapshot = await getDocs(drumCapacitiesCollection);
    const capacities = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return capacities.sort((a: any, b: any) => a.value - b.value);
  } catch (error) {
    console.error('Error getting drum capacities:', error);
    // Return default capacities if none found
    return [
      { id: '200', name: 'Standard Small', value: 200 },
      { id: '250', name: 'Medium', value: 250 },
      { id: '500', name: 'Standard Large', value: 500 },
      { id: '1000', name: 'Industrial', value: 1000 }
    ];
  }
};

// Save drum capacity (admin function)
export const saveDrumCapacity = async (capacityData: { name: string; value: number }) => {
  try {
    const capacityRef = doc(collection(db, 'drumCapacities'));
    const capacityWithId = {
      ...capacityData,
      id: capacityRef.id,
      createdAt: new Date(),
      active: true
    };
    await setDoc(capacityRef, capacityWithId);
    return capacityWithId;
  } catch (error) {
    console.error('Error saving drum capacity:', error);
    throw error;
  }
};

// Update drum capacity (admin function)
export const updateDrumCapacity = async (id: string, capacityData: { name: string; value: number }) => {
  try {
    const capacityRef = doc(db, 'drumCapacities', id);
    await updateDoc(capacityRef, {
      ...capacityData,
      updatedAt: new Date()
    });
  } catch (error) {
    console.error('Error updating drum capacity:', error);
    throw error;
  }
};

// Delete drum capacity (admin function)
export const deleteDrumCapacity = async (id: string) => {
  try {
    const capacityRef = doc(db, 'drumCapacities', id);
    await updateDoc(capacityRef, {
      active: false,
      deletedAt: new Date()
    });
  } catch (error) {
    console.error('Error deleting drum capacity:', error);
    throw error;
  }
};

// ── Customer Types ──────────────────────────────────────────────────────────

export const getAllCustomerTypes = async () => {
  try {
    const snap = await getDocs(query(collection(db, 'customerTypes'), orderBy('name')));
    return snap.docs
      .map(d => ({ id: d.id, ...(d.data() as any) }))
      .filter((d: any) => d.active !== false);
  } catch (error) {
    console.error('Error getting customer types:', error);
    throw error;
  }
};

export const saveCustomerType = async (data: { name: string; description?: string }) => {
  try {
    const ref = doc(collection(db, 'customerTypes'));
    const record = { id: ref.id, name: data.name, description: data.description || '', active: true, createdAt: new Date() };
    await setDoc(ref, record);
    return record;
  } catch (error) {
    console.error('Error saving customer type:', error);
    throw error;
  }
};

export const updateCustomerType = async (id: string, data: { name?: string; description?: string }) => {
  try {
    await updateDoc(doc(db, 'customerTypes', id), { ...data, updatedAt: new Date() });
  } catch (error) {
    console.error('Error updating customer type:', error);
    throw error;
  }
};

export const deleteCustomerType = async (id: string) => {
  try {
    await updateDoc(doc(db, 'customerTypes', id), { active: false, deletedAt: new Date() });
  } catch (error) {
    console.error('Error deleting customer type:', error);
    throw error;
  }
};

// Save drum supply transaction - Direct to branch tanks (no tanker deduction)
export const saveDrumSupplyTransaction = async (transactionData: any) => {
  try {
    const driverUid = transactionData.driverUid || getCurrentUserId();
    const supplyQuantity = transactionData.numberOfDrums * transactionData.drumCapacity;
    const targetBranchId = transactionData.branchId;
    
    console.log('🛢️ Starting drum supply operation (direct to branch):', {
      driverUid,
      quantity: supplyQuantity,
      drums: transactionData.numberOfDrums,
      capacity: transactionData.drumCapacity,
      targetBranch: targetBranchId
    });
    
    // Get branch data and update tank levels (drums are supplied directly from depot/storage)
    let branchTankBefore = 0;
    let branchTankAfter = 0;
    if (targetBranchId) {
      try {
        const branchDoc = await getDoc(doc(db, 'branches', targetBranchId));
        if (branchDoc.exists()) {
          const branchData = branchDoc.data();
          const oilTanks = branchData.oilTanks || [];
          
          // Find matching tank for the oil type
          let selectedTankIndex = -1;
          for (let i = 0; i < oilTanks.length; i++) {
            if (oilTanks[i].oilTypeId === transactionData.oilTypeId) {
              selectedTankIndex = i;
              break;
            }
          }
          
          if (selectedTankIndex === -1) {
            throw new Error(`No tank found for oil type: ${transactionData.oilTypeName || 'Unknown'}`);
          }
          
          const targetTank = oilTanks[selectedTankIndex];
          branchTankBefore = targetTank.currentLevel || 0;
          let newLevel = branchTankBefore + supplyQuantity;
          
          // Apply capacity limits (cap at tank capacity if exceeded)
          if (newLevel > targetTank.capacity) {
            console.log('⚠️ Tank capacity would be exceeded, capping at maximum:', {
              tankCapacity: targetTank.capacity,
              beforeLevel: branchTankBefore,
              requestedQuantity: supplyQuantity,
              cappedLevel: targetTank.capacity
            });
            newLevel = targetTank.capacity; // Cap at capacity
          }
          branchTankAfter = newLevel;
          
          // Update the tank
          const updatedTanks = [...oilTanks];
          updatedTanks[selectedTankIndex] = {
            ...targetTank,
            currentLevel: newLevel,
            lastUpdated: new Date()
          };
          
          await updateDoc(doc(db, 'branches', targetBranchId), {
            oilTanks: updatedTanks,
            updatedAt: new Date()
          });
          
          console.log('✅ Branch tank updated for drum supply (direct):', {
            branchId: targetBranchId,
            tankIndex: selectedTankIndex,
            beforeLevel: branchTankBefore,
            afterLevel: branchTankAfter,
            quantityAdded: supplyQuantity,
            capped: newLevel === targetTank.capacity
          });
        }
      } catch (error) {
        console.error('Error updating branch tank for drum supply:', error);
        throw error;
      }
    }
    
    // Save transaction with inventory tracking (drums don't affect tanker)
    const transactionRef = doc(collection(db, 'transactions'));
    const transactionWithId = {
      ...transactionData,
      id: transactionRef.id,
      type: 'supply',
      supplyType: 'drum', // Drum supply
      quantity: supplyQuantity, // Total liters supplied
      createdAt: new Date(),
      timestamp: new Date(),
      // Structure photos object properly for transaction history and reports
      photos: {
        beforeTankPhoto: transactionData.beforeTankPhoto,
        drumsPhoto: transactionData.drumsPhoto,
        hoseConnectionPhoto: transactionData.hoseConnectionPhoto,
        afterTankPhoto: transactionData.afterTankPhoto
      },
      // Inventory tracking fields (no tanker involvement for drums)
      tankerBefore: 'N/A', // Drums don't come from tanker
      tankerAfter: 'N/A',  // Drums don't affect tanker
      branchTankBefore,
      branchTankAfter,
      inventoryUpdated: true
    };
    
    await setDoc(transactionRef, transactionWithId);
    
    console.log('✅ Drum supply transaction saved (direct to branch):', {
      transactionId: transactionWithId.id,
      quantity: supplyQuantity,
      branchTankBefore,
      branchTankAfter,
      inventoryUpdated: true,
      note: 'Drums supplied directly from depot/storage, tanker not affected'
    });
    
    return transactionWithId;
  } catch (error) {
    console.error('❌ Error saving drum supply transaction:', error);
    throw error;
  }
};



// Get recent deliveries from Firestore
export const getRecentDeliveries = async (limit = 5) => {
  try {
    const deliveriesCollection = collection(db, 'deliveries');
    const snapshot = await getDocs(deliveriesCollection);
    const deliveries = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Ensure dates are properly formatted for frontend consumption
        createdAt: data.createdAt?.toDate?.() ? data.createdAt.toDate().toISOString() : 
                  data.createdAt || new Date().toISOString(),
        completedAt: data.completedAt?.toDate?.() ? data.completedAt.toDate().toISOString() : 
                    data.completedAt || new Date().toISOString(),
        timestamp: data.timestamp?.toDate?.() ? data.timestamp.toDate().toISOString() : 
                  data.timestamp || new Date().toISOString()
      };
    });
    
    // Sort by timestamp and limit results
    return deliveries
      .sort((a: any, b: any) => {
        const timeA = new Date(a.timestamp).getTime();
        const timeB = new Date(b.timestamp).getTime();
        return timeB - timeA;
      })
      .slice(0, limit);
  } catch (error) {
    console.error('Error getting recent deliveries:', error);
    return [];
  }
};

// Firestore usage and data management functions (removed duplicate - see new version below)

export const deleteRecordsByDateRange = async (collectionName: string, startDate: Date, endDate: Date) => {
  try {
    console.log(`🗑️ Starting deletion for ${collectionName} from ${startDate.toISOString()} to ${endDate.toISOString()}`);
    
    const collectionRef = collection(db, collectionName);
    
    // Convert dates to Firestore Timestamps for proper comparison
    const startTimestamp = Timestamp.fromDate(startDate);
    const endTimestamp = Timestamp.fromDate(endDate);
    
    const q = query(
      collectionRef,
      where('createdAt', '>=', startTimestamp),
      where('createdAt', '<=', endTimestamp)
    );
    
    const snapshot = await getDocs(q);
    console.log(`📊 Found ${snapshot.docs.length} ${collectionName} records to delete`);
    
    let deletedCount = 0;

    // Delete in batches to avoid timeout
    const batch = writeBatch(db);
    snapshot.docs.forEach((document) => {
      const data = document.data();
      const createdAt = data.createdAt?.toDate?.() || data.createdAt;
      console.log(`📋 Queuing for deletion: ${document.id}, created: ${createdAt}`);
      batch.delete(document.ref);
      deletedCount++;
    });

    if (deletedCount > 0) {
      await batch.commit();
      console.log(`✅ Successfully deleted ${deletedCount} ${collectionName} records`);
    } else {
      console.log(`ℹ️ No ${collectionName} records found to delete in the specified date range`);
    }
    
    return deletedCount;
  } catch (error) {
    console.error(`Error deleting ${collectionName} records by date range:`, error);
    throw error;
  }
};

// Auth state observer
export const onAuthStateChange = (callback: (user: FirebaseUser | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

// Enhanced Task Management with Comments and Documents
export const addTaskComment = async (taskId: string, commentData: any) => {
  try {
    const taskRef = doc(db, 'tasks', taskId);
    const taskSnap = await getDoc(taskRef);
    
    if (!taskSnap.exists()) {
      throw new Error('Task not found');
    }
    
    const currentTask = taskSnap.data();
    const newComment = {
      id: Date.now().toString(),
      text: commentData.text,
      author: commentData.author,
      timestamp: new Date(),
      type: 'comment'
    };
    
    const updatedComments = [...(currentTask.comments || []), newComment];
    
    await updateDoc(taskRef, {
      comments: updatedComments,
      lastUpdated: new Date()
    });
    
    return newComment;
  } catch (error) {
    console.error('Error adding task comment:', error);
    throw error;
  }
};

// Oil Tank Management Functions  
// Enhanced function to update oil tank level with concurrent user support
export const updateOilTankLevel = async (tankId: string, updateData: any) => {
  try {
    console.log('🔧 Starting concurrent-safe tank update:', { tankId, updateData });
    
    // Parse tank ID to extract branch ID and tank index
    const tankIdParts = tankId.split('_tank_');
    if (tankIdParts.length !== 2) {
      throw new Error(`Invalid tank ID format: ${tankId}. Expected format: branchId_tank_index`);
    }
    
    const branchId = tankIdParts[0];
    const tankIndex = parseInt(tankIdParts[1]);
    const branchRef = doc(db, 'branches', branchId);
    
    // OPTIMIZED: Use Firestore transaction for atomic updates with enhanced performance
    const result = await runTransaction(db, async (transaction) => {
      // Read current state
      const branchSnapshot = await transaction.get(branchRef);
      
      if (!branchSnapshot.exists()) {
        throw new Error(`Branch not found: ${branchId}`);
      }
      
      const branchData = branchSnapshot.data();
      const oilTanks = branchData.oilTanks || [];
      
      if (tankIndex < 0 || tankIndex >= oilTanks.length) {
        throw new Error(`Tank index ${tankIndex} out of range. Branch has ${oilTanks.length} tanks.`);
      }
      
      const currentTankData = oilTanks[tankIndex];
      const previousLevel = currentTankData.currentLevel || 0;
      
      // ENHANCED CONFLICT DETECTION with session tracking
      const lastServerUpdate = currentTankData.lastUpdated?.toDate?.() || currentTankData.lastUpdated;
      const clientLastSeen = updateData.lastSeenUpdate ? new Date(updateData.lastSeenUpdate) : null;
      const serverSessionId = currentTankData.sessionId;
      const clientSessionId = updateData.sessionId;
      
      // More robust conflict detection
      if (clientLastSeen && lastServerUpdate && lastServerUpdate > clientLastSeen) {
        // Check if it's the same session (allow retries)
        if (!serverSessionId || !clientSessionId || serverSessionId !== clientSessionId) {
          const conflictError = new Error('CONCURRENT_UPDATE_CONFLICT');
          (conflictError as any).type = 'CONFLICT';
          (conflictError as any).details = {
            serverLevel: currentTankData.currentLevel,
            serverUpdatedBy: currentTankData.lastUpdatedBy,
            serverUpdatedAt: lastServerUpdate,
            clientExpectedLevel: updateData.expectedPreviousLevel,
            serverSessionId,
            clientSessionId
          };
          throw conflictError;
        }
      }
      
      // Validate capacity constraints
      if (updateData.currentLevel > currentTankData.capacity) {
        throw new Error(`Level ${updateData.currentLevel}L exceeds tank capacity ${currentTankData.capacity}L`);
      }
      
      // PERFORMANCE: Add retry counter and timestamp validation
      const isRetry = (updateData.retryCount || 0) > 0;
      const timeSinceLastUpdate = lastServerUpdate ? Date.now() - lastServerUpdate.getTime() : Infinity;
      
      console.log('🔄 Transaction: Updating tank with conflict check passed:', {
        branchName: branchData.name,
        tankIndex,
        previousLevel,
        newLevel: updateData.currentLevel,
        updatedBy: updateData.lastUpdatedBy
      });
      
      // Fetch oil type name
      let oilTypeName = 'Unknown Oil Type';
      if (currentTankData.oilTypeId) {
        try {
          const oilTypeRef = doc(db, 'oilTypes', currentTankData.oilTypeId);
          const oilTypeSnapshot = await transaction.get(oilTypeRef);
          if (oilTypeSnapshot.exists()) {
            oilTypeName = oilTypeSnapshot.data().name || oilTypeName;
          }
        } catch (error) {
          console.warn('Could not fetch oil type name:', error);
        }
      }
      
      // Create updated tank data with version control (filter out undefined values)
      const updatedTanks = [...oilTanks];
      const now = new Date();
      
      // Filter out undefined values from updateData to prevent Firebase errors
      const cleanUpdateData = Object.fromEntries(
        Object.entries(updateData).filter(([_, value]) => value !== undefined)
      );
      
      // Determine timestamp update logic
      // User request: "Last updated" should only reflect LEVEL updates, not Daily Usage updates
      const isDailyUsageUpdate = updateData.updateType === 'daily_usage';
      const levelChanged = updateData.currentLevel !== previousLevel;
      const shouldUpdateTimestamp = !isDailyUsageUpdate || levelChanged;
      
      const newLastUpdated = shouldUpdateTimestamp ? now : currentTankData.lastUpdated;

      updatedTanks[tankIndex] = {
        ...currentTankData,
        ...cleanUpdateData,
        lastUpdated: newLastUpdated,
        updateVersion: (currentTankData.updateVersion || 0) + 1,
        lastConflictCheck: now
      };
      
      // Update branch document atomically
      transaction.update(branchRef, {
        oilTanks: updatedTanks,
        updatedAt: now,
        lastTankUpdate: shouldUpdateTimestamp ? now : (branchData.lastTankUpdate || now)
      });
      
      // Create comprehensive log entry
      const logEntry = {
        tankId: tankId,
        branchId: branchId,
        oilTypeId: currentTankData.oilTypeId || '',
        branchName: branchData.name || 'Unknown Branch',
        oilTypeName: oilTypeName,
        previousLevel: previousLevel,
        newLevel: updateData.currentLevel,
        levelDifference: updateData.currentLevel - previousLevel,
        updatedBy: updateData.lastUpdatedBy,
        updatedAt: now,
        notes: updateData.notes || '',
        updateType: updateData.updateType || 'manual',
        updateVersion: updatedTanks[tankIndex].updateVersion,
        photos: {
          gaugePhoto: updateData.tankGaugePhoto || '',
          systemPhoto: updateData.systemScreenPhoto || ''
        },
        metadata: {
          userAgent: updateData.userAgent || '',
          sessionId: updateData.sessionId || '',
          concurrent: updateData.concurrent || false
        }
      };
      
      // Add to tankUpdateLogs collection
      const logRef = doc(collection(db, 'tankUpdateLogs'));
      transaction.set(logRef, logEntry);
      
      return {
        success: true,
        tankId: tankId,
        previousLevel: previousLevel,
        newLevel: updateData.currentLevel,
        levelDifference: updateData.currentLevel - previousLevel,
        updatedAt: now,
        updateVersion: updatedTanks[tankIndex].updateVersion,
        logId: logRef.id,
        branchName: branchData.name
      };
    });
    
    console.log('✅ Concurrent-safe tank update completed:', result);
    return result;
    
  } catch (error: any) {
    console.error('❌ Error in concurrent tank update:', error);
    
    // Enhanced error handling for different scenarios
    if (error.message === 'CONCURRENT_UPDATE_CONFLICT') {
      console.warn('⚠️ Concurrent update conflict detected:', error.conflictDetails);
      throw {
        type: 'CONFLICT',
        message: 'Tank was updated by another user. Please refresh and try again.',
        details: error.conflictDetails,
        retryable: true
      };
    }
    
    if (error.code === 'aborted') {
      console.warn('⚠️ Transaction aborted due to conflict, retry recommended');
      throw {
        type: 'TRANSACTION_ABORTED',
        message: 'Update failed due to concurrent modifications. Please try again.',
        retryable: true
      };
    }
    
    throw error;
  }
};

// Real-time listener for tank updates
export const subscribeToTankUpdates = (branchId: string, callback: (tanks: any[]) => void) => {
  const branchRef = doc(db, 'branches', branchId);
  
  return onSnapshot(branchRef, (snapshot) => {
    if (snapshot.exists()) {
      const branchData = snapshot.data();
      const tanks = branchData.oilTanks || [];
      callback(tanks);
    }
  }, (error) => {
    console.error('Error subscribing to tank updates:', error);
  });
};

// Create oil tank for branch
export const createOilTank = async (branchId: string, oilTypeId: string, capacity: number, tankName?: string) => {
  try {
    const tankRef = doc(collection(db, 'oilTanks'));
    const tankData = {
      id: tankRef.id,
      branchId: branchId,
      oilTypeId: oilTypeId,
      capacity: capacity,
      currentLevel: 0,
      tankName: tankName || `Tank-${Date.now()}`,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await setDoc(tankRef, tankData);
    console.log('Oil tank created successfully:', tankData);
    return tankData;
  } catch (error) {
    console.error('Error creating oil tank:', error);
    throw error;
  }
};

// Get oil tanks for specific branches
export const getOilTanksForBranches = async (branchIds: string[]) => {
  try {
    if (!branchIds || branchIds.length === 0) {
      return [];
    }
    
    const tanksCollection = collection(db, 'oilTanks');
    const q = query(tanksCollection, where('branchId', 'in', branchIds), where('active', '==', true));
    const snapshot = await getDocs(q);
    
    const tanks = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log('Oil tanks found for branches:', tanks);
    return tanks;
  } catch (error) {
    console.error('Error getting oil tanks for branches:', error);
    return [];
  }
};

// Create sample tank data for testing
// Function to fix existing tank capacities
export const fixExistingTankCapacities = async () => {
  try {
    console.log('Fixing existing tank capacities...');
    
    // Get all existing tanks
    const tanksSnapshot = await getDocs(collection(db, 'oilTanks'));
    const oilTypes = await getAllOilTypes();
    
    const defaultCapacities = {
      'Synthetic Oil': 12000,
      'Mineral Oil': 6000,
      'Engine Oil': 8000,
      'Gear Oil': 4000,
      'Hydraulic Oil': 5000,
      'Diesel Oil': 10000
    };
    
    let updatedCount = 0;
    
    for (const tankDoc of tanksSnapshot.docs) {
      const tankData = tankDoc.data();
      const oilType = oilTypes.find((ot: any) => ot.id === tankData.oilTypeId);
      
      if (oilType) {
        const correctCapacity = defaultCapacities[oilType.name as keyof typeof defaultCapacities] || 8000;
        
        // Update if capacity is different
        if (tankData.capacity !== correctCapacity) {
          await updateDoc(doc(db, 'oilTanks', tankDoc.id), {
            capacity: correctCapacity,
            updatedAt: new Date()
          });
          
          console.log(`Updated tank ${tankDoc.id} (${oilType.name}): ${tankData.capacity}L → ${correctCapacity}L`);
          updatedCount++;
        }
      }
    }
    
    console.log(`✅ Fixed ${updatedCount} tank capacities`);
    return updatedCount;
  } catch (error) {
    console.error('Error fixing tank capacities:', error);
    throw error;
  }
};

export const createSampleTanks = async (branchId: string, oilTypes: any[]) => {
  try {
    console.log('Creating sample tanks for branch:', branchId, 'with oil types:', oilTypes);
    
    // Use realistic oil tank capacities that match admin expectations
    const defaultCapacities = {
      'Synthetic Oil': 12000,
      'Mineral Oil': 6000,
      'Engine Oil': 8000,
      'Gear Oil': 4000,
      'Hydraulic Oil': 5000,
      'Diesel Oil': 10000
    };
    
    const tanksToCreate = oilTypes.slice(0, 5).map((oilType) => {
      // Use predefined capacity for known oil types, fallback to 8000L for others
      const capacity = defaultCapacities[oilType.name as keyof typeof defaultCapacities] || 8000;
      
      return {
        branchId: branchId,
        oilTypeId: oilType.id,
        capacity: capacity,
        tankName: `${oilType.name} Tank`
      };
    });
    
    const createdTanks = [];
    for (const tankData of tanksToCreate) {
      const tank = await createOilTank(tankData.branchId, tankData.oilTypeId, tankData.capacity, tankData.tankName);
      createdTanks.push(tank);
    }
    
    console.log('Sample tanks created with proper capacities:', createdTanks);
    return createdTanks;
  } catch (error) {
    console.error('Error creating sample tanks:', error);
    throw error;
  }
};

// Removed duplicate getAllTransactions - using existing one

export const uploadPhoto = async (file: File, folder: string = 'photos') => {
  try {
    const timestamp = new Date().getTime();
    const fileName = `${timestamp}_${file.name}`;
    const photoRef = ref(storage, `${folder}/${fileName}`);
    
    await uploadBytes(photoRef, file);
    const downloadURL = await getDownloadURL(photoRef);
    
    console.log('Photo uploaded successfully:', downloadURL);
    return downloadURL;
  } catch (error) {
    console.error('Error uploading photo:', error);
    throw error;
  }
};

// Function to manually create/update a user in Firestore (for admin use)
export const createUserInDatabase = async (userData: any) => {
  try {
    const userRef = doc(db, 'users', userData.uid);
    await setDoc(userRef, {
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date(),
      active: true
    }, { merge: true });
    
    console.log('User created/updated in database:', userData.email);
    return userData;
  } catch (error) {
    console.error('Error creating user in database:', error);
    throw error;
  }
};

// Function to fix Husain's account specifically
export const fixHusainAccount = async () => {
  try {
    // First, get Husain's Firebase Auth user if exists
    const { createUserWithEmailAndPassword } = await import('firebase/auth');
    
    let husainUid = 'husain-branch-user-uid'; // Fallback UID
    
    // Try to create Firebase Auth user for Husain (this will fail if already exists)
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, 'husain.m@ekkanoo.com.bh', 'husain123');
      husainUid = userCredential.user.uid;
      console.log('✅ Created Firebase Auth user for Husain:', husainUid);
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        console.log('ℹ️ Husain already has Firebase Auth account, updating database record...');
        // Get existing user UID from Firebase Auth
        // For now, we'll use a fixed UID or you can implement a lookup
        husainUid = 'existing-husain-uid'; // This should be replaced with actual lookup
      } else {
        console.error('Error creating Firebase Auth for Husain:', error);
      }
    }
    
    // Create/update Husain's database record
    const husainData = {
      uid: husainUid,
      email: 'husain.m@ekkanoo.com.bh',
      role: 'branch_user',
      displayName: 'Husain Manager',
      active: true,
      branchIds: ['branch-arad', 'branch-main-tank'], // Arad & Main Tank
      createdAt: new Date(),
      lastLoginAt: new Date()
    };
    
    await createUserInDatabase(husainData);
    console.log('✅ Husain account fixed successfully');
    return husainData;
    
  } catch (error) {
    console.error('Error fixing Husain account:', error);
    throw error;
  }
};

export const updateTaskStatus = async (taskId: string, newStatus: string, adminUser: any) => {
  try {
    const taskRef = doc(db, 'tasks', taskId);
    const taskSnap = await getDoc(taskRef);
    
    if (!taskSnap.exists()) {
      throw new Error('Task not found');
    }
    
    const currentTask = taskSnap.data();
    
    // Add status change to history
    const statusLog = {
      id: Date.now().toString(),
      text: `Status changed from "${currentTask.status}" to "${newStatus}"`,
      author: adminUser.displayName || adminUser.email,
      timestamp: new Date(),
      type: 'status_change',
      oldStatus: currentTask.status,
      newStatus: newStatus
    };
    
    const updatedComments = [...(currentTask.comments || []), statusLog];
    
    await updateDoc(taskRef, {
      status: newStatus,
      comments: updatedComments,
      lastUpdated: new Date(),
      updatedBy: adminUser.uid
    });
    
    return statusLog;
  } catch (error) {
    console.error('Error updating task status:', error);
    throw error;
  }
};

export const addTaskDocument = async (taskId: string, documentData: any) => {
  try {
    const taskRef = doc(db, 'tasks', taskId);
    const taskSnap = await getDoc(taskRef);
    
    if (!taskSnap.exists()) {
      throw new Error('Task not found');
    }
    
    const currentTask = taskSnap.data();
    const newDocument = {
      id: Date.now().toString(),
      name: documentData.name,
      url: documentData.url,
      type: documentData.type,
      size: documentData.size,
      uploadedBy: documentData.uploadedBy,
      uploadedAt: new Date()
    };
    
    const updatedDocuments = [...(currentTask.documents || []), newDocument];
    
    // Add document upload log
    const documentLog = {
      id: (Date.now() + 1).toString(),
      text: `Document "${documentData.name}" uploaded`,
      author: documentData.uploadedBy,
      timestamp: new Date(),
      type: 'document_upload'
    };
    
    const updatedComments = [...(currentTask.comments || []), documentLog];
    
    await updateDoc(taskRef, {
      documents: updatedDocuments,
      comments: updatedComments,
      lastUpdated: new Date()
    });
    
    return { document: newDocument, log: documentLog };
  } catch (error) {
    console.error('Error adding task document:', error);
    throw error;
  }
};

export const deleteTaskDocument = async (taskId: string, documentId: string) => {
  try {
    const taskRef = doc(db, 'tasks', taskId);
    const taskSnap = await getDoc(taskRef);
    
    if (!taskSnap.exists()) {
      throw new Error('Task not found');
    }
    
    const currentTask = taskSnap.data();
    const currentDocuments = currentTask.documents || [];
    
    // Find the document to delete to get its name for logging
    const documentToDelete = currentDocuments.find((doc: any) => doc.id === documentId);
    
    if (!documentToDelete) {
      throw new Error('Document not found');
    }
    
    // Remove the document from the array
    const updatedDocuments = currentDocuments.filter((doc: any) => doc.id !== documentId);
    
    // Add document deletion log
    const deletionLog = {
      id: Date.now().toString(),
      text: `Document "${documentToDelete.name}" deleted`,
      author: 'System', // This could be passed as a parameter if needed
      timestamp: new Date(),
      type: 'document_delete'
    };
    
    const updatedComments = [...(currentTask.comments || []), deletionLog];
    
    await updateDoc(taskRef, {
      documents: updatedDocuments,
      comments: updatedComments,
      lastUpdated: new Date()
    });
    
    return { deletedDocument: documentToDelete, log: deletionLog };
  } catch (error) {
    console.error('Error deleting task document:', error);
    throw error;
  }
};

// Enhanced Complaint Management with Comments and Documents
export const addComplaintComment = async (complaintId: string, commentData: any) => {
  try {
    const complaintRef = doc(db, 'complaints', complaintId);
    const complaintSnap = await getDoc(complaintRef);
    
    if (!complaintSnap.exists()) {
      throw new Error('Complaint not found');
    }
    
    const currentComplaint = complaintSnap.data();
    const newComment = {
      id: Date.now().toString(),
      text: commentData.text,
      author: commentData.author,
      timestamp: new Date(),
      type: 'comment'
    };
    
    const updatedComments = [...(currentComplaint.comments || []), newComment];
    
    await updateDoc(complaintRef, {
      comments: updatedComments,
      lastUpdated: new Date()
    });
    
    return newComment;
  } catch (error) {
    console.error('Error adding complaint comment:', error);
    throw error;
  }
};

export const updateComplaintStatus = async (complaintId: string, newStatus: string, adminUser: any) => {
  try {
    const complaintRef = doc(db, 'complaints', complaintId);
    const complaintSnap = await getDoc(complaintRef);
    
    if (!complaintSnap.exists()) {
      throw new Error('Complaint not found');
    }
    
    const currentComplaint = complaintSnap.data();
    
    // Add status change to history
    const statusLog = {
      id: Date.now().toString(),
      text: `Status changed from "${currentComplaint.status}" to "${newStatus}"`,
      author: adminUser.displayName || adminUser.email,
      timestamp: new Date(),
      type: 'status_change',
      oldStatus: currentComplaint.status,
      newStatus: newStatus
    };
    
    const updatedComments = [...(currentComplaint.comments || []), statusLog];
    
    await updateDoc(complaintRef, {
      status: newStatus,
      comments: updatedComments,
      lastUpdated: new Date(),
      updatedBy: adminUser.uid
    });
    
    return statusLog;
  } catch (error) {
    console.error('Error updating complaint status:', error);
    throw error;
  }
};

export const addComplaintDocument = async (complaintId: string, documentData: any) => {
  try {
    const complaintRef = doc(db, 'complaints', complaintId);
    const complaintSnap = await getDoc(complaintRef);
    
    if (!complaintSnap.exists()) {
      throw new Error('Complaint not found');
    }
    
    const currentComplaint = complaintSnap.data();
    const newDocument = {
      id: Date.now().toString(),
      name: documentData.name,
      url: documentData.url,
      type: documentData.type,
      size: documentData.size,
      uploadedBy: documentData.uploadedBy,
      uploadedAt: new Date()
    };
    
    const updatedDocuments = [...(currentComplaint.documents || []), newDocument];
    
    // Add document upload log
    const documentLog = {
      id: (Date.now() + 1).toString(),
      text: `Document "${documentData.name}" uploaded`,
      author: documentData.uploadedBy,
      timestamp: new Date(),
      type: 'document_upload'
    };
    
    const updatedComments = [...(currentComplaint.comments || []), documentLog];
    
    await updateDoc(complaintRef, {
      documents: updatedDocuments,
      comments: updatedComments,
      lastUpdated: new Date()
    });
    
    return { document: newDocument, log: documentLog };
  } catch (error) {
    console.error('Error adding complaint document:', error);
    throw error;
  }
};

// Firebase Usage Monitoring - Real Data Only
export const getFirestoreUsage = async () => {
  try {
    // Get all collections that contribute to Firebase billing
    const [complaints, users, tasks, transactions, deliveries, branches, oilTypes, loadSessions] = await Promise.all([
      getAllComplaints(),
      getAllUsers(), 
      getAllTasks(),
      getAllTransactions(),
      getAllDeliveries(),
      getAllBranches(),
      getAllOilTypes(),
      getDocs(collection(db, 'loadSessions')).then(snapshot => snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))
    ]);

    // Calculate actual document counts by collection
    const collectionCounts = {
      complaints: complaints.length,
      users: users.length,
      tasks: tasks.length,
      transactions: transactions.length,
      deliveries: deliveries.length,
      branches: branches.length,
      oilTypes: oilTypes.length,
      loadSessions: loadSessions.length
    };

    const totalDocuments = Object.values(collectionCounts).reduce((sum, count) => sum + count, 0);
    
    // Calculate estimated storage size based on actual data structure
    const avgDocSize = 2; // KB per document (realistic estimate)
    const totalStorageKB = totalDocuments * avgDocSize;
    
    // Count photo/media files in complaints and deliveries
    let totalPhotos = 0;
    let estimatedPhotoStorageMB = 0;
    
    complaints.forEach((complaint: any) => {
      if (complaint.photos?.length) {
        totalPhotos += complaint.photos.length;
        estimatedPhotoStorageMB += complaint.photos.length * 0.5; // 500KB per photo average
      }
    });
    
    deliveries.forEach((delivery: any) => {
      const photoFields = ['tankLevelPhoto', 'hoseConnectionPhoto', 'finalTankLevelPhoto', 'meterReadingPhoto'];
      photoFields.forEach(field => {
        if (delivery[field]) {
          totalPhotos++;
          estimatedPhotoStorageMB += 0.5;
        }
      });
    });

    return {
      firestore: {
        collections: collectionCounts,
        totalDocuments: totalDocuments,
        storage: `${totalStorageKB.toFixed(1)} KB`,
        avgDocSize: `${avgDocSize} KB`
      },
      storage: {
        photos: totalPhotos,
        estimatedPhotoStorage: `${estimatedPhotoStorageMB.toFixed(1)} MB`,
        totalEstimatedStorage: `${(totalStorageKB / 1024 + estimatedPhotoStorageMB).toFixed(1)} MB`
      },
      authentication: {
        totalUsers: users.length,
        activeUsers: users.filter((u: any) => u.active !== false).length,
        adminUsers: users.filter((u: any) => u.role === 'admin').length,
        driverUsers: users.filter((u: any) => u.role === 'driver').length
      },
      dataBreakdown: {
        operational: {
          deliveries: deliveries.length,
          complaints: complaints.length,
          loadSessions: loadSessions.length
        },
        configuration: {
          branches: branches.length,
          oilTypes: oilTypes.length,
          users: users.length
        },
        management: {
          tasks: tasks.length,
          transactions: transactions.length
        }
      },
      lastUpdated: new Date().toISOString(),
      note: "Real usage data from your Firebase project - no billing amounts shown"
    };
  } catch (error) {
    console.error("Error calculating Firebase usage:", error);
    throw error;
  }
};

// Transaction Editing Functions

export const updateTransaction = async (updateData: any) => {
  try {
    const transactionRef = doc(db, 'transactions', updateData.id);
    
    // Remove the id field from update data
    const { id, ...dataToUpdate } = updateData;
    
    // Add update timestamp
    const updatedData = {
      ...dataToUpdate,
      updatedAt: new Date(),
      lastEditedAt: new Date()
    };
    
    await updateDoc(transactionRef, updatedData);
    console.log('Transaction updated successfully:', updateData.id);
    return true;
  } catch (error) {
    console.error('Error updating transaction:', error);
    throw error;
  }
};

export const createTransactionEditHistory = async (editHistoryData: any) => {
  try {
    const editHistoryRef = doc(collection(db, 'transactionEditHistory'));
    const editHistoryWithId = {
      ...editHistoryData,
      id: editHistoryRef.id,
      createdAt: new Date()
    };
    
    await setDoc(editHistoryRef, editHistoryWithId);
    console.log('Transaction edit history created:', editHistoryWithId);
    return editHistoryWithId;
  } catch (error) {
    console.error('Error creating transaction edit history:', error);
    throw error;
  }
};

export const getTransactionEditHistory = async (transactionId: string) => {
  try {
    const editHistoryQuery = query(
      collection(db, 'transactionEditHistory'),
      where('transactionId', '==', transactionId),
      orderBy('editedAt', 'desc')
    );
    
    const snapshot = await getDocs(editHistoryQuery);
    const editHistory = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return editHistory;
  } catch (error) {
    console.error('Error fetching transaction edit history:', error);
    throw error;
  }
};

export const calculateInventoryImpact = async (impactData: {
  transactionId: string;
  originalQuantity: number;
  newQuantity: number;
  branchId?: string;
  oilTypeId?: string;
  transactionType: string;
}) => {
  try {
    const { originalQuantity, newQuantity, branchId, oilTypeId, transactionType } = impactData;
    const quantityDifference = newQuantity - originalQuantity;
    
    const impact = {
      quantityDifference,
      hasWarnings: false,
      warnings: [] as string[],
      branchImpact: null as any,
      affectedTanks: [] as any[]
    };
    
    // If no quantity change, no impact
    if (quantityDifference === 0) {
      return impact;
    }
    
    // For branch transactions, check branch tank levels
    if (branchId && oilTypeId) {
      try {
        const branchDoc = await getDoc(doc(db, 'branches', branchId));
        if (branchDoc.exists()) {
          const branchData = branchDoc.data();
          const oilTanks = branchData.oilTanks || [];
          
          // Find relevant tank
          const relevantTank = oilTanks.find((tank: any) => tank.oilTypeId === oilTypeId);
          
          if (relevantTank) {
            const currentLevel = relevantTank.currentLevel || 0;
            const capacity = relevantTank.capacity || 0;
            
            let newLevel = currentLevel;
            
            // Calculate impact based on transaction type
            if (transactionType === 'supply') {
              // Supply increases branch tank level
              newLevel = currentLevel + quantityDifference;
              
              if (newLevel > capacity) {
                impact.hasWarnings = true;
                impact.warnings.push(`Tank will exceed capacity by ${(newLevel - capacity).toFixed(2)}L`);
              }
              if (newLevel < 0) {
                impact.hasWarnings = true;
                impact.warnings.push(`Tank level will go negative by ${Math.abs(newLevel).toFixed(2)}L`);
              }
            } else if (transactionType === 'loading') {
              // Loading decreases source tank level
              newLevel = currentLevel - quantityDifference;
              
              if (newLevel < 0) {
                impact.hasWarnings = true;
                impact.warnings.push(`Source tank will go negative by ${Math.abs(newLevel).toFixed(2)}L`);
              }
            }
            
            impact.branchImpact = {
              branchName: branchData.name,
              tankName: relevantTank.name,
              currentLevel,
              newLevel,
              capacity,
              percentChange: capacity > 0 ? ((newLevel - currentLevel) / capacity * 100).toFixed(1) : '0'
            };
            
            impact.affectedTanks.push(relevantTank);
          } else {
            impact.hasWarnings = true;
            impact.warnings.push(`No tank found for selected oil type in branch`);
          }
        }
      } catch (error) {
        console.error('Error checking branch tank levels:', error);
        impact.hasWarnings = true;
        impact.warnings.push('Unable to verify branch tank levels');
      }
    }
    
    return impact;
  } catch (error) {
    console.error('Error calculating inventory impact:', error);
    throw error;
  }
};

export const getCurrentUser = async () => {
  try {
    // Use the exported auth instance instead of creating a new one
    return auth.currentUser;
  } catch (error) {
    console.error("Error getting current user:", error);
    throw error;
  }
};