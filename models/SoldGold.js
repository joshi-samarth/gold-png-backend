const mongoose = require('mongoose');

const SoldGoldSchema = new mongoose.Schema({
    date: { type: String, required: true },
    category: { type: String, required: true },
    tolaDeducted: { type: Number, required: true },
    amountType: { type: String, required: true },
    amountValue: { type: Number, default: 0 },
    rateAtSale: { type: Number, default: 0 },
    totalReceived: { type: Number, default: 0 },
    note: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SoldGold', SoldGoldSchema);
