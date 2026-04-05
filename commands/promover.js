module.exports = {
    name: 'promover',
    async execute(client, msg, { chatId, isAdmin, iAmAdmin }) {
        try {
            // 1. Verificações de Segurança (Já otimizadas pelo Handler)
            if (!isAdmin) return; 
            
            if (!iAmAdmin) {
                return await client.sendMessage(chatId, "❌ Eu preciso ser ADM da nave para promover alguém.", { sendSeen: false });
            }

            const chat = await msg.getChat();
            if (!chat.isGroup) return msg.reply("❌ Este comando só pode ser usado em grupos.");

            let targetPromote;

            // 2. Identifica o alvo por Menção ou Resposta
            if (msg.hasQuotedMsg) {
                const quoted = await msg.getQuotedMessage();
                targetPromote = (quoted.author || quoted.from)._serialized || (quoted.author || quoted.from).toString();
            } else if (msg.mentionedIds.length > 0) {
                targetPromote = msg.mentionedIds[0]._serialized || msg.mentionedIds[0].toString();
            }

            if (!targetPromote) {
                return await client.sendMessage(chatId, "❗ Marque o tripulante ou responda à mensagem dele para promovê-lo.", { sendSeen: false });
            }

            const targetStr = String(targetPromote).trim();

            // 3. Executa a promoção no WhatsApp
            await chat.promoteParticipants([targetStr]);

            // 4. Feedback Visual Temático
            await client.sendMessage(chatId, `🎖️ *PROMOÇÃO DE CARGO - YUKON*\n\nO tripulante @${targetStr.split('@')[0]} agora faz parte do alto comando da nave! Preparem as honrarias! 🚀`, {
                mentions: [targetStr],
                sendSeen: false
            });

        } catch (err) {
            console.error("❌ Erro no comando promover:", err);
            await client.sendMessage(chatId, "⚠️ Falha ao tentar promover o tripulante. Verifique se ele ainda está no grupo.");
        }
    }
};