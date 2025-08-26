#!/bin/bash

# OneDelivery Firebase Setup Script
# This script helps set up Firebase services for the OneDelivery application

set -e

echo "🔥 OneDelivery Firebase Setup"
echo "==============================="

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "📦 Installing Firebase CLI..."
    npm install -g firebase-tools
fi

# Login to Firebase
echo "🔐 Logging in to Firebase..."
firebase login

# List available projects
echo "📋 Available Firebase projects:"
firebase projects:list

# Get project ID from user
read -p "🎯 Enter your Firebase Project ID: " PROJECT_ID

if [ -z "$PROJECT_ID" ]; then
    echo "❌ Project ID cannot be empty!"
    exit 1
fi

# Initialize Firebase in the project
echo "🔧 Initializing Firebase..."
firebase init --project $PROJECT_ID

# Update .env file with project ID
echo "📝 Updating environment variables..."
if [ -f .env ]; then
    # Update existing .env file
    sed -i.bak "s/VITE_FIREBASE_PROJECT_ID=.*/VITE_FIREBASE_PROJECT_ID=$PROJECT_ID/" .env
    echo "✅ Updated existing .env file"
else
    # Create new .env file from example
    if [ -f .env.example ]; then
        cp .env.example .env
        sed -i.bak "s/VITE_FIREBASE_PROJECT_ID=.*/VITE_FIREBASE_PROJECT_ID=$PROJECT_ID/" .env
        echo "✅ Created .env file from .env.example"
    else
        echo "❌ .env.example file not found!"
        exit 1
    fi
fi

echo ""
echo "🎉 Firebase setup completed!"
echo "📝 Next steps:"
echo "   1. Update your .env file with Firebase configuration values"
echo "   2. Go to Firebase Console: https://console.firebase.google.com/project/$PROJECT_ID"
echo "   3. Enable Authentication, Firestore, and Storage"
echo "   4. Configure authentication providers"
echo "   5. Set up Firestore security rules"
echo "   6. Run 'npm run dev' to start development"
echo ""
echo "🌐 Firebase Console: https://console.firebase.google.com/project/$PROJECT_ID"