#!/bin/bash

# Exit on any failure
set -e

echo "Starting Azure deployment build process..."

# Install dependencies
echo "Installing dependencies..."
npm install

# Build the Next.js application
echo "Building Next.js application..."
npm run build

# Verify .next directory was created
if [ -d ".next" ]; then
    echo "✅ .next directory created successfully"
    ls -la .next
else
    echo "❌ .next directory not found after build"
    exit 1
fi

echo "✅ Build process completed successfully"
