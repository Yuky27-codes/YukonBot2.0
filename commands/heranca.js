module.exports = {
    name: 'heranca',
    async execute(client, msg, { chatId, senderRaw, User }) {
        try {
            const autorId = String(senderRaw).trim();
            const autorData = await User.findOne({ userId: autorId, groupId: chatId });

            if (!autorData || autorData.coins <= 0) {
                return await msg.reply("⚠️ Você não possui créditos para deixar como herança.");
            }

            if (!autorData.family || autorData.family.length === 0) {
                return await msg.reply("❌ *SISTEMA:* Você não possui herdeiros (família) registrados na Yukon.");
            }

            const totalHeranca = autorData.coins;
            const herdeiros = autorData.family.map(p => p.userId);
            const valorCada = Math.floor(totalHeranca / herdeiros.length);

            // Zera o saldo do autor
            await User.updateOne({ userId: autorId, groupId: chatId }, { $set: { coins: 0 } });

            // Distribui para a família
            await User.updateMany(
                { userId: { $in: herdeiros }, groupId: chatId },
                { $inc: { coins: valorCada } }
            );

            const textoHeranca = `
📜 *TESTAMENTO EXECUTADO — YUKON*
━━━━━━━━━━━━━━━━━━━━━
@${autorId.split('@')[0]} decidiu distribuir sua fortuna!

💰 *TOTAL PARTILHADO:* ${totalHeranca.toLocaleString('pt-BR')} YC
👥 *HERDEIROS:* ${herdeiros.length} parentes
🎁 *VALOR RECEBIDO:* ${valorCada.toLocaleString('pt-BR')} YC cada.

*Que os herdeiros façam bom proveito dos créditos!*
━━━━━━━━━━━━━━━━━━━━━`.trim();

            await client.sendMessage(chatId, textoHeranca, { mentions: [autorId, ...herdeiros] });

        } catch (e) {
            console.error(e);
            await msg.reply("❌ Erro ao processar o inventário de herança.");
        }
    }
};