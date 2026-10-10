// Limites da economia da Yukon (YukonCoins). Um lugar só para ajustar.
// Por quê: sem teto, /addcoins aceitava qualquer número (já houve conta com 1e98 coins), o /cassino aceitava apostar
// milhões com multiplicador 10x e os juros do /banco (1% a 3% ao dia) cresciam sem limite.
// Os admins globais da Yukon (LISTA_ADMS, isSuperAdmin) não têm teto no /addcoins.
const mongoose = require('mongoose');

const LIMITES = {
    addcoinsPorUso: 50000,        // máximo por /addcoins
    addcoinsPorDiaGrupo: 200000,  // soma de /addcoins por grupo por dia
    apostaMaxima: 50000,          // máximo por aposta no /cassino
    jurosMaximoDia: 5000,         // teto do rendimento diário do /banco por pessoa
};

// Registro de toda emissão manual de coins (quem deu, para quem, quanto): é a única forma de auditar o /addcoins
const emissaoSchema = new mongoose.Schema({
    groupId: { type: String, required: true, index: true },
    por: { type: String, required: true },
    para: { type: String, required: true },
    valor: { type: Number, required: true },
    dia: { type: String, required: true, index: true }, // YYYY-MM-DD (America/Sao_Paulo)
    superAdmin: { type: Boolean, default: false },
}, { timestamps: { createdAt: true, updatedAt: false }, collection: 'coin_emissions' });
const EmissaoCoins = mongoose.models.EmissaoCoins || mongoose.model('EmissaoCoins', emissaoSchema);

function hojeSP() {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

// Só dígitos, inteiro positivo e seguro (parseInt("1e98") viraria 1, e "1000...0" com 100 zeros viraria 1e98)
function valorInteiro(texto) {
    const limpo = String(texto ?? '').replace(/[.\s]/g, '');
    if (!/^\d{1,12}$/.test(limpo)) return NaN;
    const n = Number(limpo);
    return Number.isSafeInteger(n) && n > 0 ? n : NaN;
}

async function emitidoHojeNoGrupo(groupId) {
    const [linha] = await EmissaoCoins.aggregate([
        { $match: { groupId, dia: hojeSP(), superAdmin: false } },
        { $group: { _id: null, total: { $sum: '$valor' } } },
    ]);
    return linha?.total ?? 0;
}

module.exports = { LIMITES, EmissaoCoins, hojeSP, valorInteiro, emitidoHojeNoGrupo };
