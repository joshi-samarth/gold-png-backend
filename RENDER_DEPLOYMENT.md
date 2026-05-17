# Render Backend Deployment Guide

## Prerequisites
- GitHub repository for backend pushed to GitHub
- Render account (render.com)

## Steps to Deploy Backend on Render

### 1. Create a New Web Service on Render
- Go to [render.com](https://render.com)
- Click "New +" → "Web Service"
- Connect your GitHub account
- Select the backend repository

### 2. Configure Service Settings
- **Name**: `gold-png-server` (or your preferred name)
- **Runtime**: Node
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Plan**: Free (or upgrade as needed)

### 3. Add Environment Variables
In the "Environment" section, add:
```
MONGO_URI=your_mongodb_connection_string
PORT=3000
```

### 4. Deploy
- Click "Create Web Service"
- Render will automatically deploy your backend
- You'll get a URL like `https://gold-png-server.onrender.com`

### 5. Update Frontend API URL
After deployment, update the frontend API base URL to point to your Render URL:
- In `client/src/api.js` or similar, change:
```javascript
const API_BASE_URL = 'https://gold-png-server.onrender.com';
```

## Important Notes
- Free tier services spin down after 15 minutes of inactivity
- Upgrade to a paid plan if you need consistent uptime
- Check Render logs for debugging: Dashboard → Your Service → Logs
