#!/bin/bash

# Frontend deployment script for Render
echo "🚀 Starting frontend deployment..."

# Navigate to frontend directory
cd frontend

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the React app
echo "🏗️ Building React application..."
npm run build

echo "✅ Frontend deployment completed!"