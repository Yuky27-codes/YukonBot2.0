module.exports = {
    name: 'adv',
    async execute(client, msg, { chatId, senderRaw, isAdmin, User, iAmAdmin }) {
        try {
            // 1. Verificação de Permissão (Somente Admins do Bot/Projeto)
            if (!isAdmin) {
                return msg.reply("❌ Você não tem permissão para usar este comando de moderação.");
            }

            const chat = await msg.getChat();
            if (!chat.isGroup) return msg.reply("Este comando só pode ser usado em grupos.");

            let targetAdv;

            // 2. Identificação do Alvo (por Resposta ou Menção)
            if (msg.hasQuotedMsg) {
                const quoted = await msg.getQuotedMessage();
                targetAdv = (quoted.author || quoted.from)._serialized || (quoted.author || quoted.from).toString();
            } else if (msg.mentionedIds.length > 0) {
                targetAdv = msg.mentionedIds[0]._serialized || msg.mentionedIds[0].toString();
            }

            if (!targetAdv) {
                return msg.reply("❗ Marque ou responda a mensagem de quem você deseja dar advertência.");
            }

            const targetStr = String(targetAdv).trim();

            // 3. Atualização no Banco de Dados
            const userDb = await User.findOneAndUpdate(
                { userId: targetStr, groupId: chatId },
                { $inc: { advs: 1 } },
                { upsert: true, new: true } // 'new: true' é o novo padrão do Mongoose para retornar o dado atualizado
            );

            // 4. Lógica de Expulsão (3 Advertências)
            if (userDb.advs >= 3) {
                await client.sendMessage(chatId, `🚫 @${targetStr.split('@')[0]} atingiu 3 advertências e será ejetado da Yukon!`, { 
                    mentions: [targetStr] 
                });
                
                // Só tenta remover se o bot for Admin do grupo
                if (iAmAdmin) {
                    try {
                        await chat.removeParticipants([targetStr]);
                    } catch (e) {
                        await msg.reply("⚠️ Não consegui remover o usuário. Verifique se o bot ainda é admin.");
                    }
                } else {
                    await msg.reply("⚠️ O usuário atingiu o limite, mas não sou admin para removê-lo.");
                }

                // Reseta as advertências após a ejeção
                await User.updateOne(
                    { userId: targetStr, groupId: chatId },
                    { $set: { advs: 0 } }
                );
            } else {
                // 5. Aviso de Advertência Simples
                await client.sendMessage(chatId, `⚠️ @${targetStr.split('@')[0]} recebeu uma advertência!\nStatus: *(${userDb.advs}/3)*`, { 
                    mentions: [targetStr] 
                });
            }

        } catch (err) {
            console.error("❌ ERRO NO COMANDO ADV:", err);
            await msg.reply("⚠️ Erro ao processar a advertência.");
        }
    }
};