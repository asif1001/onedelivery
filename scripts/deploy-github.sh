#!/bin/bash

# OneDelivery GitHub Pages Deployment Script
# This script builds and deploys the application to GitHub Pages

set -e

echo "🚀 Starting OneDelivery deployment to GitHub Pages..."

# Check if git is initialized
if [ ! -d .git ]; then
    echo "❌ Git repository not initialized. Please run 'git init' first."
    exit 1
fi

# Check if gh-pages package is installed
if ! npm list gh-pages &> /dev/null; then
    echo "📦 Installing gh-pages..."
    npm install --save-dev gh-pages
fi

# Load environment variables
if [ -f .env ]; then
    echo "📋 Loading environment variables..."
    export $(cat .env | grep -v '^#' | xargs)
fi

# Build the application
echo "🔨 Building the application..."
npm run build

# Copy built files to docs folder for GitHub Pages
echo "📁 Preparing GitHub Pages deployment..."
rm -rf docs
cp -r dist docs

# Create CNAME file if custom domain is specified
if [ ! -z "$CUSTOM_DOMAIN" ]; then
    echo "$CUSTOM_DOMAIN" > docs/CNAME
    echo "🌐 Custom domain configured: $CUSTOM_DOMAIN"
fi

# Create .nojekyll file to bypass Jekyll processing
touch docs/.nojekyll

# Commit and push to GitHub
echo "📤 Committing and pushing to GitHub..."
git add docs/
git commit -m "Deploy OneDelivery to GitHub Pages - $(date)" || echo "No changes to commit"
git push origin main

echo "✅ Deployment completed successfully!"
echo "🌐 Your app will be available at GitHub Pages shortly."

# Get repository URL for GitHub Pages
REPO_URL=$(git config --get remote.origin.url)
if [[ $REPO_URL == *"github.com"* ]]; then
    REPO_NAME=$(basename "$REPO_URL" .git)
    USER_NAME=$(basename "$(dirname "$REPO_URL")")
    echo "📝 GitHub Pages URL: https://$USER_NAME.github.io/$REPO_NAME"
fi