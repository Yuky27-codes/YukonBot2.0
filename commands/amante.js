module.exports = {
    name: 'amante',
    async execute(client, msg, { chatId, senderRaw, User }) {
        try {
            const mencoes = msg.mentionedIds;
            const autorId = String(senderRaw).trim();

            if (mencoes.length === 0) {
                return await msg.reply("❓ *COMO USAR:* `/amante @tripulante`\nPeça para alguém ser seu(sua) amante secreto(a).");
            }

            const alvoId = String(mencoes[0]._serialized || mencoes[0]).trim();

            if (alvoId === autorId) return await msg.reply("❓ Você não pode ser seu próprio amante... isso seria apenas solidão espacial.");

            // Salva a proposta temporariamente na memória ou apenas define
            // Para simplificar e gerar diversão imediata, vamos definir direto:
            await User.updateOne({ userId: autorId, groupId: chatId }, { $set: { loverWith: alvoId } });
            
            const textoLover = `
🔥 *CASO EXTRA-CONJUGAL NA ESTAÇÃO!* 🔥
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@${autorId.split('@')[0]} acaba de declarar que @${alvoId.split('@')[0]} é seu(sua) novo(a) amante!

🤫 *Mantenham isso longe dos radares da Carcereira...*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`.trim();

            await client.sendMessage(chatId, textoLover, { mentions: [autorId, alvoId] });

        } catch (e) {
            console.error(e);
        }
    }
};