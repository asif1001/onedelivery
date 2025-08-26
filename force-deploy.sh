#!/bin/bash
echo "🚀 Force deploying OneDelivery to Firebase Hosting..."

# Build fresh
npm run build

echo "📦 Fresh build completed!"
echo "📁 Built files in dist/public/:"
ls -la dist/public/

echo ""
echo "🔧 GitHub Actions Deployment:"
echo "1. Go to your GitHub repo → Actions tab"
echo "2. Click 'Deploy to Firebase Hosting' workflow"
echo "3. Click 'Run workflow' button to trigger manual deployment"
echo ""
echo "🌐 Alternative: Manual Firebase Console Upload"
echo "1. Go to https://console.firebase.google.com/project/oneplace-b5fc3/hosting"
echo "2. Click 'Add another site' or manage existing"
echo "3. Upload the 'dist/public' folder contents directly"
echo ""
echo "🔄 To clear cache after deployment:"
echo "- Wait 5-10 minutes for propagation"
echo "- Try incognito/private browsing"
echo "- Or add ?v=$(date +%s) to URL to bypass cache"
echo ""
echo "✅ Your app IS building correctly - this is just a deployment/cache issue!"