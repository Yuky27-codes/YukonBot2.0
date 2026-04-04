module.exports = {
    name: 'mutep',
    async execute(client, msg, { chatId, isAdmin, User, iAmAdmin }) {
        try {
            // 1. Verificação de Permissão (Admin do Bot)
            if (!isAdmin) return;

            const chat = await msg.getChat();
            if (!chat.isGroup) return msg.reply("❌ Este comando só pode ser usado em grupos.");

            // 2. Verificação se o bot é admin (Necessário para apagar mensagens depois)
            if (!iAmAdmin) {
                return await client.sendMessage(chatId, "❌ Eu preciso ser Admin para interceptar e apagar mensagens de tripulantes mutados.", { sendSeen: false });
            }

            let targetMute;

            // 3. Identificação do Alvo (Resposta ou Menção)
            if (msg.hasQuotedMsg) {
                const quoted = await msg.getQuotedMessage();
                targetMute = (quoted.author || quoted.from)._serialized || (quoted.author || quoted.from).toString();
            } else if (msg.mentionedIds.length > 0) {
                targetMute = msg.mentionedIds[0]._serialized || msg.mentionedIds[0].toString();
            }

            if (!targetMute) {
                return await client.sendMessage(chatId, "❗ Marque ou responda alguém para aplicar o silenciamento individual.", { sendSeen: false });
            }

            const targetStr = String(targetMute).trim();

            // 4. Atualização no Banco de Dados
            // Definimos isMuted: true para que o seu interceptador de mensagens saiba quem apagar
            await User.findOneAndUpdate(
                { userId: targetStr, groupId: chatId },
                { $set: { isMuted: true } },
                { upsert: true }
            );

            // 5. Feedback Visual
            await client.sendMessage(chatId, `🔇 *SETOR PRIVADO SILENCIADO*\n\n@${targetStr.split('@')[0]}, suas transmissões foram interceptadas pela Yukon e serão apagadas automaticamente.`, { 
                mentions: [targetStr],
                sendSeen: false 
            });

        } catch (e) {
            console.error("❌ Erro no comando mutep:", e);
            await msg.reply("⚠️ Falha ao tentar mutar o tripulante.");
        }
    }
};