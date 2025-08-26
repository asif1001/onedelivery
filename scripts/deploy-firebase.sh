#!/bin/bash

# OneDelivery Firebase Deployment Script
# This script builds and deploys the application to Firebase Hosting

set -e

echo "🚀 Starting OneDelivery deployment to Firebase..."

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI is not installed. Installing..."
    npm install -g firebase-tools
fi

# Check if user is logged in to Firebase
if ! firebase projects:list &> /dev/null; then
    echo "🔐 Please login to Firebase..."
    firebase login
fi

# Load environment variables
if [ -f .env ]; then
    echo "📋 Loading environment variables..."
    export $(cat .env | grep -v '^#' | xargs)
fi

# Validate required environment variables
if [ -z "$VITE_FIREBASE_PROJECT_ID" ]; then
    echo "❌ VITE_FIREBASE_PROJECT_ID is not set. Please check your .env file."
    exit 1
fi

# Build the application
echo "🔨 Building the application..."
npm run build

# Deploy to Firebase
echo "🚀 Deploying to Firebase..."
firebase deploy --project $VITE_FIREBASE_PROJECT_ID

echo "✅ Deployment completed successfully!"
echo "🌐 Your app is now live at: https://$VITE_FIREBASE_PROJECT_ID.firebaseapp.com"

# Optional: Open the deployed app
read -p "🌐 Open the deployed app in browser? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if command -v open &> /dev/null; then
        open "https://$VITE_FIREBASE_PROJECT_ID.firebaseapp.com"
    elif command -v xdg-open &> /dev/null; then
        xdg-open "https://$VITE_FIREBASE_PROJECT_ID.firebaseapp.com"
    else
        echo "Please open: https://$VITE_FIREBASE_PROJECT_ID.firebaseapp.com"
    fi
fi