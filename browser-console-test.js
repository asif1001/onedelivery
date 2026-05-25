// Paste this in your browser console (F12) to test Firebase rules
// This will confirm if rules are fixed

console.log('🔄 Testing Firestore access...');

// Import Firebase modules
import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js').then(({ initializeApp }) => {
  import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js').then(({ getFirestore, collection, getDocs }) => {
    
    const firebaseConfig = {
      apiKey: "AIzaSyBYlgPrP-2kL6bRZShHUH2ht_bODXG3kOY",
      authDomain: "oil-delivery-6bcc4.firebaseapp.com",
      projectId: "oil-delivery-6bcc4"
    };

    const app = initializeApp(firebaseConfig, 'test-' + Date.now());
    const db = getFirestore(app);
    
    // Test reading branches
    getDocs(collection(db, 'branches')).then(snapshot => {
      console.log('✅ BRANCHES FOUND:', snapshot.size);
      snapshot.forEach(doc => {
        console.log('📍 Branch:', doc.data().name || doc.data());
      });
    }).catch(error => {
      console.log('❌ BRANCHES ERROR:', error.code);
    });
    
    // Test reading oil types
    getDocs(collection(db, 'oilTypes')).then(snapshot => {
      console.log('✅ OIL TYPES FOUND:', snapshot.size);
      snapshot.forEach(doc => {
        console.log('⛽ Oil Type:', doc.data().name || doc.data());
      });
    }).catch(error => {
      console.log('❌ OIL TYPES ERROR:', error.code);
    });
    
    // Test reading users/drivers
    getDocs(collection(db, 'users')).then(snapshot => {
      console.log('✅ DRIVERS FOUND:', snapshot.size);
      snapshot.forEach(doc => {
        const data = doc.data();
        console.log('👤 Driver:', data.displayName || data.name || data.email);
      });
    }).catch(error => {
      console.log('❌ DRIVERS ERROR:', error.code);
    });
    
  });
});

console.log('If you see permission-denied errors, update Firestore rules!');
console.log('Link: https://console.firebase.google.com/project/oil-delivery-6bcc4/firestore/rules');