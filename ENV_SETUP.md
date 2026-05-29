# Environment Variables Setup Guide

## Quick Start

### 1. Create Your `.env` File

```bash
# Copy the template
cp .env.example .env

# Edit the file with your values
nano .env
# or
code .env
```

---

## Environment Variables Explained

### Server Configuration

**PORT**
- Default: `3000`
- Used by: Express server
- Change only if port 3000 is in use

**NODE_ENV**
- Options: `development`, `production`
- Affects: Logging level, error handling, CORS policies
- Use: `development` for local testing

### MongoDB Configuration

**MONGO_URI**
- Required for database connection
- Supports local and cloud MongoDB

#### Local MongoDB (Development)
```
MONGO_URI=mongodb://localhost:27017/goldrates
```

Make sure MongoDB is running:
```bash
# Windows
mongod

# macOS
brew services start mongodb-community

# Linux
sudo systemctl start mongod
```

#### MongoDB Atlas (Production/Cloud)
```
MONGO_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/goldrates?retryWrites=true&w=majority
```

Get your connection string:
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a cluster
3. Click "Connect"
4. Choose "Connect your application"
5. Copy the connection string
6. Replace `<username>` and `<password>`

### Frontend CORS

**FRONTEND_URL**
- Your frontend deployment URL
- Used for CORS configuration

Examples:
- Local: `http://localhost:5173`
- Vercel: `https://gold-png-frontend-8ze2.vercel.app`
- Custom domain: `https://goldpng.com`

### GitHub Actions / Cron Security

**CRON_SECRET**
- Used to authenticate requests from GitHub Actions
- Must be strong and random (32+ characters)
- Never share or commit to git

Generate a secure secret:
```bash
# Copy and paste this command:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Output example:
# abc123def456xyz789abc123def456xyz789abc123def456xyz789abc123de
```

Usage:
1. Copy the generated secret
2. Paste in `.env` as `CRON_SECRET`
3. Also add to GitHub Secrets as `CRON_SECRET`
4. Also add to Render environment variables as `CRON_SECRET`

### Telegram Notifications

**TELEGRAM_BOT_TOKEN**
- Authentication token for Telegram Bot API
- Optional (leave empty to skip notifications)

**TELEGRAM_CHAT_ID**
- Your Telegram chat ID (where notifications are sent)
- Optional (leave empty to skip notifications)

#### Setup Instructions

1. **Create a Telegram Bot**
   - Open Telegram
   - Search for [@BotFather](https://t.me/botfather)
   - Message: `/newbot`
   - Follow prompts to create a bot
   - Copy the token (format: `1234567890:ABCDEFG...`)

2. **Get Your Chat ID**
   - Message your newly created bot (send any message)
   - Visit this URL (replace TOKEN):
     ```
     https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates
     ```
   - Look for the response with `"chat":{"id":123456789}`
   - Copy that number (your CHAT_ID)

3. **Add to `.env`**
   ```
   TELEGRAM_BOT_TOKEN=1234567890:ABCDEFGHIJKLmnopqrstuvwxyz
   TELEGRAM_CHAT_ID=123456789
   ```

4. **Test**
   ```bash
   npm start
   # The server should start without errors
   # Check logs for [TELEGRAM] entries
   ```

---

## Development Setup

### Full Configuration Example

```env
# Server
PORT=3000
NODE_ENV=development

# MongoDB (local)
MONGO_URI=mongodb://localhost:27017/goldrates

# Frontend
FRONTEND_URL=http://localhost:5173

# Cron Security
CRON_SECRET=abc123def456xyz789abc123def456xyz789abc123def456xyz789abc123de

# Telegram (optional)
TELEGRAM_BOT_TOKEN=1234567890:ABCDEFGHIJKLmnopqrstuvwxyz
TELEGRAM_CHAT_ID=123456789
```

### Start Development Server

```bash
# Install dependencies
npm install

# Start server
npm start

# Server runs on http://localhost:3000
# Check logs for startup messages
```

---

## Production Setup (Render)

### Configuration

1. **Go to Render Dashboard**
   - Click your service
   - Go to "Environment" tab

2. **Add these variables:**

| Key | Value |
|-----|-------|
| `MONGO_URI` | Your MongoDB Atlas URI |
| `NODE_ENV` | `production` |
| `FRONTEND_URL` | Your Vercel frontend URL |
| `CRON_SECRET` | Same as GitHub secret |
| `TELEGRAM_BOT_TOKEN` | Your Telegram bot token |
| `TELEGRAM_CHAT_ID` | Your Telegram chat ID |

3. **Save and Redeploy**
   - Click "Redeploy"
   - Wait for deployment to complete

---

## GitHub Secrets Setup

### Add Secrets for GitHub Actions

1. Go to: **Repo → Settings → Secrets and variables → Actions**

2. Add these secrets:

| Secret Name | Value |
|------------|-------|
| `CRON_SECRET` | Your generated 32-char secret |
| `BACKEND_URL` | Your Render backend URL (e.g., `https://gold-png-server-xyz.onrender.com`) |
| `TELEGRAM_BOT_TOKEN` | Your Telegram bot token |
| `TELEGRAM_CHAT_ID` | Your Telegram chat ID |

3. These are used by `.github/workflows/gold-fetch.yml`

---

## Validation Checklist

- [ ] `MONGO_URI` connects successfully (test with `npm start`)
- [ ] `PORT` is available (not in use by another process)
- [ ] `NODE_ENV` is set correctly
- [ ] `FRONTEND_URL` is correct (check CORS in console)
- [ ] `CRON_SECRET` is strong (32+ characters)
- [ ] `TELEGRAM_BOT_TOKEN` is valid (if using notifications)
- [ ] `TELEGRAM_CHAT_ID` is correct (if using notifications)
- [ ] `.env` is in `.gitignore` (never commit sensitive data)
- [ ] `.env.example` is in git (for reference)

---

## Troubleshooting

### Server won't start

**Error:** `listen EADDRINUSE`
- Fix: Change `PORT` to different value or kill process on port 3000

**Error:** `connect ECONNREFUSED`
- Fix: Check MongoDB is running and `MONGO_URI` is correct

### CORS errors

**Error:** `No 'Access-Control-Allow-Origin' header`
- Fix: Set `FRONTEND_URL` to correct frontend domain

### Telegram notifications not working

**Error:** `API request failed`
- Fix: Verify `TELEGRAM_BOT_TOKEN` is correct
- Fix: Verify bot received at least one message
- Fix: Check `TELEGRAM_CHAT_ID` is correct

### Cron endpoint returns 401

**Error:** `Unauthorized: Invalid secret`
- Fix: `CRON_SECRET` must match in:
  - `.env` (backend)
  - GitHub Secrets
  - Render Environment Variables

---

## Security Tips

✅ **DO:**
- Generate strong random `CRON_SECRET`
- Store sensitive values in environment variables only
- Use MongoDB Atlas for production
- Regenerate secrets regularly
- Keep `.env` file local (never commit)

❌ **DON'T:**
- Commit `.env` to git
- Use weak secrets (like "password123")
- Share `.env` file contents
- Put secrets in code files
- Use same secret everywhere

---

## Reference

- [MongoDB Connection String](https://www.mongodb.com/docs/manual/reference/connection-string/)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [dotenv Documentation](https://github.com/motdotla/dotenv)
- [Node.js Environment Variables](https://nodejs.org/en/knowledge/file-system/how-to-use-the-fs-module/cli/)

---

## Questions?

- Check logs: `npm start` shows detailed errors
- Review documentation files:
  - `GITHUB_ACTIONS_SETUP.md`
  - `GITHUB_ACTIONS_MIGRATION.md`
- Test endpoint: See `test-cron-endpoint.js`
