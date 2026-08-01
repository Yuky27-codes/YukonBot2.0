const Partnership = require('../models/partnershipSchema');

module.exports = {
    name: 'salap',
    async execute(client, msg, { chatId, isGroup, chat: chatFromIndex, GroupConfig }) {
        if (!isGroup) return msg.reply("❌ Apenas em grupos.");

        try {
            const parceria = await Partnership.findOne({ groupId: chatId, salaPAtiva: { $ne: null } });
            const codigoSalaP = parceria ? parceria.salaPAtiva : "🛰️ Nenhuma sala de parceria aberta no momento.";

            // Mensagem 1: O código da sala de parceria
            await client.sendMessage(chatId, `🤝 *SALA DE PARCERIA ATIVA*\nCódigo: \`${codigoSalaP}\``, { sendSeen: false });

            // Mensagem 2: Menção geral (reaproveitando a estrutura segura)
            let chat = chatFromIndex || await msg.getChat().catch(() => null);
            let mencoesGeral = chat?.participants?.map(p => p.id._serialized) || [];

            if (mencoesGeral.length === 0) {
                const configGrupo = await GroupConfig.findOne({ groupId: chatId }).lean();
                mencoesGeral = configGrupo?.cachedParticipants || [];
            }

            if (mencoesGeral.length > 0) {
                await client.sendMessage(chatId, "📢 *A sala conjunta com o parceiro foi aberta acima!*", { mentions: mencoesGeral });
            }

        } catch (err) {
            console.error("❌ Erro no /salap:", err);
            return msg.reply("⚠️ Erro ao buscar a sala de parceria.");
        }
    }
};