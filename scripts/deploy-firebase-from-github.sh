#!/bin/bash
# Deploy OneDelivery Oil Management System to Firebase Hosting from GitHub

echo "🚀 Deploying OneDelivery to Firebase Hosting..."

# Set environment variables for build
export VITE_FIREBASE_PROJECT_ID=oneplace-b5fc3

# Build the application
echo "📦 Building application..."
npm run build

# Deploy to Firebase Hosting
echo "🔥 Deploying to Firebase..."
firebase deploy --only hosting

echo "✅ Deployment completed successfully!"
echo "🌐 Your app should be available at: https://oneplace-b5fc3.web.app"