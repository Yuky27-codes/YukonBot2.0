module.exports = {
    name: 'abandonar',
    async execute(client, msg, { chatId, senderRaw, User }) {
        const mencoes = msg.mentionedIds;
        if (mencoes.length === 0) return await msg.reply("❓ Mencione o parente que deseja remover da família.");

        const alvoId = String(mencoes[0]._serialized || mencoes[0]).trim();

        await User.updateOne(
            { userId: senderRaw, groupId: chatId },
            { $pull: { family: { userId: alvoId } } }
        );

        await msg.reply("💔 *YUKON:* Parentesco removido dos registros oficiais.");
    }
};