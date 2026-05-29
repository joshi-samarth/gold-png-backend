/**
 * Cron Route Handler
 * Purpose: Secure endpoint for GitHub Actions to trigger gold rate fetches
 * 
 * Security:
 * - Validates x-cron-secret header
 * - Only processes authorized requests
 * - Returns 401 for invalid/missing secret
 * 
 * Endpoint: POST /api/cron/fetch-gold
 */

const express = require('express');
const router = express.Router();
const { fetchRates, istDate } = require('../services/fetcher');
const GoldRate = require('../models/GoldRate');
const { sendTelegramAlert } = require('../utils/sendTelegramAlert');

/**
 * Middleware: Validate CRON_SECRET header
 */
const validateCronSecret = (req, res, next) => {
    const secret = req.headers['x-cron-secret'];
    const expectedSecret = process.env.CRON_SECRET;

    if (!expectedSecret) {
        console.error('[CRON-API] CRON_SECRET not configured in environment');
        return res.status(500).json({
            success: false,
            error: 'Server configuration error'
        });
    }

    if (!secret) {
        console.warn('[CRON-API] Unauthorized: Missing x-cron-secret header');
        return res.status(401).json({
            success: false,
            error: 'Unauthorized: Missing x-cron-secret header'
        });
    }

    if (secret !== expectedSecret) {
        console.warn('[CRON-API] Unauthorized: Invalid x-cron-secret');
        return res.status(401).json({
            success: false,
            error: 'Unauthorized: Invalid secret'
        });
    }

    next();
};

/**
 * POST /api/cron/fetch-gold
 * 
 * Triggered by: GitHub Actions (every 15 mins)
 * 
 * Workflow:
 * 1. Fetch current gold rates from API
 * 2. Compare with latest DB record
 * 3. Insert only if prices changed
 * 4. Send Telegram notification if changed
 * 5. Return status
 */
router.post('/cron/fetch-gold', validateCronSecret, async (req, res) => {
    const startTime = Date.now();
    const dateStr = istDate();

    try {
        console.log(`[CRON-API] Fetch triggered at ${new Date().toISOString()}`);

        // Fetch current rates
        console.log('[CRON-API] Fetching rates from API...');
        const rates = await fetchRates();
        console.log('[CRON-API] Rates fetched successfully');

        // Validate critical field
        if (!rates.gold22ct || rates.gold22ct === 0) {
            console.error('[CRON-API] Invalid rates: gold22ct is zero or missing');
            return res.status(400).json({
                success: false,
                error: 'Invalid API response: gold22ct missing or zero',
                timestamp: new Date().toISOString()
            });
        }

        // Get latest record to check for duplicates
        const latestRecord = await GoldRate.findOne().sort({ date: -1 });
        let priceChanged = false;
        let oldPrices = null;

        // Determine if prices changed
        if (latestRecord && latestRecord.date === dateStr) {
            // Same day - check if prices changed
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
                console.log(`[CRON-API] No price change for ${dateStr} - skipping insert`);
                return res.json({
                    success: true,
                    message: 'No price change detected',
                    inserted: false,
                    duration: `${Date.now() - startTime}ms`,
                    timestamp: new Date().toISOString()
                });
            } else {
                // Prices changed today - update record
                priceChanged = true;
                oldPrices = {
                    gold18ct: latestRecord.gold18ct,
                    gold22ct: latestRecord.gold22ct,
                    gold24ct995: latestRecord.gold24ct995,
                    gold24ct995gw: latestRecord.gold24ct995gw,
                    gold24ct999: latestRecord.gold24ct999,
                    gold14ct: latestRecord.gold14ct,
                    silver: latestRecord.silver,
                    silverCoin: latestRecord.silverCoin
                };

                console.log(`[CRON-API] Price change detected for ${dateStr} - updating record`);
                await GoldRate.findOneAndUpdate(
                    { date: dateStr },
                    { ...rates, fetchedAt: new Date() },
                    { new: true }
                );
            }
        } else if (latestRecord && latestRecord.date < dateStr) {
            // New day - check if prices changed since yesterday
            const pricesUnchanged =
                latestRecord.gold18ct === rates.gold18ct &&
                latestRecord.gold22ct === rates.gold22ct &&
                latestRecord.gold24ct995 === rates.gold24ct995 &&
                latestRecord.gold24ct995gw === rates.gold24ct995gw &&
                latestRecord.gold24ct999 === rates.gold24ct999 &&
                latestRecord.gold14ct === rates.gold14ct &&
                latestRecord.silver === rates.silver &&
                latestRecord.silverCoin === rates.silverCoin;

            if (pricesUnchanged) {
                console.log(`[CRON-API] No price change since ${latestRecord.date} - skipping insert`);
                return res.json({
                    success: true,
                    message: 'No price change since last record',
                    inserted: false,
                    duration: `${Date.now() - startTime}ms`,
                    timestamp: new Date().toISOString()
                });
            }

            priceChanged = true;
            oldPrices = {
                gold18ct: latestRecord.gold18ct,
                gold22ct: latestRecord.gold22ct,
                gold24ct995: latestRecord.gold24ct995,
                gold24ct995gw: latestRecord.gold24ct995gw,
                gold24ct999: latestRecord.gold24ct999,
                gold14ct: latestRecord.gold14ct,
                silver: latestRecord.silver,
                silverCoin: latestRecord.silverCoin
            };

            console.log(`[CRON-API] New record for ${dateStr} with price changes`);
            await GoldRate.create({
                ...rates,
                date: dateStr,
                fetchedAt: new Date()
            });
        } else {
            // First-time fetch
            console.log(`[CRON-API] First-time fetch for ${dateStr}`);
            priceChanged = true;
            await GoldRate.create({
                ...rates,
                date: dateStr,
                fetchedAt: new Date()
            });
        }

        // Send Telegram notification if prices changed
        if (priceChanged && oldPrices) {
            console.log('[CRON-API] Sending Telegram notification...');
            try {
                await sendTelegramAlert(oldPrices, rates);
                console.log('[CRON-API] Telegram notification sent successfully');
            } catch (telegramError) {
                console.error('[CRON-API] Telegram notification failed:', telegramError.message);
                // Don't fail the request if Telegram fails
            }
        }

        console.log(`[CRON-API] Fetch completed successfully (${Date.now() - startTime}ms)`);

        return res.json({
            success: true,
            message: priceChanged ? 'Price change detected and saved' : 'No price change',
            inserted: priceChanged,
            rates: rates,
            duration: `${Date.now() - startTime}ms`,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('[CRON-API] Error:', error.message);
        console.error('[CRON-API] Stack:', error.stack);

        return res.status(500).json({
            success: false,
            error: error.message,
            duration: `${Date.now() - startTime}ms`,
            timestamp: new Date().toISOString()
        });
    }
});

module.exports = router;
