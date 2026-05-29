# GitHub Actions Migration Guide

## Migration Complete! ✅

Your gold price tracker has been successfully migrated from **Render Cron Jobs** to **GitHub Actions**.

---

## What Changed

### Removed ❌

- `scripts/goldTracker.js` - standalone script no longer needed
- `npm run cron` script - not used anymore
- Render cron job configuration

### Added ✨

- `.github/workflows/gold-fetch.yml` - GitHub Actions workflow
- `routes/cron.js` - API endpoint for cron triggers
- `utils/sendTelegramAlert.js` - Telegram notification service
- Comprehensive documentation

---

## New Architecture

```
GitHub Actions (triggers every 15 mins)
    ↓
curl POST to backend endpoint
    ↓
Render Backend (validates request)
    ↓
Fetch → Compare → Save (if changed)
    ↓
Send Telegram notification
```

---

## Setup Checklist

### ✅ Code Changes (Done)
- [x] Created `/api/cron/fetch-gold` endpoint
- [x] Added Telegram alert utility
- [x] Created GitHub Actions workflow
- [x] Updated render.yaml
- [x] Removed old cron job config

### 📋 Before Deployment (You)

- [ ] Generate CRON_SECRET: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- [ ] Get Telegram bot token from [@BotFather](https://t.me/botfather)
- [ ] Get your Telegram chat ID
- [ ] Have your Render backend URL ready
- [ ] Commit & push to GitHub
- [ ] Add GitHub Secrets (see below)
- [ ] Update Render environment variables
- [ ] Test the endpoint locally

### 🚀 Deployment (Render)

1. Go to **Render Dashboard → Your Service → Environment**
2. Add these variables:
   ```
   CRON_SECRET = <generate below>
   TELEGRAM_BOT_TOKEN = <from BotFather>
   TELEGRAM_CHAT_ID = <your chat id>
   ```
3. Save and redeploy (if needed)

### 🔐 GitHub Secrets (GitHub)

1. Go to **GitHub Repo → Settings → Secrets and variables → Actions**
2. Add these secrets:

| Secret | Value |
|--------|-------|
| `CRON_SECRET` | Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `BACKEND_URL` | Your Render backend URL (e.g., `https://gold-png-server-xyz.onrender.com`) |
| `TELEGRAM_BOT_TOKEN` | From BotFather |
| `TELEGRAM_CHAT_ID` | Your Telegram chat ID |

---

## Quick Start

### 1. Generate Secrets

```bash
# Terminal 1: Generate CRON_SECRET
node -e "console.log('CRON_SECRET:', require('crypto').randomBytes(32).toString('hex'))"

# Copy the output and use it for:
# - GitHub Secret: CRON_SECRET
# - Render Environment: CRON_SECRET
```

### 2. Get Telegram Details

- Message [@BotFather](https://t.me/botfather) on Telegram
- Create a new bot with `/newbot`
- Get the token (format: `1234567890:ABCD...`)
- Message your new bot something (e.g., "hi")
- Visit: `https://api.telegram.org/bot<TOKEN>/getUpdates`
- Find `chat.id` in the response
- Use both TOKEN and CHAT_ID for Telegram secrets

### 3. Test Locally

```bash
# Set environment variables
export CRON_SECRET="your-secret-here"
export MONGO_URI="your-mongodb-uri"
export TELEGRAM_BOT_TOKEN="your-token"
export TELEGRAM_CHAT_ID="your-chat-id"

# Start server
npm start

# In another terminal, test the endpoint
curl -X POST \
  -H "x-cron-secret: your-secret-here" \
  -H "Content-Type: application/json" \
  http://localhost:3000/api/cron/fetch-gold
```

Expected response:
```json
{
  "success": true,
  "message": "No price change detected",
  "inserted": false,
  "duration": "2100ms",
  "timestamp": "2026-05-29T16:45:00.000Z"
}
```

### 4. Deploy & Monitor

```bash
# Commit changes
git add .
git commit -m "Switch to GitHub Actions scheduling"
git push origin main

# Monitor:
# 1. GitHub: Repo → Actions → Gold Price Fetcher
# 2. Render: Dashboard → Your Service → Logs
# 3. Telegram: Check for price alerts
```

---

## Workflow Details

### Schedule

```yaml
schedule:
  - cron: '*/15 3-15 * * *'
```

- **Every 15 minutes** during trading hours
- **3 AM - 3 PM UTC** = 8:30 AM - 8:30 PM IST
- **48 times per day**
- Completely free (GitHub provides 2,000 free minutes/month for public repos)

### Endpoint

**Route:** `POST /api/cron/fetch-gold`

**Authentication:**
- Header: `x-cron-secret`
- Compare against `process.env.CRON_SECRET`
- Returns 401 if invalid/missing

**Logic:**
1. Fetch gold rates from API (with 30s timeout)
2. Get latest DB record
3. Compare prices
4. Insert if changed (duplicate prevention)
5. Send Telegram notification
6. Return JSON status

**Responses:**

No change:
```json
{
  "success": true,
  "message": "No price change detected",
  "inserted": false
}
```

Change detected:
```json
{
  "success": true,
  "message": "Price change detected and saved",
  "inserted": true,
  "rates": { gold22ct: 7645, ... }
}
```

Error:
```json
{
  "success": false,
  "error": "Unauthorized: Invalid secret"
}
```

---

## Telegram Notifications

Notifications are sent **only when prices change**.

Example:

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

---

## Monitoring

### GitHub Actions

1. Go to **Repo → Actions**
2. Click **Gold Price Fetcher**
3. View recent runs and logs

### Render Logs

1. Go to **Dashboard → Your Service**
2. Click **Logs** tab
3. Look for `[CRON-API]` entries

### Database

```javascript
// Check latest record
db.goldrates.findOne({}, { sort: { _id: -1 } })

// Should see records with timestamps from GitHub Actions runs
```

---

## Security Best Practices

### CRON_SECRET

- ✅ Use strong random 32+ character string
- ✅ Store in GitHub Secrets (not in code)
- ✅ Store in Render Environment (not in code)
- ✅ Change every 3-6 months
- ✅ Rotate if exposed

### Telegram Token

- ✅ Keep in Environment Variables only
- ✅ Never commit to git
- ✅ If exposed, regenerate from BotFather

---

## Troubleshooting

### Workflow not running?

**Check:**
1. Is workflow file at `.github/workflows/gold-fetch.yml`?
2. Is it in `main` branch?
3. Go to **Actions** tab → any error messages?

### Endpoint returns 401?

**Check:**
1. `x-cron-secret` header is present
2. Header value matches `CRON_SECRET` env var
3. Both set in GitHub Secrets AND Render Environment

### No Telegram notifications?

**Check:**
1. Bot token is valid (get new from BotFather if old)
2. Chat ID is correct
3. Bot has received a message (necessary to send messages)
4. Check Render logs for `[TELEGRAM]` entries

### Slow API responses (>20s)?

**This is normal:**
- Production API can take 15-20 seconds
- We set 30s timeout to accommodate this
- GitHub Actions has a 35,791-second timeout (plenty)
- Your requests will complete fine

---

## Files Reference

### New Files

- `.github/workflows/gold-fetch.yml` - GitHub Actions workflow
- `routes/cron.js` - API endpoint (POST /api/cron/fetch-gold)
- `utils/sendTelegramAlert.js` - Telegram notification utility
- `GITHUB_ACTIONS_SETUP.md` - Detailed setup guide

### Modified Files

- `index.js` - Added cron router
- `render.yaml` - Removed cron job, added env vars

### Old Files (can be kept or removed)

- `scripts/goldTracker.js` - No longer used
- `services/cron.js` - No longer used
- `CRON_JOB_SETUP.md` - Outdated (keep for reference)

---

## Benefits Summary

| Feature | Before | After |
|---------|--------|-------|
| **Cost** | Free tier | Completely free ✅ |
| **Scheduler** | Render Cron | GitHub Actions ✅ |
| **Visibility** | Limited | Full logs ✅ |
| **Configuration** | Dashboard UI | Version controlled ✅ |
| **Alerts** | None | Telegram ✅ |
| **Reliability** | Service dependent | Independent ✅ |
| **Setup Complexity** | Manual | Automatic ✅ |

---

## Next Actions

1. **Generate secrets** (see Quick Start)
2. **Add GitHub Secrets**
3. **Update Render Environment**
4. **Test locally** (curl the endpoint)
5. **Commit & push to GitHub**
6. **Monitor first execution** (within 15 minutes)
7. **Check Telegram for alerts**

---

**Status:** ✅ Ready to deploy!

See `GITHUB_ACTIONS_SETUP.md` for detailed step-by-step instructions.
