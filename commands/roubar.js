module.exports = {
    name: 'roubar',
    async execute(client, msg, { chatId, senderRaw, User }) {
        try {
            const mencoes = msg.mentionedIds;
            const alvoRaw = mencoes.length > 0 ? (mencoes[0]._serialized || mencoes[0]) : null;
            const autorId = String(senderRaw).trim();

            if (!alvoRaw) return await client.sendMessage(chatId, "👤 *SISTEMA:* Mencione o alvo do assalto!");
            
            const alvoId = String(alvoRaw).trim();
            if (alvoId === autorId) return await client.sendMessage(chatId, "❓ Você não pode roubar a si mesmo.");

            const autorData = await User.findOne({ userId: autorId, groupId: chatId });
            const alvoData = await User.findOne({ userId: alvoId, groupId: chatId });

            if (!alvoData || alvoData.coins <= 0) return await client.sendMessage(chatId, "⚠️ O alvo não tem moedas.");
            if (!autorData || autorData.coins < 50) return await client.sendMessage(chatId, "⚠️ Você precisa de 50 coins para arriscar um roubo.");

            const sucesso = Math.random() < 0.40; // 40% de chance

            if (sucesso) {
                const valorRoubado = Math.floor(alvoData.coins * 0.20); // Rouba 20%
                await User.updateOne({ userId: autorId, groupId: chatId }, { $inc: { coins: valorRoubado } });
                await User.updateOne({ userId: alvoId, groupId: chatId }, { $inc: { coins: -valorRoubado } });

                await client.sendMessage(chatId, `🥷 *GOLPE DE MESTRE!*\n\n@${autorId.split('@')[0]} roubou *${valorRoubado}* coins de @${alvoId.split('@')[0]}!`, { mentions: [autorId, alvoId] });
            } else {
                const multa = Math.floor(autorData.coins * 0.30);
                const tempoPrisao = 5 * 60 * 1000; // 5 minutos
                const soltarEm = Date.now() + tempoPrisao;

                // Marca como mutado e define o tempo final no banco
                await User.updateOne(
                    { userId: autorId, groupId: chatId },
                    { 
                        $inc: { coins: -multa }, 
                        $set: { isMuted: true, muteExpires: soltarEm } 
                    }
                );

                await client.sendMessage(chatId, `🚨 *POLÍCIA DA YUKON!*\n\n@${autorId.split('@')[0]} foi pego! \n💰 Perdeu: *${multa}* coins\n⛓️ Prisão: *5 minutos* (Mensagens serão apagadas)`, { mentions: [autorId] });
            }
        } catch (e) { console.error(e); }
    }
};