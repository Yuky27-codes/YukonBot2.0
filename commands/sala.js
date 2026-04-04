module.exports = {
    name: 'sala',
    async execute(client, msg, { chatId, groupId }) {
        try {
            // Acessamos a variável global que está no index.js
            // Nota: Como 'codigosPorGrupo' está no index, 
            // idealmente ela deve ser exportada ou passada no handler.
            // Para este comando funcionar agora, usaremos o 'global' se você definiu assim,
            // ou garantiremos que o código a encontre.
            
            const chat = await msg.getChat();
            
            // Buscamos o código. Se não existir, avisamos.
            // (Assumindo que codigosPorGrupo está acessível globalmente no seu projeto)
            const codigoDesteGrupo = global.codigosPorGrupo && global.codigosPorGrupo[groupId] 
                ? global.codigosPorGrupo[groupId] 
                : "🛰️ Nenhuma sala aberta no momento.";

            // --- MENSAGEM 1: O CÓDIGO ---
            await client.sendMessage(chatId, `*CÓDIGO DA SALA:* \n\n${codigoDesteGrupo}`, { sendSeen: false });

            // --- MENSAGEM 2: A MARCAÇÃO GERAL ---
            if (chat.isGroup) {
                const mencoesGeral = chat.participants.map(p => p.id._serialized);

                await client.sendMessage(chatId, "📢 *O código da sala foi gerado acima!*", {
                    mentions: mencoesGeral 
                });
            } else {
                await msg.reply("Este comando só pode ser usado em grupos.");
            }

        } catch (err) {
            console.error("❌ Erro no comando /sala:", err);
            await msg.reply("⚠️ Houve um erro ao buscar o código da sala.");
        }
    }
};