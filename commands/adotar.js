module.exports = {
    name: 'adotar',
    async execute(client, msg, { chatId, senderRaw, User }) {
        try {
            const mencoes = msg.mentionedIds;
            const autorId = String(senderRaw).trim();
            const autorData = await User.findOne({ userId: autorId, groupId: chatId });

            if (!mencoes.length) return await client.sendMessage(chatId, "❓ *COMO USAR:* `/adotar @tripulante`.");

            if (!autorData || !autorData.marriedWith) {
                return await client.sendMessage(chatId, "❌ *ERRO:* Apenas casais oficiais podem adotar filhos.");
            }

            const alvoId = String(mencoes[0]._serialized || mencoes[0]).trim();
            const conjugeId = autorData.marriedWith;

            if (alvoId === autorId || alvoId === conjugeId) {
                return await client.sendMessage(chatId, "❌ Você não pode adotar a si mesmo ou ao seu cônjuge.");
            }

            // Verifica se o alvo está vinculado a outra família
            const familiaExistente = await User.findOne({
                groupId: chatId,
                userId: { $ne: alvoId },
                "family.userId": alvoId
            });

            let foiResetado = false;

            if (familiaExistente) {
                // ✅ Em vez de bloquear, limpa os dados familiares do alvo automaticamente
                // Remove o alvo de qualquer família existente (sem afetar casamento)
                await User.updateMany(
                    { groupId: chatId, "family.userId": alvoId },
                    { $pull: { family: { userId: alvoId } } }
                );

                // Limpa apenas o array family do alvo (preserva marriedWith)
                await User.updateOne(
                    { userId: alvoId, groupId: chatId },
                    { $set: { family: [] } }
                );

                foiResetado = true;
            }

            // Garante que o campo family do alvo é um array
            const alvoData = await User.findOne({ userId: alvoId, groupId: chatId });
            if (alvoData && !Array.isArray(alvoData.family)) {
                await User.updateOne({ userId: alvoId, groupId: chatId }, { $set: { family: [] } });
            }

            const novoFilho = { userId: alvoId, role: 'filho' };
            const paisDoFilho = [
                { userId: autorId, role: 'pai/mãe' },
                { userId: conjugeId, role: 'pai/mãe' }
            ];

            // Adiciona o filho para o casal
            await User.updateMany(
                { userId: { $in: [autorId, conjugeId] }, groupId: chatId },
                { $push: { family: novoFilho } }
            );

            // Registra os pais no perfil do filho
            await User.updateOne(
                { userId: alvoId, groupId: chatId },
                { $set: { family: paisDoFilho } },
                { upsert: true }
            );

            // Mensagem varia dependendo se foi resetado ou não
            let textoAdocao;

            if (foiResetado) {
                textoAdocao = `🍼 *ADOÇÃO CONCLUÍDA — YUKON*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ Os registros de @${alvoId.split('@')[0]} estavam com vínculos antigos nos arquivos da estação. O sistema os limpou automaticamente para dar lugar a uma nova família.

💛 Mas o amor de @${autorId.split('@')[0]} & @${conjugeId.split('@')[0]} foi mais forte que qualquer burocracia! A adoção foi concluída com sucesso.

👨‍👩‍👧 @${alvoId.split('@')[0]} agora tem um novo lar e uma família que vai cuidar dele(a) com todo o carinho do universo! 🌌
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`.trim();
            } else {
                textoAdocao = `🍼 *NOVA ADOÇÃO CONCLUÍDA — YUKON*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Uma nova vida começa hoje na Yukon Station!

👨‍👩‍👧 @${alvoId.split('@')[0]} agora faz parte da linhagem de @${autorId.split('@')[0]} & @${conjugeId.split('@')[0]}.

💛 Que essa família cresça com amor, carinho e muitas aventuras estelares juntos! 🚀
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`.trim();
            }

            await client.sendMessage(chatId, textoAdocao, {
                mentions: [alvoId, autorId, conjugeId]
            });

        } catch (e) {
            console.error("❌ Erro no /adotar:", e);
            await client.sendMessage(chatId, "❌ Erro ao processar adoção.");
        }
    }
};