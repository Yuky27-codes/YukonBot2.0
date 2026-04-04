module.exports = {
    name: 'mute',
    async execute(client, msg, { chatId, isAdmin, iAmAdmin }) {
        try {
            // 1. Verificação de Permissão (Admin do Bot)
            if (!isAdmin) {
                return msg.reply('❌ Apenas o comando da tripulação pode silenciar o setor.');
            }

            const chat = await msg.getChat();
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