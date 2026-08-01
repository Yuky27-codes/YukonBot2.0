const Partnership = require('../models/partnershipSchema');

module.exports = {
    name: 'addsalap',
    async execute(client, msg, { chatId, args, isGroup }) {
        if (!isGroup) return msg.reply("❌ Comando exclusivo para grupos.");
        const codigoSalaP = args[0];

        if (!codigoSalaP) return msg.reply("⚠️ Digite o código da sala de parceria!\nExemplo: `/addsalap PARC123`");

        try {
            // Atualiza a sala ativa nas parcerias deste grupo
            await Partnership.updateMany(
                { groupId: chatId },
                { $set: { salaPAtiva: codigoSalaP.toUpperCase() } }
            );

            // Se este grupo estiver vinculado a outro grupo via YukonBot, atualiza lá também para fechar junto
            const relacao = await Partnership.findOne({ groupId: chatId, partnerGroupId: { $ne: null } });
            if (relacao && relacao.partnerGroupId) {
                await Partnership.updateMany(
                    { groupId: relacao.partnerGroupId },
                    { $set: { salaPAtiva: codigoSalaP.toUpperCase() } }
                );
            }

            return msg.reply(`✅ Sala de Parceria *${codigoSalaP.toUpperCase()}* definida com sucesso! (Rodando em paralelo com a sala normal) 🛰️`);
        } catch (err) {
            console.error("❌ Erro no /addsalap:", err);
            return msg.reply("⚠️ Erro ao definir a sala de parceria.");
        }
    }
};