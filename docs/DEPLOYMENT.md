# OneDelivery Deployment Guide

This guide covers all deployment options for the OneDelivery oil management system.

## 📋 Pre-Deployment Checklist

### Required Setup
- [ ] Firebase project created and configured
- [ ] Environment variables set (see `.env.example`)
- [ ] Firebase Authentication enabled
- [ ] Firestore database created
- [ ] Firebase Storage enabled
- [ ] Domain authorization configured

### Security Checklist
- [ ] Firestore security rules updated for production
- [ ] Firebase App Check enabled (recommended)
- [ ] Environment variables secured
- [ ] CORS policies configured
- [ ] SSL/TLS certificates in place

## 🔥 Firebase Hosting Deployment

### Method 1: Using Deployment Script

```bash
# Run the automated deployment script
npm run deploy:firebase
# or manually:
bash scripts/deploy-firebase.sh
```

### Method 2: Manual Firebase Deployment

```bash
# Install Firebase CLI globally
npm install -g firebase-tools

# Login to Firebase
firebase login

# Build the application
npm run build

# Deploy to Firebase
firebase deploy --project your-project-id
```

### Firebase Configuration

Ensure your `firebase.json` is properly configured:

```json
{
  "hosting": {
    "public": "dist",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

## 📱 GitHub Pages Deployment

### Method 1: Using Deployment Script

```bash
# Run the automated deployment script
npm run deploy:github
# or manually:
bash scripts/deploy-github.sh
```

### Method 2: Manual GitHub Pages

```bash
# Build the application
npm run build

# Copy to docs folder
cp -r dist docs

# Create .nojekyll file
touch docs/.nojekyll

# Commit and push
git add docs/
git commit -m "Deploy to GitHub Pages"
git push origin main
```

### GitHub Pages Setup

1. Go to your repository on GitHub
2. Settings → Pages
3. Source: Deploy from a branch
4. Branch: main / docs folder
5. Save

## 🌐 Custom Domain Setup

### For Firebase Hosting

1. Firebase Console → Hosting
2. Add custom domain
3. Follow verification steps
4. Update DNS records:
   ```
   Type: A
   Name: @
   Value: [Firebase IP addresses]
   
   Type: CNAME
   Name: www
   Value: your-project-id.firebaseapp.com
   ```

### For GitHub Pages

1. Add CNAME file to docs folder:
   ```bash
   echo "yourdomain.com" > docs/CNAME
   ```
2. Update DNS records:
   ```
   Type: CNAME
   Name: @
   Value: yourusername.github.io
   ```

## 🔧 Environment Variables

### Required Variables

```bash
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_STORAGE_BUCKET=your_bucket

# Optional
DATABASE_URL=postgresql://...
SESSION_SECRET=random_secret_key
```

### Setting Environment Variables

#### For Local Development
1. Copy `.env.example` to `.env`
2. Fill in your Firebase configuration values

#### For Firebase Functions (if using)
```bash
firebase functions:config:set firebase.api_key="your_key"
```

#### For GitHub Actions
1. Repository Settings → Secrets and variables → Actions
2. Add each environment variable as a secret

## 🚀 Production Optimizations

### Build Optimizations

```bash
# Production build with optimizations
NODE_ENV=production npm run build
```

### Firebase Hosting Optimizations

Add to `firebase.json`:

```json
{
  "hosting": {
    "headers": [
      {
        "source": "**/*.@(js|css)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=31536000"
          }
        ]
      },
      {
        "source": "**/*.@(png|jpg|jpeg|gif|webp|svg)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=31536000"
          }
        ]
      }
    ]
  }
}
```

## 🔒 Security Configuration

### Firestore Security Rules

Update `firestore.rules` for production:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Authenticated users can read public data
    match /branches/{document} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && isAdmin();
    }
    
    match /oilTypes/{document} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && isAdmin();
    }
    
    // Helper function
    function isAdmin() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

### Firebase Storage Rules

Update `storage.rules`:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /photos/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        resource.size < 10 * 1024 * 1024; // 10MB limit
    }
  }
}
```

## 🎯 Domain Authorization

### Firebase Authentication Domains

1. Firebase Console → Authentication → Settings
2. Authorized domains section
3. Add your domains:
   - `localhost` (for development)
   - `your-project-id.firebaseapp.com`
   - `yourdomain.com` (if using custom domain)

## 🔄 CI/CD Pipeline

### GitHub Actions Example

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy OneDelivery
on:
  push:
    branches: [ main ]

jobs:
  deploy:
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
      
    - name: Build
      run: npm run build
      env:
        VITE_FIREBASE_API_KEY: ${{ secrets.VITE_FIREBASE_API_KEY }}
        VITE_FIREBASE_PROJECT_ID: ${{ secrets.VITE_FIREBASE_PROJECT_ID }}
        VITE_FIREBASE_APP_ID: ${{ secrets.VITE_FIREBASE_APP_ID }}
        
    - name: Deploy to Firebase
      uses: FirebaseExtended/action-hosting-deploy@v0
      with:
        repoToken: '${{ secrets.GITHUB_TOKEN }}'
        firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
        projectId: ${{ secrets.VITE_FIREBASE_PROJECT_ID }}
```

## 🐛 Troubleshooting

### Common Issues

1. **Build Errors**
   - Check environment variables
   - Clear node_modules: `rm -rf node_modules && npm install`
   - Check TypeScript errors: `npm run type-check`

2. **Firebase Deploy Errors**
   - Verify login: `firebase login`
   - Check project: `firebase projects:list`
   - Verify permissions in Firebase Console

3. **Authentication Issues**
   - Check authorized domains
   - Verify API keys
   - Check Firebase console for errors

### Performance Issues

1. **Large Bundle Size**
   - Analyze bundle: `npm run build -- --analyze`
   - Implement code splitting
   - Optimize images

2. **Slow Loading**
   - Enable caching headers
   - Use CDN for static assets
   - Implement service worker

## 📊 Monitoring

### Firebase Analytics

1. Enable in Firebase Console
2. Add to app initialization
3. Monitor user behavior and performance

### Error Tracking

1. Enable Firebase Crashlytics
2. Set up error boundaries in React
3. Monitor application errors

---

**Need help?** Contact support or create an issue on GitHub.