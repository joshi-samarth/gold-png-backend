const mongoose = require('mongoose');

const GoldRateSchema = new mongoose.Schema({
    date: { type: String, required: true, unique: true, index: true },
    gold18ct: Number,
    gold22ct: Number,
    gold24ct995: Number,
    gold24ct995gw: Number,
    gold24ct999: Number,
    gold14ct: Number,
    silver: Number,
    silverCoin: Number,
    fetchedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('GoldRate', GoldRateSchema);
