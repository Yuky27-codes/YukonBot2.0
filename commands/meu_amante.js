module.exports = {
    name: 'meu_amante',
    async execute(client, msg, { chatId, senderRaw, User }) {
        try {
            const user = await User.findOne({ userId: senderRaw, groupId: chatId });

            if (!user) return await msg.reply("❌ Você não está registrado no banco de dados.");

            const casadoCom = user.marriedWith ? `@${user.marriedWith.split('@')[0]}` : "Ninguém (Solteiro)";
            const amanteDe = user.loverWith ? `@${user.loverWith.split('@')[0]}` : "Nenhum amante registrado";

            const mentions = [];
            if (user.marriedWith) mentions.push(user.marriedWith);
            if (user.loverWith) mentions.push(user.loverWith);

            const textoStatus = `
📂 *ARQUIVOS CONFIDENCIAIS — YUKON*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 *SOLICITANTE:* @${senderRaw.split('@')[0]}

💍 *CÔNJUGE OFICIAL:* ${casadoCom}
🔥 *AMANTE SECRETO:* ${amanteDe}

⚠️ *Cuidado para não ser pego em flagrante no setor de carga!*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`.trim();

            await client.sendMessage(chatId, textoStatus, { mentions: [senderRaw, ...mentions] });

        } catch (e) {
            console.error(e);
        }
    }
};