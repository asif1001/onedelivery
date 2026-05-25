#!/bin/bash

echo "🚀 OneDelivery Firebase Hosting Deployment"
echo "========================================="

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "📦 Installing Firebase CLI..."
    npm install -g firebase-tools
fi

# Build the production version
echo "🏗️  Building production version..."
npm run build

# Check if build was successful
if [ ! -d "dist" ]; then
    echo "❌ Build failed. dist folder not found."
    exit 1
fi

echo "✅ Build completed successfully!"

# Deploy to Firebase Hosting
echo "☁️  Deploying to Firebase Hosting..."
firebase deploy --only hosting

echo ""
echo "🎉 Deployment Complete!"
echo ""
echo "📱 Your OneDelivery app is now live at:"
echo "   • https://oneplace-b5fc3.web.app"
echo "   • https://oneplace-b5fc3.firebaseapp.com"
echo ""
echo "🔧 Next steps:"
echo "   1. Test your live application"
echo "   2. Add authorized domains in Firebase Console"
echo "   3. Share with your team!"
echo ""
echo "✅ Your oil delivery management system is production ready!"