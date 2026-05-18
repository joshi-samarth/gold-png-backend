const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const compression = require('compression');
require('dotenv').config();

const ratesRouter = require('./routes/rates');
const myGoldRouter = require('./routes/mygold');
const soldRouter = require('./routes/sold');
const { setupCron } = require('./services/cron');
const { backfill, istDate } = require('./services/fetcher');
const { seedSoldEntries } = require('./services/seed');
const MyGold = require('./models/MyGold');
const GoldRate = require('./models/GoldRate');

const app = express();

// Middleware - CORS Configuration
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://gold-png-frontend-8ze2.vercel.app',
    process.env.FRONTEND_URL
].filter(Boolean);

// Dynamic CORS origin checker to allow all Vercel preview deployments
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or Postman)
        if (!origin) return callback(null, true);

        // Check if origin is in whitelist
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        // Allow all Vercel deployments (*.vercel.app)
        else if (origin.includes('vercel.app')) {
            callback(null, true);
        }
        // Allow localhost for development
        else if (origin.includes('localhost')) {
            callback(null, true);
        }
        else {
            callback(new Error('CORS not allowed'));
        }
    },
    credentials: true
};

app.use(cors(corsOptions));

// Compression middleware for faster responses
app.use(compression());

// Express middleware
// Express middleware
app.use(express.json());

// Cache middleware for API responses (1 hour for data)
app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
        res.set('Cache-Control', 'public, max-age=300'); // 5 minutes for API data
    }
    next();
});

// API Routes
app.use('/api', ratesRouter);
app.use('/api', myGoldRouter);
app.use('/api', soldRouter);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'Backend is running' });
});

// MongoDB Connection & Startup
async function start() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/goldrates');
        console.log('✓ MongoDB connected');

        // Ensure MyGold exists
        let myGold = await MyGold.findOne();
        if (!myGold) {
            myGold = await MyGold.create({
                gold18ct: 14.263,
                gold22ct: 13.783,
                gold24ct: 8
            });
            console.log('✓ MyGold initialized with defaults');
        }

        // Seed sold entries
        await seedSoldEntries();

        // Backfill historical data
        await backfill();

        // Check if today's record is recent enough
        const today = istDate();
        const todayDoc = await GoldRate.findOne({ date: today });
        if (!todayDoc) {
            const { fetchAndSave } = require('./services/fetcher');
            try {
                await fetchAndSave(today);
                console.log('✓ Fetched today\'s rates');
            } catch (error) {
                console.error('Failed to fetch today\'s rates:', error.message);
            }
        } else if (todayDoc.fetchedAt) {
            const hoursSinceFetch = (Date.now() - todayDoc.fetchedAt) / (1000 * 60 * 60);
            if (hoursSinceFetch > 4) {
                const { fetchAndSave } = require('./services/fetcher');
                try {
                    await fetchAndSave(today);
                    console.log('✓ Updated today\'s rates (older than 4 hours)');
                } catch (error) {
                    console.error('Failed to update today\'s rates:', error.message);
                }
            }
        }

        // Setup cron jobs
        setupCron();

        const PORT = process.env.PORT || 3000;
        app.listen(PORT, () => {
            console.log(`✓ Server running on http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('Startup error:', error.message);
        process.exit(1);
    }
}

start();

module.exports = app;
