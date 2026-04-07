module.exports = {
    name: 'unlock',
    async execute(client, msg, { chatId, isAdmin, GroupConfig }) {
        if (!isAdmin) return;

        await GroupConfig.updateOne(
            { groupId: chatId },
            { $set: { onlyAdms: false } },
            { upsert: true }
        );

        await client.sendMessage(chatId, "🔓 *SISTEMA LIBERADO:* A tripulação agora tem permissão total para usar os comandos da Yukon.");
    }
};