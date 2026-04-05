module.exports = {
    name: 'rebaixa',
    async execute(client, msg, { chatId, isAdmin, iAmAdmin }) {
        try {
            // 1. Verificações de Segurança (Aproveitando o Handler)
            if (!isAdmin) return; 
            
            if (!iAmAdmin) {
                return await client.sendMessage(chatId, "❌ Eu preciso ser ADM para remover o cargo de alguém.", { sendSeen: false });
            }

            const chat = await msg.getChat();
            if (!chat.isGroup) return msg.reply("❌ Este comando só pode ser usado em grupos.");

            let targetDemote;

            // 2. Identifica o alvo por Menção ou Resposta (Usando IDs estáveis)
            if (msg.hasQuotedMsg) {
                const quoted = await msg.getQuotedMessage();
                targetDemote = (quoted.author || quoted.from)._serialized || (quoted.author || quoted.from).toString();
            } else if (msg.mentionedIds.length > 0) {
                targetDemote = msg.mentionedIds[0]._serialized || msg.mentionedIds[0].toString();
            }

            if (!targetDemote) {
                return await client.sendMessage(chatId, "❗ Marque o tripulante ou responda à mensagem dele para rebaixá-lo.", { sendSeen: false });
            }

            const targetStr = String(targetDemote).trim();

            // 3. Executa o rebaixamento (Tira o Admin no WhatsApp)
            await chat.demoteParticipants([targetStr]);

            // 4. Feedback Visual Temático da Yukon
            await client.sendMessage(chatId, `📉 *REBAIXAMENTO DE CARGO - YUKON*\n\nO tripulante @${targetStr.split('@')[0]} foi removido do alto comando e agora faz parte da tripulação comum.`, {
                mentions: [targetStr],
                sendSeen: false
            });

        } catch (err) {
            console.error("❌ Erro no comando rebaixa:", err);
            await client.sendMessage(chatId, "⚠️ Falha ao tentar rebaixar o tripulante. Verifique se ele ainda está no grupo ou se ele já não era um membro comum.");
        }
    }
};