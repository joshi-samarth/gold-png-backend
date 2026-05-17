const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
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

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api', ratesRouter);
app.use('/api', myGoldRouter);
app.use('/api', soldRouter);

// Serve React build in production
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../client/dist')));
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '../client/dist/index.html'));
    });
}

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
