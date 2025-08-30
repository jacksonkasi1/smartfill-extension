#!/bin/bash
set -e

echo "🧹 Cleaning previous build..."
pnpm run clean

echo "🏗️ Building project..."
pnpm run build

echo "📁 Copying deployment files to dist..."
cp vercel.json dist/
cp -r api dist/
cp package.json dist/

echo "🚀 Deploying from dist folder..."
cd dist
vercel --prod --yes

echo "✅ Deployment complete!"