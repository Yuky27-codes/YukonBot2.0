module.exports = {
    name: 'rebaixar',
    async execute(client, msg, { chatId, isAdmin, User, args }) {
        if (!isAdmin) return msg.reply("❌ *ACESSO NEGADO:* Você não tem autorização para rebaixar oficiais.");

        try {
            let alvoId = null;
            if (msg.hasQuotedMsg) {
                const quoted = await msg.getQuotedMessage();
                alvoId = (quoted.author || quoted.from).toString();
            } else if (msg.mentionedIds.length > 0) {
                alvoId = (msg.mentionedIds[0]._serialized || msg.mentionedIds[0]).toString();
            }

            if (!alvoId) return msg.reply("❗ Mencione ou responda a mensagem de quem será rebaixado.");

            await User.updateOne(
                { userId: alvoId, groupId: chatId },
                { $set: { isBotAdmin: false } }
            );

            await client.sendMessage(chatId, `📉 *REBAIXAMENTO:* @${alvoId.split('@')[0]} foi destituído de seu cargo de oficial.`, {
                mentions: [alvoId]
            });

        } catch (e) {
            msg.reply("⚠️ Erro ao processar rebaixamento.");
        }
    }
};