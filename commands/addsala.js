module.exports = {
    name: 'addsala',
    async execute(client, msg, { args, chatId, groupId }) {
        try {
            const novoCodigo = args[0];

            // 1. Verificação: Se o usuário não digitou o código após o comando
            if (!novoCodigo) {
                return await client.sendMessage(chatId, "❌ *Erro:* Digite o código da sala!\nExemplo: `/addsala ABC123`", { sendSeen: false });
            }

            // 2. Gravação: Salva na variável global que definimos no index.js
            // Usamos o .toUpperCase() para padronizar tudo em maiúsculo
            if (!global.codigosPorGrupo) global.codigosPorGrupo = {}; // Garante que o objeto existe
            
            global.codigosPorGrupo[groupId] = novoCodigo.toUpperCase();

            // 3. Feedback: Confirma para o usuário
            await client.sendMessage(chatId, `✅ Sala *${novoCodigo.toUpperCase()}* definida com sucesso para este grupo!`, { sendSeen: false });

        } catch (err) {
            console.error("❌ Erro no comando addsala:", err);
            await msg.reply("⚠️ Erro interno ao definir o código da sala.");
        }
    }
};