module.exports = {
    name: 'desmute',
    async execute(client, msg, { chatId, isAdmin, iAmAdmin, chat: chatFromIndex }) {
        try {
            // 1. Verificação de Permissão (Admin do Bot)
            if (!isAdmin) {
                return msg.reply('❌ Você não tem autorização para liberar as comunicações do setor.');
            }

            // 🔧 Reaproveita o "chat" que o index.js já buscou. Se não vier (ou vier
            // nulo por falha lá), tenta buscar de novo aqui — às vezes o erro
            // "Evaluation failed: r" é intermitente e a segunda tentativa funciona.
            // IMPORTANTE: este comando executa uma AÇÃO real no grupo, então não dá
            // pra usar um cache de dados como fallback (precisa do objeto "vivo").
            let chat = chatFromIndex || null;

            if (!chat || typeof chat.setMessagesAdminsOnly !== 'function') {
                try {
                    chat = await msg.getChat();
                } catch (e) {
                    console.warn("⚠️ /desmute: getChat() falhou na 2ª tentativa também:", e.message);
                    return msg.reply(
                        "⚠️ O WhatsApp está com instabilidade no momento (bug conhecido na lib do bot) " +
                        "e não consegui acessar os dados do grupo para liberar. Tente novamente em alguns instantes."
                    );
                }
            }

            if (!chat.isGroup) {
                return msg.reply('❌ Este comando só funciona em grupos.');
            }

            // 2. Verifica se o bot é admin (Usando o iAmAdmin do Handler)
            if (!iAmAdmin) {
                return msg.reply('⚠️ Eu preciso de privilégios de Admin para abrir as comportas de áudio do grupo.');
            }

            // 3. Abre o grupo (Todos os participantes podem enviar mensagens)
            await chat.setMessagesAdminsOnly(false);

            // 4. Feedback Visual
            await client.sendMessage(chatId, "🔊 *COMUNICAÇÕES REESTABELECIDAS*\n\nO setor foi liberado pela administração da Yukon. A tripulação já pode enviar mensagens novamente.", {
                sendSeen: false
            });

        } catch (err) {
            console.error("❌ ERRO NO COMANDO DESMUTE:", err);
            await msg.reply("❌ Falha crítica ao tentar liberar o grupo.");
        }
    }
};