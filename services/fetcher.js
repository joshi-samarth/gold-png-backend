const axios = require('axios');
const GoldRate = require('../models/GoldRate');

function istDate(d = new Date()) {
    const ist = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
    return ist.toISOString().split('T')[0];
}

async function fetchRates() {
    try {
        const response = await axios.get(
            'https://goldpriceeditor.droidinfinity.com/api/external/metal-prices/1085',
            {
                headers: {
                    Origin: 'https://pngadgilandsons.com',
                    Referer: 'https://pngadgilandsons.com/',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            }
        );

        if (!response.data || !response.data.success || !response.data.rates) {
            throw new Error('Invalid API response');
        }

        const r = response.data.rates;
        return {
            gold18ct: r.goldPrice18K,
            gold22ct: r.goldPrice22K,
            gold24ct995: r.goldPrice24K995,
            gold24ct995gw: r.goldPrice24K995GW,
            gold24ct999: r.goldPrice24K,
            gold14ct: r.goldPrice14K,
            silver: r.silverPrice,
            silverCoin: r.silverBarPrice
        };
    } catch (error) {
        console.error('Error fetching rates:', error.message);
        throw error;
    }
}

async function fetchAndSave(dateStr) {
    const maxRetries = 3;
    const delays = [5000, 10000, 15000];

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const rates = await fetchRates();

            if (!rates.gold22ct || rates.gold22ct === 0) {
                throw new Error('gold22ct is zero or missing');
            }

            const doc = await GoldRate.findOneAndUpdate(
                { date: dateStr },
                { ...rates, date: dateStr, fetchedAt: new Date() },
                { upsert: true, new: true }
            );

            console.log(`✓ Gold rates saved for ${dateStr}`);
            return doc;
        } catch (error) {
            console.error(`Attempt ${attempt + 1}/${maxRetries} failed:`, error.message);
            if (attempt < maxRetries - 1) {
                await new Promise(resolve => setTimeout(resolve, delays[attempt]));
            } else {
                throw error;
            }
        }
    }
}

async function backfill() {
    try {
        const latest = await GoldRate.findOne().sort({ date: -1 });

        if (!latest) {
            console.log('No records found. Fetching today...');
            await fetchAndSave(istDate());
            return;
        }

        const latestDate = new Date(latest.date + 'T00:00:00Z');
        const today = new Date(istDate() + 'T00:00:00Z');
        const gap = Math.floor((today - latestDate) / (1000 * 60 * 60 * 24));

        if (gap <= 0) {
            console.log(`Data already up to date (${latest.date})`);
            return;
        }

        console.log(`Backfilling ${gap} day(s)...`);

        for (let i = 1; i <= gap; i++) {
            const d = new Date(latestDate);
            d.setDate(d.getDate() + i);
            const dateStr = d.toISOString().split('T')[0];

            try {
                await fetchAndSave(dateStr);
            } catch (error) {
                console.error(`Failed to fetch ${dateStr}:`, error.message);
            }

            if (i < gap) {
                await new Promise(resolve => setTimeout(resolve, 800));
            }
        }
    } catch (error) {
        console.error('Backfill error:', error.message);
    }
}

module.exports = { fetchRates, fetchAndSave, backfill, istDate };
