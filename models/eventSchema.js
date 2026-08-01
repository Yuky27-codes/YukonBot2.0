const mongoose = require('mongoose');

const participanteSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    nome: { type: String, required: true },
    confirmado: { type: Boolean, default: false }
});

const eventSchema = new mongoose.Schema({
    groupId: { type: String, required: true },
    titulo: { type: String, required: true },
    descricao: { type: String, default: '' },
    data: { type: String, default: null },
    hora: { type: String, default: null },
    aplicarAdv: { type: Boolean, default: false },
    status: { type: String, enum: ['criado', 'andamento', 'finalizado'], default: 'criado' },
    criadoPor: { type: String, required: true },
    participantes: [participanteSchema],
    criadoEm: { type: Date, default: Date.now }
}, { timestamps: true });

const Evento = mongoose.models.Evento || mongoose.model('Evento', eventSchema);
module.exports = Evento;