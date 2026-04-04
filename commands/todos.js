module.exports = {
    name: 'todos',
    async execute(client, msg, { args, chatId, isAdmin }) {
        try {
            // 1. Verificação de Permissão (Admin do Bot)
            if (!isAdmin) {
                return msg.reply('❌ Somente cargos de comando (ADMs) podem usar este sinal.', { sendSeen: false });
            }

            const chat = await msg.getChat();
            if (!chat.isGroup) {
                return msg.reply('❌ Este comando só pode ser usado em grupos.');
            }

            // 2. Preparação da Mensagem
            let mentais = [];
            let texto = "📢 *ATENÇÃO TRIPULAÇÃO - YUKON:*\n\n";
            
            // Se o usuário digitou algo após o comando (ex: /todos reunião)
            if (args.length > 0) {
                texto += `📝 *Aviso:* ${args.join(' ')}\n\n`;
            }

            // 3. Coleta de IDs para marcação silenciosa
            // Usamos participants.map para ser mais rápido que um loop 'for'
            mentais = chat.participants.map(p => p.id._serialized);

            texto += "_Chamada geral emitida para todos os tripulantes!_ 🛰️";

            // 4. Envio Blindado
            // Enviamos o texto curto, mas com a lista 'mentions' gigante por trás
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