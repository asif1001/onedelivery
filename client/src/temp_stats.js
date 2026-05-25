// Simple script to get Firebase stats
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const config = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  authDomain: `${process.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || `${process.env.VITE_FIREBASE_PROJECT_ID}.firebasestorage.app`,
  messagingSenderId: "136339484143",
  appId: process.env.VITE_FIREBASE_APP_ID
};

async function getStats() {
  const app = initializeApp(config);
  const db = getFirestore(app);
  
  const collections = ['complaints', 'users', 'tasks', 'transactions', 'deliveries', 'branches', 'oilTypes', 'loadSessions'];
  const stats = {};
  
  for (const collectionName of collections) {
    try {
      const snapshot = await getDocs(collection(db, collectionName));
      stats[collectionName] = snapshot.size;
    } catch (error) {
      stats[collectionName] = 0;
    }
  }
  
  return stats;
}

getStats().then(stats => {
  console.log('=== FIRESTORE COLLECTIONS SUMMARY ===');
  console.log('');
  console.log('📊 Collection Document Counts:');
  Object.entries(stats).forEach(([collection, count]) => {
    console.log(`  ${collection.padEnd(15)}: ${count} documents`);
  });
  console.log('');
  const total = Object.values(stats).reduce((sum, count) => sum + count, 0);
  console.log(`📈 Total Documents: ${total}`);
  console.log(`💾 Database Storage: ~${(total * 2).toFixed(1)} KB`);
  process.exit(0);
}).catch(error => {
  console.error('Error:', error.message);
  process.exit(1);
});
