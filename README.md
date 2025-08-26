# OneDelivery - Oil Delivery & Complaint Management System

## 📋 Project Overview

**OneDelivery** is a comprehensive enterprise oil delivery management system designed specifically for professional oil delivery operations. The application serves multiple user roles including drivers, administrators, branch managers, and warehouse staff with specialized dashboards and workflows for managing oil deliveries, complaints, and tracking operations.

### Purpose & Functionality

The system handles the complete oil delivery lifecycle from loading operations at depots to final delivery at customer branches, featuring:

- **Multi-role dashboards** with role-based access control
- **Mobile-optimized workflows** for field operations  
- **Comprehensive photo documentation** with automatic watermarking
- **Real-time meter readings** and transaction tracking
- **Advanced analytics** and reporting capabilities
- **Complaint management** system with photo evidence
- **Branch stock level monitoring** with update tracking
- **Two-step supply workflow** with validation and auto-save

---

## 👥 User Roles & Detailed Processes

### 🔧 **Admin Role**

**Purpose**: Complete system administration and configuration management

#### **Core Responsibilities:**

1. **User Management**
   - Create new user accounts for drivers, branch users, and warehouse staff
   - Assign and modify user roles (Admin, Driver, Branch User, Warehouse)
   - Monitor user activity and access logs
   - Deactivate or remove user accounts when needed

2. **Branch Configuration**
   - Add new branches with location details and contact information
   - Configure oil tank setups for each branch (capacity, oil types)
   - Assign specific oil types to branch tanks (e.g., Arad TSC gets Synthetic & Mineral)
   - Update branch information and tank capacities as needed

3. **Oil Type Management**
   - Create and manage oil types (Mineral Oil, Synthetic Oil, Diesel Oil)
   - Set viscosity ratings and specifications for each oil type
   - Configure oil type availability for specific branches
   - Monitor oil type usage across the system

4. **System Monitoring**
   - View all transactions across branches and drivers
   - Monitor complaint resolution status
   - Generate system-wide reports and analytics
   - Oversee data backup and system maintenance

---

### 🚛 **Driver Role**

**Purpose**: Execute oil delivery operations and maintain accurate transaction records

#### **Core Responsibilities:**

##### **Loading Process**
- **Accept Loading Tasks**: Receive loading assignments from warehouse staff
- **Record Meter Readings**: Document initial tanker meter readings before loading
- **Photo Documentation**: Capture photos of meter readings and loading equipment
- **Capacity Verification**: Confirm tanker capacity and oil type being loaded
- **Loading Completion**: Update system when loading is complete with final readings

##### **Supply Process (Two-Step Workflow)**
- **Step 1 - Before Starting Pump**:
  - Enter delivery order number from dispatch
  - Select destination branch from filtered list
  - Choose oil type (automatically filtered based on branch tank configuration)
  - Input start meter reading (auto-filled from previous delivery)
  - Capture required photos: Start (Tanker Meter), Tank Level Before, Hose Connection
  - System validates all data before allowing Step 2 progression

- **Step 2 - After Loading Completes**:
  - Enter final meter reading after delivery completion
  - System automatically calculates oil supplied (End - Start reading)
  - Capture final photos: End Reading (Tanker Meter), Tank Level After
  - Review all transaction details for accuracy
  - Submit complete delivery record with automatic photo watermarking

##### **Complaint Management**
- **Raise Complaint**: Report delivery issues, equipment problems, or safety concerns
  - Select category: Equipment, Delivery Issues, Safety, Other
  - Set priority level: Low, Medium, High, Critical
  - Provide detailed description of the issue
  - Attach photo evidence with automatic location and timestamp watermarking
  - Receive auto-generated complaint number for tracking

- **View Complaints**: Track status of previously submitted complaints
  - Monitor complaint resolution progress (Open → In Progress → Resolved → Closed)
  - View admin responses and resolution notes
  - Access complaint history and follow-up actions

##### **Recent Transactions**
- **View Transaction History**: Access personal delivery records
  - Filter by date range, branch, or oil type
  - View detailed transaction information including photos
  - Export delivery reports for personal records
  - Track performance metrics and delivery statistics

---

### 🏢 **Branch User Role**

**Purpose**: Manage branch-specific operations and monitor local deliveries

#### **Core Responsibilities:**

1. **Tank Level Management**
   - **Update Tank Levels**: Multi-step process for accurate record keeping
     - Step 1: Select branch location
     - Step 2: Choose specific oil tank to update
     - Step 3: Capture tank gauge photo (camera or gallery selection)
     - Step 4: Enter current oil level in liters with capacity validation
     - Step 5: Take system screen photo showing updated level
     - Step 6: Review and confirm update with optional notes
   - **Monitor Tank Status**: Track current levels vs capacity with visual indicators
   - **Receive Delivery Notifications**: Get alerts when deliveries arrive at branch

2. **Delivery Tracking**
   - **View Incoming Deliveries**: Monitor scheduled and in-progress deliveries
   - **Verify Delivery Completion**: Confirm receipt of oil supplies with photo evidence
   - **Track Delivery History**: Access complete delivery records for branch
   - **Meter Reading Verification**: Confirm accuracy of driver-reported meter readings

3. **Local Reporting**
   - **Branch Transaction History**: View all deliveries specific to branch location
   - **Tank Level Reports**: Generate reports on tank level changes over time
   - **Delivery Performance**: Monitor delivery frequency and volumes
   - **Photo Documentation**: Access all delivery photos for compliance records

---

### 🏭 **Warehouse User Role**

**Purpose**: Oversee inventory management and coordinate loading operations

#### **Core Responsibilities:**

1. **Branch Stock Update Tracking**
   - **Color-Coded Status Monitoring**:
     - 🔴 **Red**: Branches with tanks not updated for 7+ days (urgent attention required)
     - 🟡 **Yellow**: Branches with tanks updated 1-7 days ago (needs attention soon)
     - 🟢 **Green**: Branches with tanks updated within 24 hours (current status)
   - **Priority Management**: Identify branches requiring immediate tank level updates
   - **Update Responsibility Tracking**: Monitor who last updated each tank and when

2. **Inventory Oversight**
   - **Real-Time Stock Monitoring**: View current tank levels across all branches
   - **Capacity Management**: Monitor tank fill percentages and identify low stock alerts
   - **Supply Planning**: Coordinate delivery schedules based on tank levels and demand
   - **Stock Trend Analysis**: Track consumption patterns across branches and oil types

3. **Loading Coordination**
   - **Driver Assignment**: Assign loading tasks to available drivers
   - **Loading Documentation**: Verify loading photos and meter readings
   - **Capacity Planning**: Ensure tanker capacity matches delivery requirements
   - **Quality Control**: Monitor loading procedures and compliance with safety protocols

4. **Operational Analytics**
   - **Transaction Monitoring**: Overview of all delivery transactions system-wide
   - **Performance Metrics**: Track delivery efficiency and driver performance
   - **Complaint Oversight**: Monitor complaint resolution and identify recurring issues
   - **Data Export**: Generate comprehensive reports for management review

---

## 🚀 Complete Firebase Hosting Setup with GitHub Integration

### **Prerequisites**

Before starting, ensure you have:
- **Node.js** (v16 or higher) installed on your local machine
- **Git** installed for version control
- **GitHub account** for repository hosting
- **Firebase account** (free tier available)
- **Code editor** (VS Code recommended)

---

### **Step 1: Initial Setup and GitHub Repository**

#### **1.1 Clone from Replit to Local Machine**

```bash
# Clone your Replit project to local machine
git clone https://github.com/your-username/your-replit-repo.git
cd your-replit-repo

# Install dependencies
npm install
```

#### **1.2 Create GitHub Repository (if not exists)**

1. Go to [GitHub.com](https://github.com) and sign in
2. Click "+" → "New repository"
3. Repository name: `onedelivery-oil-management`
4. Description: `Oil Delivery & Complaint Management System`
5. Set to **Public** or **Private** (your choice)
6. ✅ Initialize with README
7. Click "Create repository"

#### **1.3 Connect Local Project to GitHub**

```bash
# Add GitHub remote origin (replace with your actual repository URL)
git remote add origin https://github.com/your-username/onedelivery-oil-management.git

# Verify remote connection
git remote -v

# Pull any existing files from GitHub
git pull origin main

# Add all files to git
git add .

# Commit initial code
git commit -m "Initial project setup from Replit"

# Push to GitHub
git push -u origin main
```

---

### **Step 2: Firebase Project Setup**

#### **2.1 Install Firebase CLI**

```bash
# Install Firebase CLI globally
npm install -g firebase-tools

# Verify installation
firebase --version
```

#### **2.2 Create Firebase Project**

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Project name: `onedelivery-oil-management`
4. Enable Google Analytics (recommended)
5. Choose Analytics account or create new
6. Click "Create project"

#### **2.3 Enable Required Firebase Services**

**Enable Authentication:**
1. In Firebase Console → Authentication
2. Click "Get started"
3. Sign-in method tab → Email/Password → Enable
4. Save configuration

**Enable Firestore Database:**
1. In Firebase Console → Firestore Database
2. Click "Create database"
3. Start in **production mode** (we'll update rules later)
4. Choose database location (closest to your users)

**Enable Storage:**
1. In Firebase Console → Storage
2. Click "Get started"
3. Start in **production mode**
4. Choose storage location

#### **2.4 Get Firebase Configuration**

1. In Firebase Console → Project Settings (gear icon)
2. Scroll to "Your apps" section
3. Click "Add app" → Web app icon (`</>`)
4. App nickname: `OneDelivery Web App`
5. ✅ Check "Also set up Firebase Hosting"
6. Click "Register app"
7. **Copy the configuration object** - you'll need this for environment variables

---

### **Step 3: Project Configuration**

#### **3.1 Create Environment File**

Create `.env` file in your project root:

```env
# Firebase Configuration (replace with your actual values)
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Optional: Analytics (if enabled)
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

#### **3.2 Initialize Firebase in Project**

```bash
# Login to Firebase (opens browser for authentication)
firebase login

# Initialize Firebase in your project directory
firebase init

# Select services using SPACEBAR:
# ◉ Firestore: Configure security rules and indexes
# ◉ Storage: Configure security rules  
# ◉ Hosting: Configure files for Firebase Hosting

# Configuration choices:
# Firestore: Use existing project → select your project
# Firestore rules file: firestore.rules (default)
# Firestore indexes file: firestore.indexes.json (default)
# Storage rules file: storage.rules (default)
# Hosting public directory: dist (IMPORTANT: use 'dist', not 'public')
# Single-page app: Yes
# GitHub automatic builds: Yes (we'll set this up)
```

#### **3.3 Update Firebase Configuration Files**

**Update `firestore.rules`:**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Allow authenticated users to read/write app data
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

**Update `storage.rules`:**
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

---

### **Step 4: GitHub Actions for Automatic Deployment**

#### **4.1 Create GitHub Actions Workflow**

Create `.github/workflows/firebase-hosting.yml`:

```yaml
name: Deploy to Firebase Hosting

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build_and_deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Create environment file
        run: |
          echo "VITE_FIREBASE_API_KEY=${{ secrets.VITE_FIREBASE_API_KEY }}" >> .env
          echo "VITE_FIREBASE_AUTH_DOMAIN=${{ secrets.VITE_FIREBASE_AUTH_DOMAIN }}" >> .env
          echo "VITE_FIREBASE_PROJECT_ID=${{ secrets.VITE_FIREBASE_PROJECT_ID }}" >> .env
          echo "VITE_FIREBASE_STORAGE_BUCKET=${{ secrets.VITE_FIREBASE_STORAGE_BUCKET }}" >> .env
          echo "VITE_FIREBASE_MESSAGING_SENDER_ID=${{ secrets.VITE_FIREBASE_MESSAGING_SENDER_ID }}" >> .env
          echo "VITE_FIREBASE_APP_ID=${{ secrets.VITE_FIREBASE_APP_ID }}" >> .env
      
      - name: Build project
        run: npm run build
      
      - name: Deploy to Firebase Hosting
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          channelId: live
          projectId: your-project-id
```

#### **4.2 Setup GitHub Secrets**

1. In your GitHub repository → Settings → Secrets and variables → Actions
2. Click "New repository secret" for each:

**Required Secrets:**
- `VITE_FIREBASE_API_KEY`: Your Firebase API key
- `VITE_FIREBASE_AUTH_DOMAIN`: your-project-id.firebaseapp.com
- `VITE_FIREBASE_PROJECT_ID`: your-project-id  
- `VITE_FIREBASE_STORAGE_BUCKET`: your-project-id.appspot.com
- `VITE_FIREBASE_MESSAGING_SENDER_ID`: Your sender ID
- `VITE_FIREBASE_APP_ID`: Your app ID
- `FIREBASE_SERVICE_ACCOUNT`: Firebase service account JSON (see below)

#### **4.3 Generate Firebase Service Account**

1. Go to Firebase Console → Project Settings → Service accounts
2. Click "Generate new private key"
3. Download the JSON file
4. Copy the ENTIRE JSON content
5. In GitHub → Secrets → Add `FIREBASE_SERVICE_ACCOUNT` with the JSON content

---

### **Step 5: Initial Deployment**

#### **5.1 Build and Deploy Manually (First Time)**

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Deploy to Firebase Hosting
firebase deploy --only hosting

# Deploy Firestore rules and Storage rules
firebase deploy --only firestore:rules,storage
```

#### **5.2 Verify Deployment**

1. Check Firebase Console → Hosting for your live URL
2. Visit the URL to confirm your app is working
3. Test user authentication and basic functionality
4. Verify Firestore and Storage are working correctly

---

## 🔄 Update Workflow: Replit → GitHub → Firebase

### **Method 1: Direct Git Commands (Recommended)**

#### **In Replit Environment:**

```bash
# Stage all changes
git add .

# Commit changes with descriptive message
git commit -m "Add: Enhanced supply workflow with photo gallery selection"

# Push to GitHub (triggers automatic Firebase deployment)
git push origin main
```

#### **Verification Steps:**
1. Check GitHub repository for new commits
2. Monitor GitHub Actions tab for deployment status
3. Verify changes are live on Firebase Hosting URL
4. Test functionality in production environment

### **Method 2: GitHub Web Interface**

1. **Export files from Replit**:
   - Download project as ZIP from Replit
   - Extract files locally

2. **Upload to GitHub**:
   - Go to GitHub repository
   - Click "Add file" → "Upload files"
   - Drag and drop updated files
   - Commit changes with message
   - GitHub Actions will automatically deploy

### **Method 3: Replit Git Integration**

1. **In Replit**:
   - Open Version Control tab
   - Stage changes you want to commit
   - Write commit message
   - Click "Commit & push"

2. **Monitor deployment**:
   - Check GitHub Actions for build status
   - Verify Firebase Hosting update

---

## 🚨 Important Update Guidelines

### **Before Each Update:**

1. **Test in Replit**:
   - Verify all functionality works correctly
   - Test on different devices/browsers
   - Check console for any errors

2. **Environment Check**:
   - Ensure `.env` file has correct Firebase configuration
   - Verify all API keys are valid and not expired

3. **Build Verification**:
   ```bash
   # Test build locally before pushing
   npm run build
   
   # Check for build errors
   npm run preview
   ```

### **After Each Update:**

1. **Monitor GitHub Actions**:
   - Go to GitHub repository → Actions tab
   - Ensure build completes successfully (green checkmark)
   - If failed, check error logs and fix issues

2. **Test Production**:
   - Visit Firebase Hosting URL
   - Test critical functionality (login, supply workflow, complaints)
   - Check responsive design on mobile devices

3. **Database Updates**:
   - If Firestore rules changed: `firebase deploy --only firestore:rules`
   - If Storage rules changed: `firebase deploy --only storage`

---

## 🛠️ Troubleshooting Common Issues

### **Build Errors:**
```bash
# Clear node modules and reinstall
rm -rf node_modules
npm install

# Clear Vite cache
rm -rf .vite
npm run build
```

### **Environment Variables Not Working:**
- Verify all secrets are set in GitHub repository settings
- Ensure variable names start with `VITE_` for client-side access
- Check for typos in secret names

### **Firebase Deployment Fails:**
- Verify Firebase service account JSON is valid
- Check project ID matches in `firebase.json`
- Ensure Firebase CLI is latest version: `npm install -g firebase-tools@latest`

### **GitHub Actions Fails:**
- Check workflow file syntax (YAML indentation)
- Verify all secrets are properly set
- Review action logs for specific error messages

---

## 📊 Technical Specifications

### **Development Stack**
- **Frontend**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with shadcn/ui components
- **Routing**: Wouter
- **State Management**: React Query (TanStack Query)
- **Authentication**: Firebase Auth
- **Database**: Firebase Firestore  
- **Storage**: Firebase Storage
- **Hosting**: Firebase Hosting
- **CI/CD**: GitHub Actions

### **Mobile Optimization**
- **Progressive Web App (PWA)** capabilities
- **Responsive design** for tablets and smartphones
- **Camera integration** for photo capture
- **Offline support** with local storage
- **Touch-friendly interface** for field operations

### **Security Features**
- **Role-based access control** with Firestore security rules
- **Photo watermarking** with timestamps and location data
- **Secure file uploads** with Firebase Storage
- **Audit trail** for all transactions and updates

---

## 📞 Support & Maintenance

### **For Technical Issues**
- Check browser console for error messages
- Verify internet connection for real-time sync
- Clear browser cache if experiencing loading issues
- Review GitHub Actions logs for deployment issues

### **For Business Process Questions**
- Refer to user role workflows above
- Contact system administrator for access issues
- Review complaint resolution procedures

---

## 🔄 Version History

### **Current Version: 2.1**
- ✅ Enhanced photo selection (camera or gallery) for branch tank updates
- ✅ Complete GitHub Actions CI/CD pipeline integration
- ✅ Improved Firebase hosting with automatic deployments
- ✅ Updated README with comprehensive deployment instructions

### **Version 2.0**
- ✅ Enhanced Supply workflow with two-step process
- ✅ Branch-specific oil type filtering
- ✅ Color-coded branch stock update tracking
- ✅ Auto-save functionality with draft protection
- ✅ Improved photo labeling and validation

---

*This comprehensive documentation ensures seamless deployment, management, and updates for the OneDelivery Oil Management System. The automated CI/CD pipeline guarantees that your Firebase hosting always serves the latest GitHub version.*