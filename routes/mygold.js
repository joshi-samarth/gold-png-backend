const express = require('express');
const router = express.Router();
const MyGold = require('../models/MyGold');

// GET /api/mygold
router.get('/mygold', async (req, res) => {
    try {
        let doc = await MyGold.findOne().lean();

        if (!doc) {
            doc = await MyGold.create({
                gold18ct: 14.263,
                gold22ct: 13.783,
                gold24ct: 8
            });
        }

        res.json(doc);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/mygold
router.post('/mygold', async (req, res) => {
    try {
        const { gold18ct, gold22ct, gold24ct } = req.body;

        let doc = await MyGold.findOne();

        if (!doc) {
            doc = await MyGold.create({
                gold18ct: gold18ct !== undefined ? gold18ct : 14.263,
                gold22ct: gold22ct !== undefined ? gold22ct : 13.783,
                gold24ct: gold24ct !== undefined ? gold24ct : 8
            });
        } else {
            if (gold18ct !== undefined) doc.gold18ct = gold18ct;
            if (gold22ct !== undefined) doc.gold22ct = gold22ct;
            if (gold24ct !== undefined) doc.gold24ct = gold24ct;
            doc.updatedAt = new Date();
            await doc.save();
        }

        res.json(doc);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
