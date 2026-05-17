const express = require('express');
const router = express.Router();
const SoldGold = require('../models/SoldGold');
const MyGold = require('../models/MyGold');
const GoldRate = require('../models/GoldRate');
const { istDate } = require('../services/fetcher');

// GET /api/sold
router.get('/sold', async (req, res) => {
    try {
        const docs = await SoldGold.find().sort({ createdAt: -1 }).lean();
        res.json(docs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/sold
router.post('/sold', async (req, res) => {
    try {
        const { category, tolaDeducted, amountType, amountValue, rateAtSale } = req.body;

        // Validate category
        if (!['gold22ct', 'gold24ct995', 'gold18ct'].includes(category)) {
            return res.status(400).json({ error: 'Invalid category' });
        }

        // Validate tolaDeducted
        if (!tolaDeducted || tolaDeducted <= 0) {
            return res.status(400).json({ error: 'tolaDeducted must be > 0' });
        }

        // Map category to MyGold field
        const goldField = category === 'gold24ct995' ? 'gold24ct' : category;

        // Get current holdings
        let myGold = await MyGold.findOne();
        if (!myGold) {
            myGold = await MyGold.create({
                gold18ct: 14.263,
                gold22ct: 13.783,
                gold24ct: 8
            });
        }

        const currentHolding = myGold[goldField];
        if (!currentHolding || currentHolding < tolaDeducted) {
            return res.status(400).json({ error: `Insufficient ${category} balance` });
        }

        // Calculate totalReceived
        let totalReceived = 0;
        let finalRateAtSale = rateAtSale || 0;

        if (amountType === 'today_rate') {
            const today = istDate();
            const todayRate = await GoldRate.findOne({ date: today });
            if (!todayRate) {
                return res.status(400).json({ error: 'Today rate not found' });
            }
            const perGram = todayRate[category];
            finalRateAtSale = Math.round(perGram * 10 * 0.97);
            totalReceived = Math.round(finalRateAtSale * tolaDeducted);
        } else if (amountType === 'total') {
            totalReceived = amountValue;
            finalRateAtSale = Math.round(amountValue / tolaDeducted);
        } else if (amountType === 'per_gram') {
            finalRateAtSale = Math.round(amountValue * 10 * 0.97);
            totalReceived = Math.round(finalRateAtSale * tolaDeducted);
        }

        // Create SoldGold document
        const sale = await SoldGold.create({
            date: istDate(),
            category,
            tolaDeducted,
            amountType,
            amountValue,
            rateAtSale: finalRateAtSale,
            totalReceived,
            note: ''
        });

        // Deduct from MyGold
        myGold[goldField] = Math.max(0, parseFloat((myGold[goldField] - tolaDeducted).toFixed(3)));
        myGold.updatedAt = new Date();
        await myGold.save();

        res.json({
            success: true,
            sale,
            newBalance: myGold[goldField]
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/sold/:id
router.delete('/sold/:id', async (req, res) => {
    try {
        const sale = await SoldGold.findByIdAndDelete(req.params.id);

        if (!sale) {
            return res.status(404).json({ error: 'Sale not found' });
        }

        // Only restore if tolaDeducted > 0
        if (sale.tolaDeducted > 0) {
            const goldField = sale.category === 'gold24ct995' ? 'gold24ct' : sale.category;

            let myGold = await MyGold.findOne();
            if (!myGold) {
                myGold = await MyGold.create({
                    gold18ct: 14.263,
                    gold22ct: 13.783,
                    gold24ct: 8
                });
            }

            myGold[goldField] = parseFloat((myGold[goldField] + sale.tolaDeducted).toFixed(3));
            myGold.updatedAt = new Date();
            await myGold.save();
        }

        res.json({ success: true, restored: sale.tolaDeducted });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
