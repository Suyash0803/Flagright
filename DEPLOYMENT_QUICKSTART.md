# 🚀 Render Deployment Steps

## Quick Start (5 minutes)

### Option 1: One-Click Deploy (Easiest)
1. **Fork the Repository**: Go to [https://github.com/Suyash0803/Flagright](https://github.com/Suyash0803/Flagright) and fork it
2. **Deploy with Blueprint**: 
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click "New" → "Blueprint"
   - Connect your forked repository
   - Render will use the `render.yaml` file to deploy everything

### Option 2: Manual Deploy (More Control)

#### Step 1: Database Setup
**Option A: Neo4j AuraDB (Recommended)**
1. Go to [Neo4j AuraDB](https://neo4j.com/cloud/platform/aura-graph-database/)
2. Create free account and instance
3. Save connection details: URI, username, password

**Option B: Deploy Neo4j on Render**
1. New → Web Service
2. Docker deployment using `neo4j/Dockerfile`

#### Step 2: Backend API
1. **Create Web Service**:
   - Repository: Your forked repository
   - Root Directory: `backend`
   - Build Command: `npm install`
   - Start Command: `npm start`

2. **Environment Variables**:
   ```
   NODE_ENV=production
   NEO4J_URI=bolt://your-database-url:7687
   NEO4J_USER=neo4j
   NEO4J_PASSWORD=your-password
   ```

#### Step 3: Frontend
1. **Create Static Site**:
   - Repository: Your forked repository  
   - Root Directory: `frontend`
   - Build Command: `npm install && npm run build`
   - Publish Directory: `build`

2. **Environment Variables**:
   ```
   REACT_APP_API_URL=https://your-backend-url.onrender.com/api
   ```

## Post-Deployment

### 1. Test Health Check
```bash
curl https://your-backend-url.onrender.com/health
```

### 2. Populate Sample Data
```bash
curl -X POST https://your-backend-url.onrender.com/api/users/generate-sample-data
```

### 3. Verify Frontend
Visit: `https://your-frontend-url.onrender.com`

## Expected URLs
- **Frontend**: `https://flagright-frontend.onrender.com`
- **Backend API**: `https://flagright-backend.onrender.com`
- **Health Check**: `https://flagright-backend.onrender.com/health`

## Cost (Free Tier)
- **Backend**: Free (sleeps after 15 min)
- **Frontend**: Free
- **Database**: Neo4j AuraDB free tier
- **Total**: $0/month

## Troubleshooting

### Common Issues:
1. **Database Connection**: Check NEO4J_URI format
2. **CORS Errors**: Ensure frontend has correct API URL
3. **Build Failures**: Check Node.js version compatibility

### Support:
- Check deployment logs in Render Dashboard
- Use health check endpoint for diagnostics
- Review GitHub repository for latest updates

## Production Recommendations

For production use:
1. Upgrade to paid Render plans for 24/7 uptime
2. Use Neo4j AuraDB professional tier
3. Set up monitoring and alerts
4. Configure custom domains
5. Enable HTTPS (automatic on Render)

---

**Repository**: [https://github.com/Suyash0803/Flagright](https://github.com/Suyash0803/Flagright)
**Live Demo**: Will be available after deployment