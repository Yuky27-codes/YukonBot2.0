const Partnership = require('../models/partnershipSchema');

module.exports = {
    name: 'fsala',
    async execute(client, msg, { chatId, isGroup }) {
        if (!isGroup) return msg.reply("❌ Apenas em grupos.");

        try {
            // Encontra a parceria ativa que possui sala aberta
            const parceria = await Partnership.findOne({ groupId: chatId, salaPAtiva: { $ne: null } });
            if (!parceria) return msg.reply("❌ Não há nenhuma sala de parceria ativa para fechar neste grupo.");

            const codigoAntigo = parceria.salaPAtiva;

            // Incrementa as partidas jogadas na parceria principal e no grupo parceiro cruzado (se houver)
            await Partnership.updateMany(
                { 
                    $or: [
                        { groupId: chatId, salaPAtiva: codigoAntigo },
                        { partnerGroupId: chatId, salaPAtiva: codigoAntigo }
                    ]
                },
                { 
                    $set: { salaPAtiva: null },
                    $inc: { partidasJogadas: 1 }
                }
            );

            return msg.reply(`🏁 *SALA DE PARCERIA ENCERRADA!* 🛑\n\nA sala \`${codigoAntigo}\` foi fechada e computada com sucesso no histórico da parceria. +1 partida registrada! 📊`);
        } catch (err) {
            console.error("❌ Erro no /fsala:", err);
            return msg.reply("⚠️ Erro ao finalizar a sala de parceria.");
        }
    }
};