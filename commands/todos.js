module.exports = {
    name: 'todos',
    async execute(client, msg, { args, chatId, isAdmin, chat: chatFromIndex, GroupConfig }) {
        try {
            // 1. Verificação de Permissão (Admin do Bot)
            if (!isAdmin) {
                return msg.reply('❌ Somente cargos de comando (ADMs) podem usar este sinal.', { sendSeen: false });
            }

            // 🔧 Reaproveita o "chat" que o index.js já buscou (evita nova chamada a
            // getChat()/getChatById(), que hoje pode falhar com "Evaluation failed: r").
            let chat = chatFromIndex || null;

            if (!chat) {
                try {
                    chat = await msg.getChat();
                } catch (e) {
                    console.warn("⚠️ /todos: getChat() falhou, seguindo com fallback:", e.message);
                }
            }

            const ehGrupo = chat ? chat.isGroup : chatId.endsWith('@g.us');
            if (!ehGrupo) {
                return msg.reply('❌ Este comando só pode ser usado em grupos.');
            }

            // 2. Mensagem: agora envia SÓ o que o ADM escreveu (sem texto fixo extra)
            const texto = args.length > 0
                ? args.join(' ')
                : "📢 Chamada geral!";

            // 3. Coleta de IDs para marcação silenciosa
            let mentais = chat?.participants?.map(p => p.id._serialized);

            // 🔧 Fallback: se não conseguimos os participantes ao vivo, usa o
            // cache salvo pelo index.js na última vez que a busca funcionou.
            if (!mentais || mentais.length === 0) {
                const configGrupo = await GroupConfig.findOne({ groupId: chatId }).lean();
                mentais = configGrupo?.cachedParticipants || [];
            }

            // 4. Envio Blindado
            await client.sendMessage(chatId, texto, {
                mentions: mentais,
                sendSeen: false
            });

        } catch (err) {
            console.error("❌ ERRO NO COMANDO /TODOS:", err);
            await msg.reply("❌ Erro ao tentar marcar todos os membros.");
        }
    }
};