module.exports = {
    name: 'unbanblack',
    async execute(client, msg, { args, chatId, isAdmin, User }) {
        // 1. Checagem de Segurança
        if (!isAdmin) return; 

        try {
            let targetUnban;

            // 1. Identificação do alvo (Resposta, Menção ou Número digitado)
            if (msg.hasQuotedMsg) {
                const quoted = await msg.getQuotedMessage();
                targetUnban = (quoted.author || quoted.from).toString();
            } else if (msg.mentionedIds && msg.mentionedIds.length > 0) {
                targetUnban = (msg.mentionedIds[0]._serialized || msg.mentionedIds[0]).toString();
            } else if (args.length > 0) {
                // Remove tudo que não for número para evitar erros de formatação
                const cleanNum = args[0].replace(/\D/g, '');
                if (cleanNum.length >= 8) { 
                    targetUnban = `${cleanNum}@c.us`;
                }
            }

            if (!targetUnban) {
                return await client.sendMessage(chatId, "❗ Forneça o alvo: mencione, responda ou digite o número com DDD.", { sendSeen: false });
            }

            const targetStr = String(targetUnban).trim();

            // 2. Atualiza no banco: retira a flag de Blacklist
            const update = await User.findOneAndUpdate(
                { userId: targetStr, groupId: chatId },
                { $set: { isBlacklisted: false } },
                { new: true }
            );

            if (update) {
                const msgSucesso = `✅ *PERDÃO CONCEDIDO* ✅
━━━━━━━━━━━━━━━━━━━━━
O tripulante @${targetStr.split('@')[0]} foi removido da Blacklist e agora possui autorização para retornar à Yukon Station.
━━━━━━━━━━━━━━━━━━━━━`;

                await client.sendMessage(chatId, msgSucesso, {
                    mentions: [targetStr],
                    sendSeen: false
                });
            } else {
                await client.sendMessage(chatId, "⚠️ Usuário não encontrado no banco de dados ou não possui restrições ativas.", { sendSeen: false });
            }

        } catch (e) {
            console.error("❌ ERRO NO UNBANBLACK:", e.message);
            await client.sendMessage(chatId, "❌ Erro ao processar o perdão judicial no sistema central.", { sendSeen: false });
        }
    }
};