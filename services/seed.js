const SoldGold = require('../models/SoldGold');

const SEED = [
    { totalReceived: 150000, note: 'Past sale ₹1,50,000' },
    { totalReceived: 100099, note: 'Past sale ₹1,00,099' },
    { totalReceived: 6556, note: 'Past sale ₹6,556' },
    { totalReceived: 27500, note: 'Past sale ₹27,500' }
];

async function seedSoldEntries() {
    try {
        for (const seed of SEED) {
            const exists = await SoldGold.findOne({ note: seed.note });
            if (exists) continue;

            await SoldGold.create({
                date: '2025-01-01',
                category: 'gold22ct',
                tolaDeducted: 0,
                amountType: 'manual_entry',
                amountValue: 0,
                rateAtSale: 0,
                totalReceived: seed.totalReceived,
                note: seed.note
            });

            console.log(`✓ Seeded: ${seed.note}`);
        }
    } catch (error) {
        console.error('Seed error:', error.message);
    }
}

module.exports = { seedSoldEntries };
