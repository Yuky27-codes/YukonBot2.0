module.exports = {
    name: 'sala',
    async execute(client, msg, { chatId, groupId, chat: chatFromIndex, GroupConfig }) {
        try {
            // 🔧 Reaproveita o "chat" que o index.js já buscou (evita uma nova chamada
            // a getChat()/getChatById(), que hoje pode falhar com "Evaluation failed: r").
            // Se não vier (ou vier nulo por falha lá no index), tenta buscar aqui mesmo
            // como última tentativa, mas sem deixar isso derrubar o comando.
            let chat = chatFromIndex || null;

            if (!chat) {
                try {
                    chat = await msg.getChat();
                } catch (e) {
                    console.warn("⚠️ /sala: getChat() falhou, seguindo com fallback:", e.message);
                }
            }

            // Buscamos o código. Se não existir, avisamos.
            const codigoDesteGrupo = global.codigosPorGrupo && global.codigosPorGrupo[groupId]
                ? global.codigosPorGrupo[groupId]
                : "🛰️ Nenhuma sala aberta no momento.";

            // --- MENSAGEM 1: O CÓDIGO ---
            await client.sendMessage(chatId, `\n\n${codigoDesteGrupo}`, { sendSeen: false });

            // --- MENSAGEM 2: A MARCAÇÃO GERAL ---
            const ehGrupo = chat ? chat.isGroup : chatId.endsWith('@g.us');

            if (ehGrupo) {
                let mencoesGeral = chat?.participants?.map(p => p.id._serialized);

                // 🔧 Fallback: se não conseguimos os participantes ao vivo, usa o
                // cache salvo pelo index.js na última vez que a busca funcionou.
                if (!mencoesGeral || mencoesGeral.length === 0) {
                    const configGrupo = await GroupConfig.findOne({ groupId: chatId }).lean();
                    mencoesGeral = configGrupo?.cachedParticipants || [];
                }

                if (mencoesGeral.length > 0) {
                    await client.sendMessage(chatId, "📢 *O código da sala foi gerado acima!*", {
                        mentions: mencoesGeral
                    });
                } else {
                    await client.sendMessage(chatId, "📢 *O código da sala foi gerado acima!*");
                }
            } else {
                await msg.reply("Este comando só pode ser usado em grupos.");
            }

        } catch (err) {
            console.error("❌ Erro no comando /sala:", err);
            await msg.reply("⚠️ Houve um erro ao buscar o código da sala.");
        }
    }
};