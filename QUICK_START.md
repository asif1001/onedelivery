# OneDelivery Quick Start Guide

Get your OneDelivery system running in 5 minutes!

## ⚡ Quick Setup

### 1. Firebase Setup (2 minutes)
```bash
# Run the automated Firebase setup
bash scripts/setup-firebase.sh
```

### 2. Environment Configuration (1 minute)
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your Firebase values
# VITE_FIREBASE_API_KEY=your_key_here
# VITE_FIREBASE_PROJECT_ID=your_project_id
# VITE_FIREBASE_APP_ID=your_app_id
```

### 3. Install & Run (2 minutes)
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

🎉 **Your app is now running at http://localhost:5000**

## 🚀 Quick Deploy

### Deploy to Firebase (1 command)
```bash
bash scripts/deploy-firebase.sh
```

### Deploy to GitHub Pages (1 command)
```bash
bash scripts/deploy-github.sh
```

## 👤 Default Admin Login

- **Email**: `asif.s@ekkanoo.com.bh`
- **Password**: Create account in Firebase Console

## 📱 Test User Accounts

Create these test accounts in Firebase Authentication:

- **Driver**: `driver@ekkanoo.com.bh`
- **Branch Manager**: `branch.manager@ekkanoo.com.bh`
- **Warehouse**: `warehouse@ekkanoo.com.bh`

## 🔧 Need Help?

- **Full Documentation**: See [README.md](README.md)
- **Deployment Guide**: See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
- **Project Structure**: See [docs/PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md)

---

**Ready to go? Start with `npm run dev` and open http://localhost:5000**