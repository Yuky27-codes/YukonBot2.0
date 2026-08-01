const mongoose = require('mongoose');

const partnershipSchema = new mongoose.Schema({
    groupId: { type: String, required: true },
    partnerCode: { type: String, required: true, unique: true },
    partnerGroupId: { type: String, default: null },
    partnerName: { type: String, required: true },
    partidasJogadas: { type: Number, default: 0 },
    salaPAtiva: { type: String, default: null }, 
    criadoEm: { type: Date, default: Date.now }
}, { timestamps: true });

const Partnership = mongoose.models.Partnership || mongoose.model('Partnership', partnershipSchema);
module.exports = Partnership;