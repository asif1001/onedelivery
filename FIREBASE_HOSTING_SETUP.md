# Firebase Hosting Deployment from GitHub

This app is configured to automatically deploy to Firebase Hosting from GitHub whenever code is pushed to the main branch.

## 🔑 Required GitHub Secrets

Set these secrets in your GitHub repository settings (Settings → Secrets and variables → Actions):

### Firebase Configuration
- `VITE_FIREBASE_API_KEY` - Your Firebase API key
- `VITE_FIREBASE_APP_ID` - Your Firebase App ID  
- `VITE_FIREBASE_STORAGE_BUCKET` - Your Firebase Storage bucket name
- `FIREBASE_SERVICE_ACCOUNT_ONEPLACE_B5FC3` - Firebase service account JSON (for deployment)

### How to Get Firebase Service Account
1. Go to Firebase Console → Project Settings
2. Click "Service Accounts" tab
3. Click "Generate new private key"
4. Copy the entire JSON content as the secret value

## 🚀 Deployment Methods

### Automatic Deployment (Recommended)
- Push code to `main` branch
- GitHub Actions will automatically build and deploy
- Available at: https://oneplace-b5fc3.web.app

### Manual Deployment
Run locally:
```bash
bash scripts/deploy-firebase-from-github.sh
```

## 📁 Current Configuration

- **Firebase Project**: `oneplace-b5fc3`
- **Build Output**: `dist/public` 
- **Hosting Config**: `firebase.json`
- **GitHub Action**: `.github/workflows/firebase-deploy.yml`

## 🔧 Local Development

1. Copy `.env.example` to `.env`
2. Fill in your Firebase configuration values
3. Run `npm run dev`

## ✅ Verification

After deployment:
1. Visit https://oneplace-b5fc3.web.app
2. Check that all Firebase services work (Auth, Firestore, Storage)
3. Test all user roles (Admin, Driver, Branch, Warehouse)