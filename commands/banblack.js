module.exports = {
    name: 'banblack',
    async execute(client, msg, { chatId, isAdmin, iAmAdmin, chat, User }) {
        // 1. Checagens de Segurança
        if (!isAdmin) return; // Só admins do grupo podem usar

        if (!iAmAdmin) {
            return await client.sendMessage(chatId, "❌ *SISTEMA:* Eu preciso ser Administrador para gerenciar a Blacklist.", { sendSeen: false });
        }

        try {
            let targetBan;

            // Identifica o alvo (Resposta ou Menção)
            if (msg.hasQuotedMsg) {
                const quoted = await msg.getQuotedMessage();
                // Prioriza .author para grupos, .from para DMs
                targetBan = (quoted.author || quoted.from).toString();
            } else if (msg.mentionedIds && msg.mentionedIds.length > 0) {
                targetBan = (msg.mentionedIds[0]._serialized || msg.mentionedIds[0]).toString();
            }

            if (!targetBan) {
                return await client.sendMessage(chatId, "❗ Marque ou responda quem deseja banir permanentemente.", { sendSeen: false });
            }

            // Limpeza do ID para garantir compatibilidade com o Puppeteer/WA-Web.js
            const targetStr = String(targetBan).trim();

            // 2. Registro no Banco de Dados
            // Usamos findOneAndUpdate com upsert para garantir que o registro exista
            await User.findOneAndUpdate(
                { userId: targetStr, groupId: chatId },
                { $set: { isBlacklisted: true } },
                { upsert: true }
            );

            // 3. Execução do Banimento no WhatsApp
            // O método removeParticipants exige um Array de IDs
            await chat.removeParticipants([targetStr]);

            // 4. Confirmação Visual
            const msgFeedback = `🚫 *PROTOCOLO DE EXCLUSÃO* 🚫
━━━━━━━━━━━━━━━━━━━━━
O tripulante @${targetStr.split('@')[0]} foi banido e inserido na *Blacklist*.

⚠️ Acesso permanentemente bloqueado nesta estação.
━━━━━━━━━━━━━━━━━━━━━`;

            await client.sendMessage(chatId, msgFeedback, {
                mentions: [targetStr],
                sendSeen: false
            });

        } catch (e) {
            console.error("❌ ERRO NO BANBLACK:", e.message);
            await client.sendMessage(chatId, "⚠️ Erro ao processar banimento permanente. Verifique se o usuário ainda está no grupo ou se tenho permissões.", { sendSeen: false });
        }
    }
};