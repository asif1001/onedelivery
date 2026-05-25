#!/bin/bash

# OneDelivery GitHub Push Script
# Usage: ./push-to-github.sh https://github.com/YourUsername/YourRepo.git

echo "🚀 OneDelivery - GitHub Push Script"
echo "===================================="

# Check if repository URL is provided
if [ -z "$1" ]; then
    echo "❌ Please provide your GitHub repository URL"
    echo "Usage: ./push-to-github.sh https://github.com/YourUsername/YourRepo.git"
    exit 1
fi

REPO_URL=$1

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo "❌ Git is not installed. Please install Git first."
    exit 1
fi

# Initialize git if not already initialized
if [ ! -d ".git" ]; then
    echo "📁 Initializing Git repository..."
    git init
fi

# Add all files
echo "📝 Adding all files..."
git add .

# Check if there are any changes to commit
if git diff --staged --quiet; then
    echo "ℹ️  No changes to commit."
else
    echo "💾 Committing changes..."
    git commit -m "OneDelivery: Complete oil delivery management system

Features included:
✅ Multi-role authentication (drivers/admins)
✅ Driver dashboard with supply/loading workflows
✅ Admin dashboard with user management
✅ Complaint management with photo uploads
✅ Task management with deadline tracking
✅ Data export with CSV filtering
✅ Mobile-responsive design
✅ Firebase Firestore & Storage integration
✅ Real-time data synchronization
✅ Professional OneDelivery branding

Ready for Firebase Hosting deployment!"
fi

# Check if remote origin exists
if git remote get-url origin &> /dev/null; then
    echo "🔄 Updating remote origin..."
    git remote set-url origin $REPO_URL
else
    echo "🔗 Adding remote origin..."
    git remote add origin $REPO_URL
fi

# Set main branch
echo "🌟 Setting main branch..."
git branch -M main

# Push to GitHub
echo "☁️  Pushing to GitHub..."
if git push -u origin main; then
    echo ""
    echo "🎉 SUCCESS! OneDelivery app pushed to GitHub!"
    echo ""
    echo "📱 Your repository: $REPO_URL"
    echo ""
    echo "✅ What's been uploaded:"
    echo "   • Complete OneDelivery application"
    echo "   • All source code and assets"
    echo "   • Firebase configuration files"
    echo "   • Deployment scripts and guides"
    echo "   • Updated branding to 'OneDelivery'"
    echo ""
    echo "🚀 Next steps:"
    echo "   1. Deploy to Firebase Hosting using firebase deploy"
    echo "   2. Test your live application"
    echo "   3. Add authorized domains in Firebase Console"
    echo ""
    echo "💡 All deployment guides are included in your repository!"
else
    echo ""
    echo "❌ Push failed. Common solutions:"
    echo ""
    echo "🔐 If authentication failed:"
    echo "   • Use GitHub Personal Access Token instead of password"
    echo "   • Go to: GitHub Settings → Developer Settings → Personal Access Tokens"
    echo ""
    echo "🔄 If repository conflicts:"
    echo "   git pull origin main --allow-unrelated-histories"
    echo "   git push -u origin main"
    echo ""
    echo "📧 Or try with different remote URL format:"
    echo "   git remote set-url origin git@github.com:YourUsername/YourRepo.git"
fi

echo "===================================="