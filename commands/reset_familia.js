module.exports = {
    name: 'reset_familia',
    async execute(client, msg, { chatId, senderRaw, User }) {
        try {
            const autorId = String(senderRaw).trim();

            // Buscamos os dados do autor para encontrar o cônjuge também
            const autorData = await User.findOne({ userId: autorId, groupId: chatId });

            if (!autorData) {
                return await msg.reply("❌ *SISTEMA:* Você não possui registros nos arquivos da Yukon.");
            }

            const conjugeId = autorData.marriedWith;

            // 1. Limpa os dados do Autor
            await User.updateOne(
                { userId: autorId, groupId: chatId },
                { 
                    $set: { 
                        family: [], 
                        marriedWith: null,
                        loverWith: null 
                    } 
                }
            );

            // 2. Se houver um cônjuge, limpa os dados dele também para não quebrar o par
            if (conjugeId) {
                await User.updateOne(
                    { userId: conjugeId, groupId: chatId },
                    { 
                        $set: { 
                            family: [], 
                            marriedWith: null,
                            loverWith: null 
                        } 
                    }
                );
            }

            const textoReset = `
⚠️ *PROTOCOLO DE LIMPEZA — YUKON* ⚠️
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Os arquivos genealógicos de @${autorId.split('@')[0]} foram deletados com sucesso!

✅ *STATUS:*
- Família: Esvaziada
- Casamento: Anulado
- Amantes: Removidos

*Você agora é um cidadão livre para novos testes na estação.*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`.trim();

            const mencoes = [autorId];
            if (conjugeId) mencoes.push(conjugeId);

            await client.sendMessage(chatId, textoReset, { mentions: mencoes });

        } catch (e) {
            console.error("❌ Erro ao resetar família:", e);
            await msg.reply("❌ Falha crítica ao tentar deletar os registros familiares.");
        }
    }
};