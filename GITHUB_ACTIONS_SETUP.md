# GitHub Actions Setup Guide

## Overview

Your gold price tracker has been refactored to use **GitHub Actions** for scheduling instead of Render Cron Jobs.

### Benefits

| Aspect | Render Cron | GitHub Actions |
|--------|-------------|----------------|
| **Cost** | Free tier | Completely free ✅ |
| **Reliability** | Tied to service | Independent ✅ |
| **Visibility** | Limited | Full logs in GitHub ✅ |
| **Complexity** | Managed | Declarative (YAML) ✅ |
| **Setup** | Manual | Auto from repo ✅ |

---

## Architecture

```
GitHub Actions (Every 15 mins)
    ↓
  curl POST /api/cron/fetch-gold
    ↓
  Render Backend (validates CRON_SECRET)
    ↓
  Fetch gold rates from API
    ↓
  Check for duplicates
    ↓
  Save if changed
    ↓
  Send Telegram notification
    ↓
  Return status (success/failure)
```

---

## Setup Steps

### 1. **Add GitHub Secrets**

Go to: **GitHub Repo → Settings → Secrets and variables → Actions**

Add these secrets:

| Secret | Value | Example |
|--------|-------|---------|
| `CRON_SECRET` | Secure random string | `sup3r_s3cr3t_k3y_12345` |
| `BACKEND_URL` | Your Render backend URL | `https://gold-png-server-abc123.onrender.com` |
| `TELEGRAM_BOT_TOKEN` | From BotFather | `1234567890:ABCdEfGHIjKLmnoPqRSTuvwXYZ...` |
| `TELEGRAM_CHAT_ID` | Your Telegram chat ID | `123456789` |

#### How to get these:

**CRON_SECRET:**
```bash
# Generate a random secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**TELEGRAM_BOT_TOKEN & TELEGRAM_CHAT_ID:**
- Message [@BotFather](https://t.me/botfather) on Telegram
- Create a new bot
- Get the token
- Message your bot something
- Go to `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates`
- Find `chat.id` in the response

**BACKEND_URL:**
- Your Render backend deployment URL
- Example: `https://gold-png-server-xyz.onrender.com`

### 2. **Set Environment Variables on Render**

Go to: **Render Dashboard → Your Service → Environment**

Add these environment variables:

```
CRON_SECRET = <same value as GitHub secret>
TELEGRAM_BOT_TOKEN = <your bot token>
TELEGRAM_CHAT_ID = <your chat id>
```

### 3. **Test the Endpoint**

Test locally:

```bash
# Terminal 1: Start backend
npm start

# Terminal 2: Call the endpoint
curl -X POST \
  -H "x-cron-secret: your_secret_key" \
  -H "Content-Type: application/json" \
  http://localhost:3000/api/cron/fetch-gold
```

Expected response:

```json
{
  "success": true,
  "message": "Price change detected and saved",
  "inserted": true,
  "rates": { ... },
  "duration": "2345ms",
  "timestamp": "2026-05-29T16:45:00.000Z"
}
```

### 4. **Verify GitHub Actions is Running**

Go to: **GitHub Repo → Actions**

- Should see `Gold Price Fetcher` workflow
- Check past runs to verify it's executing
- Look for successful runs (green checkmarks)

---

## How It Works

### GitHub Actions Workflow

File: `.github/workflows/gold-fetch.yml`

```yaml
schedule:
  - cron: '*/15 3-15 * * *'  # Every 15 mins, 3 AM-3 PM UTC
```

**Schedule Breakdown:**
- `*/15` = Every 15 minutes
- `3-15` = Hours 3 AM to 3 PM UTC
- `*` = Every day
- `*` = Every month
- `*` = Every weekday

**In IST (India Standard Time):**
- 3 AM UTC = 8:30 AM IST
- 3 PM UTC = 8:30 PM IST
- **Runs 48 times per day** (every 15 minutes during trading hours)

### Endpoint: POST /api/cron/fetch-gold

**Location:** `routes/cron.js`

**Authentication:**
- Header: `x-cron-secret`
- Must match `process.env.CRON_SECRET`
- Returns 401 if invalid/missing

**Workflow:**
1. Validates secret header
2. Fetches current gold rates
3. Gets latest DB record
4. Compares prices
5. Inserts only if changed (no duplicates)
6. Sends Telegram notification if changed
7. Returns JSON response with status

**Response Examples:**

Success (no change):
```json
{
  "success": true,
  "message": "No price change detected",
  "inserted": false,
  "duration": "2100ms",
  "timestamp": "2026-05-29T16:45:00.000Z"
}
```

Success (price changed):
```json
{
  "success": true,
  "message": "Price change detected and saved",
  "inserted": true,
  "rates": { gold22ct: 7645, ... },
  "duration": "2300ms",
  "timestamp": "2026-05-29T16:45:00.000Z"
}
```

Error (invalid secret):
```json
{
  "success": false,
  "error": "Unauthorized: Invalid secret"
}
```

---

## Telegram Notifications

### Format

When prices change, you receive:

```
🚨 GOLD PRICE ALERT

🥇 24K Gold: 📈
   ₹8299.00 → ₹8350.00
   +₹51.00

🥇 22K Gold: 📈
   ₹7599.00 → ₹7645.00
   +₹46.00

🥇 18K Gold: 📈
   ₹5399.00 → ₹5440.00
   +₹41.00

⚪ Silver: 📈
   ₹899.00 → ₹905.00
   +₹6.00

⏰ 29/05/2026, 10:15 AM IST
```

### Features

- ✅ Only sends when prices actually change
- ✅ Shows direction: 📈 up, 📉 down, ➡️ no change
- ✅ Displays price difference in rupees
- ✅ Professional HTML formatted
- ✅ IST timestamp

### Utility

Location: `utils/sendTelegramAlert.js`

Sends alerts using Telegram Bot API:
- 10-second timeout
- Error handling (doesn't fail if Telegram is down)
- Logs all events

---

## Monitoring

### View Workflow Logs

1. Go to **GitHub Repo → Actions**
2. Click on `Gold Price Fetcher`
3. Click on a recent run
4. View the `Fetch Gold Prices` step output

Example log:
```
> curl -X POST -H "x-cron-secret: ***" ... http://localhost:3000/api/cron/fetch-gold
{
  "success": true,
  "message": "Price change detected and saved",
  "inserted": true,
  "duration": "2345ms"
}
HTTP Status: 200
```

### Check Render Logs

1. Go to **Render Dashboard → Your Service**
2. Click **Logs** tab
3. Look for `[CRON-API]` entries

Example logs:
```
[CRON-API] Fetch triggered at 2026-05-29T16:45:00.000Z
[CRON-API] Fetching rates from API...
[CRON-API] Rates fetched successfully
[CRON-API] Price change detected for 2026-05-29 - updating record
[CRON-API] Sending Telegram notification...
[TELEGRAM] Alert sent successfully (Message ID: 12345)
[CRON-API] Fetch completed successfully (2345ms)
```

---

## Security

### CRON_SECRET Protection

- **Why:** Prevents unauthorized API calls
- **How:** Every request must include valid header
- **Best Practice:** Use strong random string (32+ characters)

### Change Secret Regularly

```bash
# Generate new secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Update in:
# 1. GitHub Secrets
# 2. Render Environment Variables
# 3. Test locally before deployment
```

---

## Troubleshooting

### Workflow not triggering?

**Check:**
1. Is `.github/workflows/gold-fetch.yml` in main branch?
2. Go to **Actions** tab - any errors?
3. GitHub Actions enabled in repo settings?

### Endpoint returns 401

**Check:**
1. `CRON_SECRET` matches in GitHub and Render
2. Header is `x-cron-secret` (lowercase)
3. Value doesn't have extra spaces

### Telegram notifications not sending

**Check:**
1. `TELEGRAM_BOT_TOKEN` is valid (get fresh from BotFather)
2. `TELEGRAM_CHAT_ID` is correct
3. Bot has been messaged (so it can send messages)
4. Check Render logs for `[TELEGRAM]` errors

### No price changes recorded

**Check:**
1. API is returning valid data
2. Prices actually changed
3. Check database has recent records
4. Look at workflow logs for `duration` (shouldn't exceed 30s)

### High latency (>20s)

**Why:**
- External API is slow
- Database queries are slow
- Network latency

**Solution:**
- This is normal for production
- Timeout is set to 30s (accommodates 20s fetches)
- If consistently >30s, optimize queries or API calls

---

## Comparison: Before vs After

### Before (Render Cron Jobs)

```yaml
cronjobs:
  - name: gold-rate-fetcher
    schedule: "*/15 3-15 * * *"
    command: npm run scripts/goldTracker.js
```

**Issues:**
- ❌ Tied to Render service
- ❌ Limited visibility
- ❌ Manual setup in dashboard
- ❌ Scripts/goldTracker.js must exist

### After (GitHub Actions)

```yaml
schedule:
  - cron: '*/15 3-15 * * *'
```

**Benefits:**
- ✅ Independent scheduler
- ✅ Full logs in GitHub
- ✅ Version controlled (YAML)
- ✅ Easy to modify
- ✅ Uses existing API endpoints
- ✅ Telegram notifications built-in

---

## Files Modified/Created

```
.github/
  └── workflows/
      └── gold-fetch.yml                    (NEW) ✨

routes/
  └── cron.js                               (NEW) ✨

utils/
  └── sendTelegramAlert.js                  (NEW) ✨

index.js                                    (MODIFIED) - Added cronRouter
render.yaml                                 (MODIFIED) - Removed cron job, added env vars
GITHUB_ACTIONS_SETUP.md                     (NEW) ✨
```

---

## Next Steps

1. **Commit & Push to GitHub**
   ```bash
   git add .
   git commit -m "Switch to GitHub Actions for scheduling"
   git push origin main
   ```

2. **Add GitHub Secrets** (as documented above)

3. **Update Render Environment Variables** (as documented above)

4. **Test the Endpoint** (locally)

5. **Monitor First Execution**
   - Go to GitHub Actions tab
   - Wait for next scheduled run (within 15 mins)
   - Check Render logs
   - Verify Telegram notification

---

**Status:** ✅ Ready to deploy!

Questions? Check `.github/workflows/gold-fetch.yml` or `routes/cron.js` for code comments.
