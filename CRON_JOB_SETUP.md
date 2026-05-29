# Render Cron Job Setup Guide

## Overview

This backend has been refactored to use **Render Cron Jobs** instead of `node-cron` inside the Express server. This ensures reliable, persistent gold rate fetching even when the free-tier server restarts or goes to sleep.

## Architecture

### Before
- ❌ `node-cron` ran inside the Express server
- ❌ Unreliable on Render free tier (server can restart/sleep)
- ❌ No guarantee data is fetched continuously

### After
- ✅ **Standalone Render Cron Job** executes `scripts/goldTracker.js`
- ✅ Independent from web server - runs even if server sleeps
- ✅ Robust duplicate prevention - only stores on price changes
- ✅ Maintains historical snapshots for analytics

## How It Works

### 1. Standalone Script: `scripts/goldTracker.js`

```bash
node scripts/goldTracker.js
```

This script:
- ✓ Connects to MongoDB
- ✓ Fetches current gold rates from the API
- ✓ Checks for duplicates (compares with latest DB record)
- ✓ Only inserts new record if prices changed
- ✓ Exits with code 0 (success) or 1 (failure)
- ✓ Logs all operations for debugging

**Key Features:**
- **Duplicate Prevention**: Compares current prices with the latest DB record
- **Historical Tracking**: Each price change creates a new document
- **Atomic Operations**: MongoDB ensures data consistency
- **Proper Exit Codes**: Render monitors these for retry logic

### 2. Render Cron Job Configuration

File: `render.yaml`

```yaml
cronjobs:
  - name: gold-rate-fetcher
    runtime: node
    schedule: "*/15 3-15 * * *"
    command: npm run cron
    envVars:
      - key: MONGO_URI
        scope: runtime
      - key: NODE_ENV
        value: production
```

**Schedule Explanation:**
- `*/15 3-15 * * *` = Every 15 minutes from 3 AM to 3 PM UTC
- Equivalent to 8:30 AM to 8:30 PM IST
- Runs **48 times per day** (every 15 minutes)
- Lightweight execution: ~1-3 seconds per run
- Captures price changes near real-time with minimal Render usage
- Duplicate prevention ensures no wasted storage

## Deployment Steps

### On Render Dashboard:

1. **Connect Repository**
   - Link your GitHub repository

2. **Add Environment Variables**
   - `MONGO_URI`: Your MongoDB connection string
   - `NODE_ENV`: Set to `production`

3. **Deploy**
   - Render will automatically read `render.yaml`
   - Web service will start: `npm start`
   - Cron jobs will be scheduled automatically

### Verify Cron Job is Running:

1. Go to **Render Dashboard** → Your Project
2. Click **Cron Jobs** tab
3. Should see `gold-rate-fetcher` with "Active" status
4. Check **Logs** to see execution history

## Database Schema

Records are stored with these fields:

```javascript
{
  date: "2024-05-29",              // IST date (YYYY-MM-DD)
  gold18ct: 7299.50,
  gold22ct: 7599.50,
  gold24ct995: 8099.00,
  gold24ct995gw: 8199.00,
  gold24ct999: 8299.00,
  gold14ct: 5399.50,
  silver: 899.50,
  silverCoin: 899.50,
  fetchedAt: 2024-05-29T12:10:00Z  // Timestamp in UTC
}
```

**Key:** `date` is unique per day. Price changes create new documents, old ones are preserved for analytics.

## Duplicate Prevention Logic

```
1. Fetch current prices from API
2. Get latest record from DB
3. Compare all price fields
   - If same → Skip insert (no change)
   - If different → Create new record (price changed)
4. Exit with success code
```

This ensures:
- ✓ No duplicate entries for the same prices
- ✓ Historical tracking of all price changes
- ✓ Efficient storage and queries

## Logging & Monitoring

All operations are logged with `[CRON]` prefix:

```
[CRON] Starting gold rate fetch...
[CRON] Time: 2024-05-29T12:10:00.000Z
[CRON] MongoDB connected
[CRON] Fetching rates for 2024-05-29
[CRON] Rates fetched successfully
[CRON] No price change detected for 2024-05-29 - skipping insert
[CRON] Fetch completed successfully
```

### Monitoring on Render:

1. Go to Cron Jobs → `gold-rate-fetcher`
2. Click on a recent execution to see logs
3. Look for success/error messages

## Testing Locally

```bash
# Set environment variables
export MONGO_URI="your_mongodb_uri"
export NODE_ENV="development"

# Run the cron script manually
npm run cron
```

Expected output:
- Successful: Exit code 0 with `[CRON] Fetch completed successfully`
- Failed: Exit code 1 with error message

## Migration Checklist

- [ ] Remove `node-cron` from index.js (✓ Done)
- [ ] Create `scripts/goldTracker.js` (✓ Done)
- [ ] Update `package.json` with `cron` script (✓ Done)
- [ ] Update `render.yaml` with cron job config (✓ Done)
- [ ] Test locally: `npm run cron`
- [ ] Deploy to Render
- [ ] Verify cron job is active in Render dashboard
- [ ] Check logs after first scheduled execution
- [ ] Monitor for 2-3 days to ensure consistency

## Troubleshooting

### Cron job not running?
- Check `MONGO_URI` env var is set in Render
- Check `NODE_ENV` is `production`
- Look at cron job logs in Render dashboard

### Duplicate entries appearing?
- This shouldn't happen with the new logic
- If it does, check for multiple cron job instances

### High database usage?
- Cron jobs are efficient - only ~2 entries per day max
- Each run is ~1 sec and uses minimal resources

### API fetch failures?
- The script retries internally (3 attempts with delays)
- Check if the external API is responding
- Look at error logs for specific issues

## Frontend Changes

**No changes needed!**
- Frontend only reads from the API endpoints
- No scraping or fetching happens from frontend
- Data is always fresh from DB via API

## Benefits

| Aspect | Before | After |
|--------|--------|-------|
| **Reliability** | ❌ Server-dependent | ✅ Independent cron |
| **Server Restarts** | ❌ Cron stops | ✅ Unaffected |
| **Duplicates** | ❌ May occur | ✅ Prevented |
| **Storage** | ❌ Overwrites daily | ✅ Historical tracking |
| **Monitoring** | ❌ Via server logs | ✅ Render dashboard |
| **Scalability** | ❌ Limited | ✅ Fully scalable |

---

**Questions?** Check the logs or contact support!
