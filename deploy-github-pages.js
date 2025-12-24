#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🚀 Building onedelveiry app for GitHub Pages...');

try {
  // Build using the GitHub config
  console.log('Building with GitHub Pages configuration...');
  execSync('npx vite build --config vite.config.github.ts', { stdio: 'inherit' });
  
  // Create .nojekyll file to disable Jekyll processing
  fs.writeFileSync(path.join('dist', '.nojekyll'), '');
  console.log('✓ Created .nojekyll file');
  
  // Create index.html redirect if needed
  const indexPath = path.join('dist', 'index.html');
  if (fs.existsSync(indexPath)) {
    console.log('✓ index.html exists');
  } else {
    console.log('❌ index.html not found in dist/');
  }
  
  console.log('✅ Build complete! Deploy the dist/ folder to GitHub Pages.');
  console.log('📁 Files in dist/:');
  const files = fs.readdirSync('dist');
  files.forEach(file => console.log(`  - ${file}`));
  
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}