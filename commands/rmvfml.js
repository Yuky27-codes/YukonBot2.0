module.exports = {
    name: 'rmvfml',
    async execute(client, msg, { chatId, senderRaw, User, isGroupAdmins }) {
        try {
            const mencoes = msg.mentionedIds;
            const autorId = String(senderRaw).trim();

            if (!mencoes.length) {
                return await msg.reply("❓ *COMO USAR:* `/rmvfml @tripulante`\nMencione o parente ou filho que deseja remover da linhagem.");
            }

            const alvoId = String(mencoes[0]._serialized || mencoes[0]).trim();

            // 1. Buscar os dados do autor e do alvo
            const autorData = await User.findOne({ userId: autorId, groupId: chatId });
            const alvoData = await User.findOne({ userId: alvoId, groupId: chatId });

            if (!autorData) return await msg.reply("❌ Você não possui registros na Yukon.");
            if (!alvoData) return await msg.reply("❌ Tripulante alvo não encontrado nos registros.");

            // 2. Verificar se o alvo realmente pertence à família do autor
            const parenteIndex = autorData.family.findIndex(f => f.userId === alvoId);

            if (parenteIndex === -1) {
                return await msg.reply("⚠️ Este tripulante não consta como seu parente ou filho.");
            }

            // 3. REMOÇÃO SINCRONIZADA
            // Remove o alvo da família do autor (e do cônjuge, se houver)
            const idsParaLimpar = [autorId];
            if (autorData.marriedWith) idsParaLimpar.push(autorData.marriedWith);

            await User.updateMany(
                { userId: { $in: idsParaLimpar }, groupId: chatId },
                { $pull: { family: { userId: alvoId } } }
            );

            // Remove o autor (e cônjuge) da família do alvo
            // Isso libera o alvo para ser adotado por outra família
            await User.updateOne(
                { userId: alvoId, groupId: chatId },
                { $pull: { family: { userId: { $in: idsParaLimpar } } } }
            );

            const textoRemocao = `
🗑️ *REGISTRO DE LINHAGEM REMOVIDO*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
O vínculo familiar com @${alvoId.split('@')[0]} foi encerrado.

✨ *STATUS:* Os arquivos da Yukon foram atualizados e o tripulante agora está sem vínculos familiares diretos.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`.trim();

            await client.sendMessage(chatId, textoRemocao, { 
                mentions: [alvoId, autorId] 
            });

        } catch (e) {
            console.error("Erro no comando rmvfml:", e);
            await msg.reply("❌ Falha crítica ao atualizar os registros familiares.");
        }
    }
};
