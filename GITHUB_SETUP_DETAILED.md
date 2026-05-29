# GitHub Settings & Secrets Setup Guide

## Overview

This guide covers setting up:
1. **GitHub Secrets** - For secure environment variables
2. **Branch Protection Rules** - To protect main branch
3. **Rulesets** - To enforce workflow requirements

---

## Part 1: GitHub Secrets Setup

### What are GitHub Secrets?

Secrets are encrypted environment variables used by GitHub Actions workflows. They're:
- ✅ Encrypted and hidden in logs
- ✅ Not visible in code or workflow files
- ✅ Accessed via `${{ secrets.SECRET_NAME }}`
- ✅ Never committed to git

### Step 1: Go to Secrets Settings

1. Open your repo: `https://github.com/joshi-samarth/gold-png-backend`
2. Click **Settings** (top menu)
3. Go to **Secrets and variables → Actions** (left sidebar)
4. You'll see **Repository secrets** section

### Step 2: Add Required Secrets

Click **New repository secret** and add these 4 secrets:

#### Secret 1: CRON_SECRET

```
Name: CRON_SECRET
Value: <generate with command below>
```

Generate a strong secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Example output (copy this format):
```
abc123def456ghi789jkl012mno345pqr678stu901vwx234yz
```

#### Secret 2: BACKEND_URL

```
Name: BACKEND_URL
Value: https://gold-png-server-xyz.onrender.com
```

**How to get your Render URL:**
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click your service
3. Copy the URL from "Service" section (e.g., https://gold-png-server-abc123.onrender.com)

#### Secret 3: TELEGRAM_BOT_TOKEN

```
Name: TELEGRAM_BOT_TOKEN
Value: 1234567890:ABCDEFGHIJKLmnopqrstuvwxyz
```

**How to get Telegram bot token:**
1. Message [@BotFather](https://t.me/botfather) on Telegram
2. Send: `/newbot`
3. Follow prompts to create a bot
4. Copy the token (format: `NUMBER:LETTERS`)

#### Secret 4: TELEGRAM_CHAT_ID

```
Name: TELEGRAM_CHAT_ID
Value: 123456789
```

**How to get your Telegram chat ID:**
1. Message your newly created bot (any message like "hi")
2. Visit (replace TOKEN):
   ```
   https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates
   ```
3. Look for `"chat":{"id":123456789}`
4. Copy that number

### Step 3: Verify Secrets Added

Your Secrets page should show:
```
✓ CRON_SECRET
✓ BACKEND_URL
✓ TELEGRAM_BOT_TOKEN
✓ TELEGRAM_CHAT_ID
```

---

## Part 2: Branch Protection Rules

### Why Branch Protection?

Protects your `main` branch by:
- ✅ Requiring pull requests before merging
- ✅ Requiring status checks to pass
- ✅ Preventing accidental force pushes
- ✅ Ensuring code quality

### Setup Branch Protection

1. Go to **Settings → Branches** (left sidebar)
2. Click **Add branch protection rule**
3. Fill in the form:

#### Basic Settings

```
Branch name pattern: main
```

#### Protection Options

Check these boxes:

- [x] **Require a pull request before merging**
  - Required approving reviews: 1
  - Dismiss stale pull request approvals when new commits are pushed
  - Require status checks to pass before merging

- [x] **Require status checks to pass before merging**
  - Required status checks:
    - `Gold Price Fetcher` (from your GitHub Actions workflow)

- [x] **Include administrators**
  - Even admins must follow these rules

- [x] **Restrict who can push to matching branches**
  - Allow only following to push: (you can leave default)

#### Optional Settings

- [x] **Allow auto-merge**
  - Allows auto-merging when requirements are met
- [x] **Allow force pushes**
  - Only for administrators (safer)
- [x] **Allow deletions**
  - Unchecked (prevent accidental deletion)

### Click "Create" to Save

---

## Part 3: Rulesets (New Alternative)

### What are Rulesets?

**Rulesets** are newer than branch protection and offer:
- ✅ More granular control
- ✅ Better organization
- ✅ Reusable across repos

### Setup Rulesets

1. Go to **Settings → Rules → Rulesets** (left sidebar)
2. Click **New ruleset** (blue button)
3. Fill in details:

#### Step 1: Basic Information

```
Name: Main Branch Protection
Enforcement: Active
```

#### Step 2: Targets

- [x] Include default branch
- [x] Repository name: `gold-png-backend`

#### Step 3: Rules

Add these rules:

**Rule 1: Require pull request reviews**
```
Require 1 pull request review
```

**Rule 2: Require status checks**
```
Status checks that must pass:
- Gold Price Fetcher (GitHub Actions)
```

**Rule 3: Restrict deletion**
```
Prevent branch deletion: Yes
```

**Rule 4: Require branches to be up to date**
```
Before merge: Yes
```

#### Step 4: Bypass Options

```
Bypass list: <Your GitHub username>
(Allows you to bypass if needed)
```

### Click "Create ruleset" to Save

---

## Part 4: GitHub Actions Workflow Verification

### Verify Workflow File

Your workflow file: `.github/workflows/gold-fetch.yml`

Check it has:

```yaml
name: Gold Price Fetcher

on:
  schedule:
    - cron: '*/15 3-15 * * *'

jobs:
  fetch-gold:
    runs-on: ubuntu-latest
    steps:
      - name: Fetch Gold Prices
        run: |
          curl -X POST \
            -H "x-cron-secret: ${{ secrets.CRON_SECRET }}" \
            "${{ secrets.BACKEND_URL }}/api/cron/fetch-gold" \
            --retry 3 \
            --max-time 60
```

### View Workflow Runs

1. Go to **Actions** tab
2. Click **Gold Price Fetcher**
3. See all scheduled runs
4. Click a run to view logs

---

## Setup Checklist

### GitHub Secrets ✅
- [ ] Added `CRON_SECRET` (32-char random string)
- [ ] Added `BACKEND_URL` (your Render service URL)
- [ ] Added `TELEGRAM_BOT_TOKEN` (from BotFather)
- [ ] Added `TELEGRAM_CHAT_ID` (your Telegram chat ID)
- [ ] All 4 secrets appear on Secrets page

### Branch Protection ✅
- [ ] Created branch protection rule for `main`
- [ ] Required pull requests enabled
- [ ] Status checks required
- [ ] Include administrators enabled

### Rulesets (Optional) ✅
- [ ] Created ruleset for `main` branch
- [ ] Pull request review required
- [ ] Status checks configured
- [ ] Branch deletion prevented

### Render Environment ✅
- [ ] Added `CRON_SECRET` to Render env vars
- [ ] Added `TELEGRAM_BOT_TOKEN` to Render env vars
- [ ] Added `TELEGRAM_CHAT_ID` to Render env vars
- [ ] Service redeployed

### Backend Code ✅
- [ ] `.github/workflows/gold-fetch.yml` exists
- [ ] `routes/cron.js` has `validateCronSecret` middleware
- [ ] `utils/sendTelegramAlert.js` sends notifications
- [ ] `.env` configured locally

---

## How It All Works Together

```
1. GitHub Actions Scheduler (every 15 mins)
   ↓
2. Uses secrets from GitHub Secrets
   ↓
3. Calls your Render backend with CRON_SECRET header
   ↓
4. Render validates secret matches env var
   ↓
5. Fetch gold prices and compare
   ↓
6. If changed, send Telegram notification
   ↓
7. GitHub Actions logs the result
```

---

## Testing

### Test Locally First

```bash
# Set environment variables
export CRON_SECRET="your-secret"
export MONGO_URI="your-mongo-uri"
export TELEGRAM_BOT_TOKEN="your-token"
export TELEGRAM_CHAT_ID="your-chat-id"

# Start server
npm start

# In another terminal, test the endpoint
curl -X POST \
  -H "x-cron-secret: your-secret" \
  http://localhost:3000/api/cron/fetch-gold
```

### Test with GitHub Actions

After pushing to main:

1. Go to **Actions** tab
2. Wait for next scheduled run (within 15 minutes)
3. Click on the workflow run
4. View the "Fetch Gold Prices" step
5. Check logs for success/errors

Example log output:
```
> curl -X POST -H "x-cron-secret: ***" ...
{"success":true,"message":"Price change detected","inserted":true}
HTTP Status: 200
```

---

## Troubleshooting

### Workflow not triggering?

**Check:**
1. Is `.github/workflows/gold-fetch.yml` in main branch?
2. Go to Actions → Gold Price Fetcher → see any error messages?
3. Schedule is `*/15 3-15 * * *` (every 15 mins, UTC)

### Secrets not working?

**Check:**
1. Secrets are added in GitHub (Settings → Secrets)
2. Workflow uses correct syntax: `${{ secrets.CRON_SECRET }}`
3. Secret names match exactly (case-sensitive)

### Endpoint returns 401?

**Check:**
1. `CRON_SECRET` matches in GitHub Secrets AND Render Environment
2. Workflow passes header: `-H "x-cron-secret: ${{ secrets.CRON_SECRET }}"`
3. Backend validates: `if (header !== process.env.CRON_SECRET)`

### Branch protection blocking merges?

**Check:**
1. Workflow status is "passing" (green checkmark)
2. Pull request has 1 approval
3. Branch is up to date with main

---

## Security Best Practices

✅ **DO:**
- Use strong random secrets (32+ characters)
- Store all secrets in GitHub Secrets (never in code)
- Rotate secrets every 3-6 months
- Use branch protection on production branches
- Review all PRs before merging
- Enable branch protection rules

❌ **DON'T:**
- Commit `.env` file with real secrets
- Share secret values
- Use same secret in multiple places
- Disable status checks
- Force push to main
- Commit secrets to git history

---

## Quick Reference

### GitHub URLs

- **Secrets:** `https://github.com/joshi-samarth/gold-png-backend/settings/secrets/actions`
- **Branch Protection:** `https://github.com/joshi-samarth/gold-png-backend/settings/branches`
- **Rulesets:** `https://github.com/joshi-samarth/gold-png-backend/settings/rules`
- **Actions:** `https://github.com/joshi-samarth/gold-png-backend/actions`

### Generate Commands

```bash
# Generate CRON_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate stronger secret (64 chars)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## Next Steps

1. ✅ Add GitHub Secrets (CRON_SECRET, BACKEND_URL, TELEGRAM tokens)
2. ✅ Set up Branch Protection for main branch
3. ✅ (Optional) Create Ruleset for stricter control
4. ✅ Update Render Environment Variables
5. ✅ Push changes to trigger GitHub Actions
6. ✅ Monitor first workflow run
7. ✅ Check Telegram for price alerts

---

**Status:** Ready to deploy! 🚀

See `GITHUB_ACTIONS_SETUP.md` for additional details.
