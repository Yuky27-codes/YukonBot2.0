module.exports = {
    name: 'adotar',
    async execute(client, msg, { chatId, senderRaw, User }) {
        try {
            const mencoes = msg.mentionedIds;
            const autorId = String(senderRaw).trim();
            const autorData = await User.findOne({ userId: autorId, groupId: chatId });

            if (!mencoes.length) return await msg.reply("❓ *COMO USAR:* `/adotar @tripulante`.");
            
            if (!autorData || !autorData.marriedWith) {
                return await msg.reply("❌ *ERRO:* Apenas casais oficiais podem adotar filhos.");
            }

            const alvoId = String(mencoes[0]._serialized || mencoes[0]).trim();
            const conjugeId = autorData.marriedWith;

            // --- 🛡️ TRAVA RASTREADORA MELHORADA ---
            // Procuramos se o ALVO está na lista de família de OUTRA pessoa
            // Ignoramos o perfil do próprio alvo para não dar "falso positivo"
            const familiaExistente = await User.findOne({ 
                groupId: chatId, 
                userId: { $ne: alvoId }, // $ne significa "Não é igual a" (ignora o perfil do filho)
                "family.userId": alvoId 
            });
            
            if (familiaExistente) {
                return await msg.reply("❌ *FALHA NO REGISTRO:* Este tripulante já está vinculado a uma linhagem existente. Ele precisa ser removido da família atual antes de uma nova adoção.");
            }
            // -------------------------------------------------------

            if (alvoId === autorId || alvoId === conjugeId) {
                return await msg.reply("❌ Você não pode adotar a si mesmo ou ao seu cônjuge.");
            }

            // Garante que o alvo tenha um perfil e limpa o campo family se estiver bugado
            const alvoData = await User.findOne({ userId: alvoId, groupId: chatId });
            if (alvoData && !Array.isArray(alvoData.family)) {
                await User.updateOne({ userId: alvoId, groupId: chatId }, { $set: { family: [] } });
            }

            const novoFilho = { userId: alvoId, role: 'filho' };
            const paisDoFilho = [
                { userId: autorId, role: 'pai/mãe' },
                { userId: conjugeId, role: 'pai/mãe' }
            ];

            // 1. Adiciona o filho para o casal
            await User.updateMany(
                { userId: { $in: [autorId, conjugeId] }, groupId: chatId },
                { $push: { family: novoFilho } }
            );

            // 2. Registra os pais no perfil do filho
            await User.updateOne(
                { userId: alvoId, groupId: chatId },
                { $set: { family: paisDoFilho } },
                { upsert: true }
            );

            const textoAdocao = `
🍼 *NOVA ADOÇÃO CONCLUÍDA*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
O tripulante @${alvoId.split('@')[0]} agora faz parte da linhagem de @${autorId.split('@')[0]} & @${conjugeId.split('@')[0]}.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`.trim();

            await client.sendMessage(chatId, textoAdocao, { 
                mentions: [alvoId, autorId, conjugeId] 
            });

        } catch (e) {
            console.error(e);
            await msg.reply("❌ Erro ao processar adoção.");
        }
    }
};