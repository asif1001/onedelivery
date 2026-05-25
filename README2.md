# Branch Monitoring Application - Data Retrieval & Display Documentation

This documentation provides a comprehensive guide to the data retrieval and display implementation for the Branch Monitoring Application. It is designed to assist developers in replicating this functionality in a separate application using the existing Firebase database.

## 1. Firebase Database Integration

### Configuration
The application uses the standard Firebase Web SDK configuration. 

**Required Environment Variables:**
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_bucket_id
VITE_FIREBASE_APP_ID=your_app_id
```

### SDK Initialization
Initialize Firebase in your application entry point or a dedicated service file (e.g., `firebase.ts`).

```typescript
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: `${process.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || `${process.env.VITE_FIREBASE_PROJECT_ID}.firebasestorage.app`,
  messagingSenderId: "471045954402", // Constant for this project
  appId: process.env.VITE_FIREBASE_APP_ID,
  measurementId: "G-MN3EY8Y8X0" // Constant for this project
};

// Initialize only if not already initialized
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app);
```

### Database Reference Paths

| Data Type | Firestore Path | Description |
|-----------|---------------|-------------|
| **Branch Info** | `branches/{branchId}` | Stores branch details (name, location) and nested `oilTanks` array. |
| **Oil Tanks** | `branches/{branchId}` (field: `oilTanks`) | Array of tank objects containing `currentLevel`, `capacity`, `oilTypeId`. |
| **Manual Logs** | `tankUpdateLogs` | Collection storing history of manual tank level updates. |
| **Transactions** | `transactions` | Collection storing supply and loading events. |

---

## 2. Data Retrieval Process

### Branch & Tank Data
Tank data is embedded directly within branch documents.

**Fetch Method:**
```typescript
import { collection, getDocs, onSnapshot } from 'firebase/firestore';

// One-time fetch
const fetchBranches = async () => {
  const snapshot = await getDocs(collection(db, 'branches'));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Real-time listener (Recommended for monitoring)
const subscribeToBranch = (branchId, callback) => {
  return onSnapshot(doc(db, 'branches', branchId), (doc) => {
    if (doc.exists()) callback({ id: doc.id, ...doc.data() });
  });
};
```

### Data Structures

**Branch Document Schema:**
```typescript
interface Branch {
  id: string;
  name: string;      // e.g., "Main Tanks Plaza"
  location: string;  // e.g., "Warehouse"
  oilTanks: OilTank[];
}

interface OilTank {
  id: string;        // e.g., "branchId_tank_0"
  oilTypeId: string; // Link to oilTypes collection
  oilTypeName: string;
  currentLevel: number; // Current liters
  capacity: number;     // Max liters
  lastUpdated: Timestamp;
  lastUpdatedBy: string;
}
```

### Historical Data (Last 30 Days)
To calculate update status and consumption trends, fetch recent logs.

**Query Method:**
```typescript
import { query, collection, where, orderBy, limit } from 'firebase/firestore';

const fetchRecentLogs = async (branchId) => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Manual Updates
  const logsQuery = query(
    collection(db, 'tankUpdateLogs'),
    where('branchId', '==', branchId),
    where('updatedAt', '>=', thirtyDaysAgo),
    orderBy('updatedAt', 'desc'),
    limit(50)
  );
  
  // Supply/Loading Transactions
  const txnsQuery = query(
    collection(db, 'transactions'),
    where('branchId', '==', branchId),
    where('timestamp', '>=', thirtyDaysAgo), // Note: Check 'timestamp' or 'createdAt'
    orderBy('timestamp', 'desc'),
    limit(50)
  );

  const [logsSnap, txnsSnap] = await Promise.all([getDocs(logsQuery), getDocs(txnsQuery)]);
  return {
    manualUpdates: logsSnap.docs.map(d => d.data()),
    transactions: txnsSnap.docs.map(d => d.data())
  };
};
```

---

## 3. Display Implementation

### UI Components
The dashboard typically displays a card for each tank with the following visual elements:

1.  **Tank Level Visual**: A progress bar or fillable cylinder.
    -   `Percentage = (currentLevel / capacity) * 100`
2.  **Status Indicator**: Color-coded based on `lastUpdated` timestamp.
    -   **Green**: Updated < 24 hours ago.
    -   **Yellow**: Updated 2-7 days ago.
    -   **Red**: Updated > 7 days ago.
3.  **Details**:
    -   "Last updated X days ago by [User]"
    -   Current Level / Capacity (e.g., "5,000 / 20,000 L")

### Data Formatting & Logic

**Time Ago Calculation:**
```typescript
const formatTimeAgo = (timestamp) => {
  if (!timestamp) return 'Never';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return `${diffDays} days ago`;
};
```

**Stock Month / MAD (Monthly Average Daily) Calculation:**
*Note: This is a derived metric, not stored directly.*
1.  Fetch `transactions` (supply/loading) and `tankUpdateLogs` (manual levels) for the last 30 days.
2.  Calculate daily consumption: `Start Level + Supply - End Level`.
3.  `MAD` = Average of daily consumption over 30 days.
4.  `Stock Days` = `currentLevel / MAD`.

---

## 4. Required Permissions

To access this data, the authenticated user must have appropriate Firestore rules.

**Minimum Rules:**
```javascript
match /branches/{document=**} {
  allow read: if request.auth != null; // Authenticated users can read
}
match /tankUpdateLogs/{document=**} {
  allow read: if request.auth != null;
}
match /transactions/{document=**} {
  allow read: if request.auth != null;
}
```

---

## 5. Implementation Steps for New Application

1.  **Setup Project**: Create a new React/Vue/Web project.
2.  **Install Dependencies**:
    ```bash
    npm install firebase
    ```
3.  **Configure Env**: Copy the Firebase config keys from the main project.
4.  **Create Service Layer**: Implement `firebase.ts` with the initialization code above.
5.  **Build Data Hooks**:
    -   Create a hook `useBranchData(branchId)` that uses `onSnapshot` on the branch document.
    -   Create a hook `useBranchHistory(branchId)` that fetches logs/transactions on mount.
6.  **Build Components**:
    -   Create a `TankCard` component accepting `tank` object prop.
    -   Implement the "Time Ago" and "Status Color" logic inside the card.
7.  **Integration**:
    -   Page loads -> Fetches list of branches.
    -   User selects branch -> Fetches branch details (real-time).
    -   Display grid of `TankCard`s.

This implementation allows for a read-only monitoring dashboard that stays in sync with the main operational system without risking data integrity.
