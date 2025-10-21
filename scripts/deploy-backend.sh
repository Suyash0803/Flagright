#!/bin/bash

# Backend deployment script for Render
echo "🚀 Starting backend deployment..."

# Navigate to backend directory
cd backend

# Install dependencies
echo "📦 Installing dependencies..."
npm install --production

# Run any database setup if needed
echo "🗄️ Setting up database..."
# node scripts/setupDatabase.js

echo "✅ Backend deployment completed!"