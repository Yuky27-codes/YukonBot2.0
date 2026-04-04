module.exports = {
    name: 'ban',
    async execute(client, msg, { chatId, isAdmin, User, iAmAdmin }) {
        try {
            // 1. Verificação de permissão do usuário (Admin do Bot)
            if (!isAdmin) {
                return msg.reply('❌ Somente o comando da nave pode ejetar tripulantes.');
            }

            const chat = await msg.getChat();
            if (!chat.isGroup) return msg.reply('❌ Este comando só pode ser usado em grupos.');

            // 2. Verificação se o BOT é adm do grupo (Já vem do Handler)
            if (!iAmAdmin) {
                return msg.reply('❌ Me dê cargo de ADM para operar a escotilha.');
            }

            let target;
            const meuId = client.info.wid._serialized;

            // 3. Identificação do alvo (Resposta ou Menção)
            if (msg.hasQuotedMsg) {
                const quoted = await msg.getQuotedMessage();
                target = (quoted.author || quoted.from)._serialized || (quoted.author || quoted.from).toString();
            } else if (msg.mentionedIds.length > 0) {
                target = msg.mentionedIds[0]._serialized || msg.mentionedIds[0].toString();
            }

            if (!target) {
                return msg.reply("❗ Marque alguém ou responda à mensagem de quem deseja ejetar.");
            }

            const targetId = String(target).trim();

            // 4. Proteções de Segurança
            if (targetId === meuId) return msg.reply("❌ Eu não posso me ejetar da nave.");
            
            // Verifica se o alvo é um Admin do Bot (Proteção contra "fogo amigo")
            // Usamos a função global se estiver disponível ou checamos a lista
            if (typeof global.isAdminUser === 'function' && global.isAdminUser(targetId)) {
                return msg.reply("⚠️ Erro: Este tripulante possui privilégios de comando e não pode ser ejetado.");
            }

            // 5. Execução do Banimento
            await chat.removeParticipants([targetId]);

            // 6. Feedback Visual e Reset de Dados
            // Tentamos usar a função global de imagem, se não, mandamos texto
            if (typeof global.ejetarComImagem === 'function') {
                await global.ejetarComImagem(chatId, targetId);
            } else {
                await client.sendMessage(chatId, `🚀 *EJETADO:* @${targetId.split('@')[0]} foi removido da tripulação.`, { 
                    mentions: [targetId] 
                });
            }

            // Reset de advertências no MongoDB para este grupo
            await User.updateOne(
                { userId: targetId, groupId: chatId }, 
                { $set: { advs: 0 } }
            );

        } catch (err) {
            console.error("❌ Erro crítico no comando ban:", err);
            await client.sendMessage(chatId, "⚠️ Falha ao tentar ejetar o tripulante. Verifique se ele ainda está no grupo ou se eu ainda sou admin.");
        }
    }
};