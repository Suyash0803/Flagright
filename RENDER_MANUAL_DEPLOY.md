# 🚀 Render Deployment - Step by Step

The Blueprint deployment has some limitations with service references. Here's the manual approach that works 100%:

## Prerequisites
- GitHub account with your repository
- Render account (free)
- Neo4j AuraDB account (free) - **Recommended**

## Step 1: Set Up Database (Choose One)

### Option A: Neo4j AuraDB (Easiest - Recommended)
1. Go to [https://neo4j.com/cloud/platform/aura-graph-database/](https://neo4j.com/cloud/platform/aura-graph-database/)
2. Create free account
3. Create new database instance
4. Save these details:
   - **URI**: `neo4j+s://xxxxxxx.databases.neo4j.io`
   - **Username**: `neo4j`
   - **Password**: `[generated password]`

### Option B: Deploy Neo4j on Render
1. Create new Web Service
2. Use Docker: `neo4j:5.14.0`
3. Set environment variables:
   - `NEO4J_AUTH=neo4j/password123`

## Step 2: Deploy Backend API

1. **Create Web Service in Render**:
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click "New" → "Web Service"
   - Connect your GitHub: `https://github.com/Suyash0803/Flagright`

2. **Configuration**:
   ```
   Name: flagright-backend
   Root Directory: backend
   Build Command: npm install
   Start Command: npm start
   ```

3. **Environment Variables**:
   ```
   NODE_ENV=production
   NEO4J_URI=neo4j+s://your-auradb-uri  (from Step 1)
   NEO4J_USER=neo4j
   NEO4J_PASSWORD=your-auradb-password  (from Step 1)
   ```

4. **Deploy** and wait for completion

## Step 3: Deploy Frontend

1. **Create Static Site in Render**:
   - Click "New" → "Static Site"
   - Connect same GitHub repository

2. **Configuration**:
   ```
   Name: flagright-frontend
   Root Directory: frontend
   Build Command: npm install && npm run build
   Publish Directory: build
   ```

3. **Environment Variables**:
   ```
   REACT_APP_API_URL=https://flagright-backend.onrender.com/api
   ```
   *(Replace with your actual backend URL from Step 2)*

4. **Deploy** and wait for completion

## Step 4: Test Deployment

1. **Check Backend Health**:
   ```bash
   curl https://flagright-backend.onrender.com/health
   ```

2. **Populate Sample Data**:
   ```bash
   curl -X POST https://flagright-backend.onrender.com/api/users/generate-sample-data
   ```

3. **Access Frontend**:
   Visit: `https://flagright-frontend.onrender.com`

## Expected URLs
- **Frontend**: `https://flagright-frontend.onrender.com`
- **Backend**: `https://flagright-backend.onrender.com`
- **API Health**: `https://flagright-backend.onrender.com/health`

## Troubleshooting

### Backend Issues:
- Check environment variables are correct
- Verify Neo4j connection URI format
- Check logs in Render dashboard

### Frontend Issues:
- Ensure `REACT_APP_API_URL` points to correct backend
- Check for CORS errors in browser console
- Verify build completed successfully

### Database Issues:
- Test connection with Neo4j Browser
- Verify firewall settings (AuraDB should work out of box)
- Check authentication credentials

## Free Tier Limitations
- **Backend**: Sleeps after 15 minutes of inactivity
- **Frontend**: No sleep limitation
- **Database**: AuraDB free tier has storage limits

## Production Recommendations
1. Upgrade to paid Render plans for 24/7 uptime
2. Use Neo4j AuraDB professional tier
3. Set up monitoring and alerts
4. Configure custom domains

---

**Total time**: ~15-20 minutes
**Cost**: $0 (free tiers)