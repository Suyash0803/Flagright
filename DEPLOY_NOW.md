# 🚀 DEPLOY TO RENDER - Quick Guide

## ⚡ Fast Track (15 minutes)

### Step 1: Database Setup
1. Go to [Neo4j AuraDB](https://neo4j.com/cloud/platform/aura-graph-database/)
2. Create FREE account and database
3. Save: URI, username, password

### Step 2: Deploy Backend
1. **Render Dashboard** → "New" → "Web Service"
2. **Connect Repository**: `https://github.com/Suyash0803/Flagright`
3. **Settings**:
   ```
   Name: flagright-backend
   Root Directory: backend
   Build: npm install
   Start: npm start
   ```
4. **Environment Variables**:
   ```
   NODE_ENV=production
   NEO4J_URI=your-auradb-uri-from-step1
   NEO4J_USER=neo4j  
   NEO4J_PASSWORD=your-auradb-password-from-step1
   ```

### Step 3: Deploy Frontend
1. **Render Dashboard** → "New" → "Static Site"
2. **Same Repository**: `https://github.com/Suyash0803/Flagright`
3. **Settings**:
   ```
   Name: flagright-frontend
   Root Directory: frontend
   Build: npm install && npm run build
   Publish: build
   ```
4. **Environment Variables**:
   ```
   REACT_APP_API_URL=https://flagright-backend.onrender.com/api
   ```

### Step 4: Test
- **Health**: `https://flagright-backend.onrender.com/health`
- **App**: `https://flagright-frontend.onrender.com`

## 💰 Cost: FREE
- Backend: Free tier (sleeps after 15min)
- Frontend: Free tier
- Database: AuraDB free tier

---

**Need Help?** See detailed guide: [RENDER_MANUAL_DEPLOY.md](./RENDER_MANUAL_DEPLOY.md)