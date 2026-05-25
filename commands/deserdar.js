module.exports = {
    name: 'deserdar',
    async execute(client, msg, { chatId, senderRaw, User }) {
        try {
            const autorId = String(senderRaw).trim();
            const mencoes = msg.mentionedIds;

            if (!mencoes.length) {
                return await client.sendMessage(chatId, "❓ *COMO USAR:* `/deserdar @tripulante`\nRemove qualquer vínculo familiar com essa pessoa.");
            }

            const alvoId = String(mencoes[0]._serialized || mencoes[0]).trim();

            if (alvoId === autorId) {
                return await client.sendMessage(chatId, "❌ Você não pode se deserdar!");
            }

            const autorData = await User.findOne({ userId: autorId, groupId: chatId });

            if (!autorData || !autorData.family || autorData.family.length === 0) {
                return await client.sendMessage(chatId, "❌ Você não tem ninguém registrado na sua família.");
            }

            // Busca o vínculo para mostrar na mensagem
            const vinculo = autorData.family.find(f => f.userId === alvoId);
            if (!vinculo) {
                return await client.sendMessage(chatId, `⚠️ @${alvoId.split('@')[0]} não faz parte da sua família.`, { mentions: [alvoId] });
            }

            const tipoVinculo = vinculo.role || 'familiar';

            // Remove do lado do autor
            await User.updateOne(
                { userId: autorId, groupId: chatId },
                { $pull: { family: { userId: alvoId } } }
            );

            await client.sendMessage(chatId, `📜 *VÍNCULO REMOVIDO — YUKON*
━━━━━━━━━━━━━━━━━━━━━
@${autorId.split('@')[0]} removeu @${alvoId.split('@')[0]} da sua família.

🔗 *Vínculo removido:* ${tipoVinculo}
💔 Os registros foram atualizados nos arquivos da estação.
━━━━━━━━━━━━━━━━━━━━━`, { mentions: [autorId, alvoId] });

        } catch (e) {
            console.error("❌ Erro no /deserdar:", e);
            await client.sendMessage(chatId, "⚠️ Erro ao processar a remoção.");
        }
    }
};