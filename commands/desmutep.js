module.exports = {
    name: 'desmutep',
    async execute(client, msg, { chatId, isAdmin, User }) {
        try {
            // 1. Verificação de Permissão (Admin do Bot)
            if (!isAdmin) return;

            let targetUnmute;

            // 2. Identificação do Alvo (Resposta ou Menção)
            if (msg.hasQuotedMsg) {
                const quoted = await msg.getQuotedMessage();
                targetUnmute = (quoted.author || quoted.from)._serialized || (quoted.author || quoted.from).toString();
            } else if (msg.mentionedIds.length > 0) {
                targetUnmute = msg.mentionedIds[0]._serialized || msg.mentionedIds[0].toString();
            }

            if (!targetUnmute) return; // Se não marcou ninguém, o bot apenas ignora silenciosamente

            const targetStr = String(targetUnmute).trim();

            // 3. Atualização no Banco de Dados
            // Mudamos isMuted para false para interromper as exclusões automáticas
            await User.findOneAndUpdate(
                { userId: targetStr, groupId: chatId },
                { $set: { isMuted: false } }
            );

            // 4. Feedback Visual
            await client.sendMessage(chatId, `🔊 *COMUNICAÇÕES REESTABELECIDAS*\n\n@${targetStr.split('@')[0]}, seu canal de transmissão foi liberado pela Yukon.`, { 
                mentions: [targetStr],
                sendSeen: false 
            });

        } catch (e) {
            console.error("❌ Erro no comando desmutep:", e);
            await msg.reply("⚠️ Falha ao tentar liberar as comunicações do tripulante.");
        }
    }
};