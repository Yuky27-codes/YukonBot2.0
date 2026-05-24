module.exports = {
    name: 'deserdar',
    async execute(client, msg, { chatId, senderRaw, User }) {
        try {
            const autorId = String(senderRaw).trim();
            const mencoes = msg.mentionedIds;

            if (!mencoes.length) {
                return await client.sendMessage(chatId, "❓ *COMO USAR:* `/deserdar @tripulante`\nRemove essa pessoa da sua família.");
            }

            const alvoId = String(mencoes[0]._serialized || mencoes[0]).trim();

            if (alvoId === autorId) {
                return await client.sendMessage(chatId, "❌ Você não pode se deserdar!");
            }

            const autorData = await User.findOne({ userId: autorId, groupId: chatId });

            if (!autorData || !autorData.family || autorData.family.length === 0) {
                return await client.sendMessage(chatId, "❌ Você não tem ninguém registrado na sua família.");
            }

            // Verifica se o alvo está na família do autor
            const estaNaFamilia = autorData.family.some(f => f.userId === alvoId);
            if (!estaNaFamilia) {
                return await client.sendMessage(chatId, `⚠️ @${alvoId.split('@')[0]} não faz parte da sua família.`, { mentions: [alvoId] });
            }

            // Remove APENAS do lado do autor
            await User.updateOne(
                { userId: autorId, groupId: chatId },
                { $pull: { family: { userId: alvoId } } }
            );

            await client.sendMessage(chatId, `📜 *DESERÇÃO REGISTRADA — YUKON*
━━━━━━━━━━━━━━━━━━━━━
@${alvoId.split('@')[0]} não faz mais parte da sua família, @${autorId.split('@')[0]}.

💔 O vínculo foi removido dos seus registros.
━━━━━━━━━━━━━━━━━━━━━`, { mentions: [autorId, alvoId] });

        } catch (e) {
            console.error("❌ Erro no /deserdar:", e);
            await client.sendMessage(chatId, "⚠️ Erro ao processar a deserção.");
        }
    }
};