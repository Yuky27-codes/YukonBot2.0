module.exports = {
    name: 'familia',
    async execute(client, msg, { chatId, senderRaw, User }) {
        try {
            const user = await User.findOne({ userId: senderRaw, groupId: chatId });

            if (!user || !user.family || user.family.length === 0) {
                return await msg.reply("📭 *YUKON:* Você ainda não tem parentes registrados nesta estação.");
            }

            let listaFamilia = `🏠 *FAMÍLIA DE @${senderRaw.split('@')[0]}*\n━━━━━━━━━━━━━━━━━━━━━\n`;
            const mentions = [senderRaw];

            user.family.forEach(parente => {
                const idCurto = parente.userId.split('@')[0];
                listaFamilia += `• **${parente.role.toUpperCase()}:** @${idCurto}\n`;
                mentions.push(parente.userId);
            });

            listaFamilia += `━━━━━━━━━━━━━━━━━━━━━`;

            await client.sendMessage(chatId, listaFamilia, { mentions });

        } catch (e) {
            console.error(e);
        }
    }
};