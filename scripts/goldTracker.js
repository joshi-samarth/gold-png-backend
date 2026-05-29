#!/usr/bin/env node

/**
 * Standalone Render Cron Job Script
 * Purpose: Fetch gold rates and store historical snapshots
 * Usage: node scripts/goldTracker.js
 * 
 * This script:
 * - Connects to MongoDB
 * - Fetches current gold rates
 * - Prevents duplicate entries (only stores on price change)
 * - Maintains historical snapshots
 * - Exits with proper status codes
 */

require('dotenv').config();

const mongoose = require('mongoose');
const { fetchRates, istDate } = require('../services/fetcher');
const GoldRate = require('../models/GoldRate');

async function run() {
    let mongooseConnection = null;

    try {
        const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/goldrates';

        console.log('[CRON] Starting gold rate fetch...');
        console.log(`[CRON] Time: ${new Date().toISOString()}`);

        // Connect to MongoDB
        mongooseConnection = await mongoose.connect(mongoUri);
        console.log('[CRON] MongoDB connected');

        const dateStr = istDate();
        console.log(`[CRON] Fetching rates for ${dateStr}`);

        // Fetch current rates
        const rates = await fetchRates();
        console.log('[CRON] Rates fetched successfully');

        // Validate critical field
        if (!rates.gold22ct || rates.gold22ct === 0) {
            throw new Error('gold22ct is zero or missing - invalid data');
        }

        // Get the latest record to check for duplicates
        const latestRecord = await GoldRate.findOne().sort({ date: -1 });

        // Check if today's record already exists with same prices
        if (latestRecord && latestRecord.date === dateStr) {
            const isDuplicate =
                latestRecord.gold18ct === rates.gold18ct &&
                latestRecord.gold22ct === rates.gold22ct &&
                latestRecord.gold24ct995 === rates.gold24ct995 &&
                latestRecord.gold24ct995gw === rates.gold24ct995gw &&
                latestRecord.gold24ct999 === rates.gold24ct999 &&
                latestRecord.gold14ct === rates.gold14ct &&
                latestRecord.silver === rates.silver &&
                latestRecord.silverCoin === rates.silverCoin;

            if (isDuplicate) {
                console.log(`[CRON] No price change detected for ${dateStr} - skipping insert`);
                console.log('[CRON] Fetch completed successfully');
                process.exit(0);
            } else {
                // Prices changed today - update the record
                console.log(`[CRON] Price change detected for ${dateStr} - updating record`);
                await GoldRate.findOneAndUpdate(
                    { date: dateStr },
                    { ...rates, fetchedAt: new Date() },
                    { new: true }
                );
                console.log(`[CRON] Record updated for ${dateStr}`);
            }
        } else if (latestRecord && latestRecord.date < dateStr) {
            // Check if prices changed since last record
            const priceChanged =
                latestRecord.gold18ct !== rates.gold18ct ||
                latestRecord.gold22ct !== rates.gold22ct ||
                latestRecord.gold24ct995 !== rates.gold24ct995 ||
                latestRecord.gold24ct995gw !== rates.gold24ct995gw ||
                latestRecord.gold24ct999 !== rates.gold24ct999 ||
                latestRecord.gold14ct !== rates.gold14ct ||
                latestRecord.silver !== rates.silver ||
                latestRecord.silverCoin !== rates.silverCoin;

            if (!priceChanged) {
                console.log(`[CRON] No price change since ${latestRecord.date} - skipping insert`);
                console.log('[CRON] Fetch completed successfully');
                process.exit(0);
            }

            // Prices changed - create new historical record
            console.log(`[CRON] Price change detected - creating new historical record for ${dateStr}`);
            const doc = await GoldRate.create({
                ...rates,
                date: dateStr,
                fetchedAt: new Date()
            });
            console.log(`[CRON] New record created for ${dateStr}`);
            console.log(`[CRON] Gold22ct: ${doc.gold22ct}, Silver: ${doc.silver}`);
        } else {
            // No previous records or today's is the first
            console.log(`[CRON] First-time fetch for ${dateStr}`);
            const doc = await GoldRate.create({
                ...rates,
                date: dateStr,
                fetchedAt: new Date()
            });
            console.log(`[CRON] Initial record created for ${dateStr}`);
        }

        console.log('[CRON] Fetch completed successfully');
        process.exit(0);

    } catch (error) {
        console.error('[CRON] Fetch failed:', error.message);
        if (error.stack) {
            console.error('[CRON] Stack trace:', error.stack);
        }
        process.exit(1);

    } finally {
        // Ensure MongoDB connection is closed
        if (mongooseConnection) {
            try {
                await mongoose.disconnect();
                console.log('[CRON] MongoDB disconnected');
            } catch (disconnectError) {
                console.error('[CRON] Error disconnecting MongoDB:', disconnectError.message);
            }
        }
    }
}

run();
