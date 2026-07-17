module.exports = {
    name: 'mute',
    async execute(client, msg, { chatId, isAdmin, iAmAdmin, chat: chatFromIndex }) {
        try {
            // 1. Verificação de Permissão (Admin do Bot)
            if (!isAdmin) {
                return msg.reply('❌ Apenas o comando da tripulação pode silenciar o setor.');
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
                    console.warn("⚠️ /mute: getChat() falhou na 2ª tentativa também:", e.message);
                    return msg.reply(
                        "⚠️ O WhatsApp está com instabilidade no momento (bug conhecido na lib do bot) " +
                        "e não consegui acessar os dados do grupo para silenciar. Tente novamente em alguns instantes."
                    );
                }
            }

            if (!chat.isGroup) {
                return msg.reply('❌ Este comando só funciona em grupos.');
            }

            // 2. Verifica se o bot é admin (Já vem pronto do Handler)
            if (!iAmAdmin) {
                return msg.reply('⚠️ Eu preciso de privilégios de Admin para fechar as comunicações do grupo.');
            }

            // 3. Fecha o grupo (Apenas admins podem enviar mensagens)
            await chat.setMessagesAdminsOnly(true);

            // 4. Feedback Visual
            await client.sendMessage(chatId, "🔇 *COMUNICAÇÕES INTERROMPIDAS*\n\nO setor foi silenciado pela administração da Yukon. Apenas oficiais podem falar agora.", {
                sendSeen: false
            });

        } catch (err) {
            console.error("❌ ERRO NO COMANDO MUTE:", err);
            await msg.reply("❌ Falha crítica ao tentar silenciar o grupo.");
        }
    }
};