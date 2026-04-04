module.exports = {
    name: 'desmute',
    async execute(client, msg, { chatId, isAdmin, iAmAdmin }) {
        try {
            // 1. Verificação de Permissão (Admin do Bot)
            if (!isAdmin) {
                return msg.reply('❌ Você não tem autorização para liberar as comunicações do setor.');
            }

            const chat = await msg.getChat();
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