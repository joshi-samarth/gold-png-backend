const express = require('express');
const router = express.Router();
const GoldRate = require('../models/GoldRate');
const { fetchAndSave, istDate } = require('../services/fetcher');

// GET /api/today
router.get('/today', async (req, res) => {
    try {
        const today = istDate();
        const doc = await GoldRate.findOne({ date: today });

        if (!doc) {
            return res.status(404).json({ error: 'Today record not found' });
        }

        res.json(doc);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/history?days=N
router.get('/history', async (req, res) => {
    try {
        const days = Math.min(parseInt(req.query.days) || 30, 365);
        const docs = await GoldRate.find()
            .sort({ date: -1 })
            .limit(days)
            .lean();

        res.json(docs.reverse());
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/fetch-now
router.get('/fetch-now', async (req, res) => {
    try {
        const today = istDate();
        const doc = await fetchAndSave(today);
        res.json({ success: true, doc });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/status
router.get('/status', async (req, res) => {
    try {
        const totalDays = await GoldRate.countDocuments();
        const lastDoc = await GoldRate.findOne().sort({ date: -1 }).lean();

        res.json({
            ok: true,
            totalDays,
            lastDate: lastDoc?.date || null,
            lastFetch: lastDoc?.fetchedAt || null
        });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});

module.exports = router;
