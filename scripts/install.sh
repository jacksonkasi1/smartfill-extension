#!/bin/bash

echo "🚀 Setting up SmartFill Monorepo..."

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is required but not installed. Please install Node.js"
    exit 1
fi

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Install workspace dependencies
echo "📦 Installing workspace dependencies..."
npm install --workspaces

# Copy env file if it doesn't exist
if [ ! -f .env.local ]; then
    echo "📝 Copying environment template..."
    cp .env.example .env.local
    echo "⚠️  Please update .env.local with your API keys"
fi

# Build packages
echo "🔨 Building packages..."
npm run build

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update .env.local with your API keys"
echo "2. Run 'npm run dev' to start development"