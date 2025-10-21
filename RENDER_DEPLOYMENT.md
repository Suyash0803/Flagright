# Render Deployment Guide

## Option 1: Using Render Blueprint (Infrastructure as Code)

1. **Connect Repository**: 
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click "New" → "Blueprint"
   - Connect your GitHub repository: `https://github.com/Suyash0803/Flagright`
   - Render will automatically detect the `render.yaml` file

2. **Environment Variables**:
   - NEO4J_PASSWORD: `password123`
   - NODE_ENV: `production`

## Option 2: Manual Deployment (Recommended for beginners)

### Step 1: Deploy Neo4j Database
```bash
# Use a managed database service like:
# - Neo4j AuraDB (recommended)
# - Or deploy on a VPS
```

### Step 2: Deploy Backend API
1. **Create Web Service**:
   - Service Type: `Web Service`
   - Repository: `https://github.com/Suyash0803/Flagright`
   - Root Directory: `backend`
   - Build Command: `npm install`
   - Start Command: `npm start`

2. **Environment Variables**:
   ```
   NODE_ENV=production
   PORT=5000
   NEO4J_URI=bolt://your-neo4j-instance:7687
   NEO4J_USER=neo4j
   NEO4J_PASSWORD=your-password
   ```

### Step 3: Deploy Frontend
1. **Create Static Site**:
   - Service Type: `Static Site`
   - Repository: `https://github.com/Suyash0803/Flagright`
   - Root Directory: `frontend`
   - Build Command: `npm install && npm run build`
   - Publish Directory: `build`

2. **Environment Variables**:
   ```
   REACT_APP_API_URL=https://your-backend-url.render.com/api
   ```

## Alternative: Use Neo4j AuraDB

For the database, I recommend using Neo4j AuraDB (free tier available):

1. Go to [Neo4j AuraDB](https://neo4j.com/cloud/platform/aura-graph-database/)
2. Create a free instance
3. Use the connection details in your backend environment variables

## Cost Estimation

- **Neo4j AuraDB**: Free tier available
- **Backend API**: Free tier (sleeps after 15 min of inactivity)
- **Frontend**: Free tier
- **Total**: $0/month for development, ~$7-25/month for production

## Post-Deployment Setup

1. **Populate Database**:
   ```bash
   curl -X POST https://your-backend-url.render.com/api/setup/populate
   ```

2. **Health Check**:
   ```bash
   curl https://your-backend-url.render.com/health
   ```

## Monitoring

- Use Render's built-in logs and metrics
- Set up alerts for service health
- Monitor database performance in Neo4j Browser