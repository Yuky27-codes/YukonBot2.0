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

            // --- 🛡️ NOVA TRAVA RASTREADORA (BUSCA EM TODO O BANCO) ---
            // Procuramos qualquer usuário que já tenha esse alvoId na lista de família
            const familiaExistente = await User.findOne({ 
                groupId: chatId, 
                "family.userId": alvoId 
            });
            
            if (familiaExistente) {
                return await msg.reply("❌ *FALHA NO REGISTRO:* Este tripulante já está vinculado a uma linhagem existente. Ele precisa ser removido da família atual antes de uma nova adoção.");
            }
            // -------------------------------------------------------

            if (alvoId === autorId || alvoId === conjugeId) {
                return await msg.reply("❌ Você não pode adotar a si mesmo ou ao seu cônjuge.");
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

            // 2. Registra os pais no perfil do filho (Importante para o /familia dele)
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