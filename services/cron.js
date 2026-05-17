const cron = require('node-cron');
const { fetchAndSave, istDate } = require('./fetcher');
const GoldRate = require('../models/GoldRate');

function setupCron() {
    // Primary: 11:40 AM IST = 06:10 UTC
    cron.schedule('10 6 * * *', async () => {
        console.log('[CRON] Primary fetch triggered (11:40 AM IST)');
        try {
            await fetchAndSave(istDate());
        } catch (error) {
            console.error('[CRON] Primary fetch failed:', error.message);
        }
    }, { timezone: 'UTC' });

    // Safety retry: 12:30 PM IST = 07:00 UTC
    cron.schedule('0 7 * * *', async () => {
        console.log('[CRON] Safety retry triggered (12:30 PM IST)');
        try {
            const doc = await GoldRate.findOne({ date: istDate() });
            if (!doc) {
                console.log('[CRON] Today record missing, fetching...');
                await fetchAndSave(istDate());
            } else {
                console.log('[CRON] Today record exists, skipping');
            }
        } catch (error) {
            console.error('[CRON] Safety retry failed:', error.message);
        }
    }, { timezone: 'UTC' });

    console.log('✓ Cron jobs scheduled');
}

module.exports = { setupCron };
