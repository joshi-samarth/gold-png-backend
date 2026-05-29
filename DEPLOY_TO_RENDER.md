# Deploy to Render - Final Steps

## What's Ready

Your project has been refactored from `node-cron` to **Render Cron Jobs**. All code is production-ready!

## Files to Know About

**New Files:**
- `scripts/goldTracker.js` - Standalone fetch script (✅ tested)
- `CRON_JOB_SETUP.md` - Complete setup guide
- `REFACTORING_SUMMARY.md` - Technical summary

**Modified Files:**
- `index.js` - Removed setupCron()
- `package.json` - Added `"cron": "node scripts/goldTracker.js"`
- `render.yaml` - Added cronjobs configuration

## One-Time Deployment Steps

### 1. **Commit & Push to GitHub**
```bash
git add .
git commit -m "Refactor: migrate from node-cron to Render Cron Job"
git push origin main
```

### 2. **Set Environment Variables on Render**

Go to **Render Dashboard** → Your Project → **Environment**

Add/Verify:
- `MONGO_URI` = Your MongoDB connection string
- `NODE_ENV` = `production`
- `FRONTEND_URL` = Your Vercel frontend URL

### 3. **Verify render.yaml Exists**

Render should auto-detect from your repo:
- File: `render.yaml` at project root
- Contains: `services` (web) + `cronjobs` (gold-rate-fetcher)

### 4. **Deploy**

**Option A:** Auto-deployment (recommended)
- Just push to GitHub
- Render auto-deploys from your main branch

**Option B:** Manual redeploy
- Go to Render Dashboard
- Click your project
- Click "Redeploy"

## Verify It's Working

### After Deployment:

1. **Check Web Service**
   - Should show "Server is running" ✅
   - API endpoints work normally

2. **Check Cron Job**
   - Go to **Cron Jobs** tab
   - Should see `gold-rate-fetcher` listed
   - Status should be "Active" ✅

3. **Wait for First Execution**
   - Cron runs at 6:40 AM & 7:40 AM UTC
   - Check logs after those times
   - Should see: `[CRON] Fetch completed successfully`

4. **Monitor for 2-3 Days**
   - No errors in logs ✅
   - Gold prices updating ✅
   - No duplicate entries ✅

## What Changes After Deployment?

### You Get:
- ✅ **Reliable** gold rate fetching (independent of server state)
- ✅ **Scheduled** at 6:40 AM & 7:40 AM UTC daily
- ✅ **No duplicates** (only inserts on price changes)
- ✅ **Full history** (each price change = new record)
- ✅ **Better monitoring** (Render dashboard logs)

### The Server Still:
- ✅ Runs Express API
- ✅ Serves rate data via API endpoints
- ✅ Handles all user requests
- ✅ Can restart without losing cron functionality

### The Cron Job:
- ✅ Runs independently
- ✅ Fetches gold prices
- ✅ Stores to MongoDB
- ✅ Works even if server restarts

## Timeline

| Time (UTC) | Time (IST) | Action |
|-----------|-----------|--------|
| 6:40 AM | 12:10 PM | Primary fetch |
| 7:40 AM | 1:10 PM | Safety backup |
| Every day | Every day | Both times |

## Troubleshooting After Deployment

**Cron job not listed?**
- Go to project settings
- Click "Redeploy"
- Render will parse render.yaml again

**Cron job listed but shows error?**
- Check MongoDB URI is correct
- Check NODE_ENV is "production"
- Look at logs for specific error

**API returning outdated prices?**
- Check if cron job ran (look at logs)
- Check MongoDB has recent records
- Database sync can take a minute

**Multiple duplicate entries?**
- Shouldn't happen with new logic
- If it does, check cron job ran multiple times

## Quick Reference

**Check Cron Status:**
```
Render Dashboard → Your Project → Cron Jobs tab
```

**View Cron Logs:**
```
Cron Jobs → gold-rate-fetcher → Click recent execution
```

**Manually Trigger (for testing):**
```
Cron Jobs → gold-rate-fetcher → "Run now" button
```

## Success Indicators

✅ After deployment, you should see:
- Web service running normally
- Cron job active in dashboard
- Logs showing successful fetches at scheduled times
- Gold prices updating in database
- No duplicate entries

---

**Ready?** Commit & push, then watch the dashboard! 🚀
