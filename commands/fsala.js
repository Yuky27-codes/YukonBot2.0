const Partnership = require('../models/partnershipSchema');

module.exports = {
    name: 'salap',
    async execute(client, msg, { chatId, chat: chatFromIndex, GroupConfig }) {
        if (!chatId.endsWith('@g.us')) return msg.reply("❌ Apenas em grupos.");

        try {
            // Busca a parceria ativa que possui sala aberta neste grupo
            const parceria = await Partnership.findOne({ groupId: chatId, salaPAtiva: { $ne: null } });
            
            if (!parceria || !parceria.salaPAtiva) {
                return msg.reply("❌ Não há nenhuma sala de parceria ativa no momento. Use `/addsalap [número] [código]` para abrir uma.");
            }

            const codigoSalaP = parceria.salaPAtiva;

            // 1. MENSAGEM 1: Apenas o código da sala limpo e isolado (para cópia rápida)
            await client.sendMessage(chatId, codigoSalaP, { sendSeen: false });

            // 2. MENSAGEM 2: Logo abaixo, avisando que a sala foi gerada com a parceria
            let chat = chatFromIndex || await msg.getChat().catch(() => null);
            let mencoesGeral = chat?.participants?.map(p => p.id._serialized) || [];

            if (mencoesGeral.length === 0) {
                const configGrupo = await GroupConfig.findOne({ groupId: chatId }).lean();
                mencoesGeral = configGrupo?.cachedParticipants || [];
            }

            const textoAviso = `📢 *Sala conjunta gerada com a parceria:* ${parceria.partnerName}! 🤝`;
            
            if (mencoesGeral.length > 0) {
                await client.sendMessage(chatId, textoAviso, { mentions: mencoesGeral });
            } else {
                await client.sendMessage(chatId, textoAviso);
            }

        } catch (err) {
            console.error("❌ Erro no /salap:", err);
            return msg.reply("⚠️ Erro ao buscar a sala de parceria.");
        }
    }
};