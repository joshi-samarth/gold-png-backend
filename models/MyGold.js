const mongoose = require('mongoose');

const MyGoldSchema = new mongoose.Schema({
    gold18ct: { type: Number, default: 14.263 },
    gold22ct: { type: Number, default: 13.783 },
    gold24ct: { type: Number, default: 8 },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('MyGold', MyGoldSchema);
