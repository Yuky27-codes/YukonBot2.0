module.exports = {
    name: 'lock',
    async execute(client, msg, { chatId, isAdmin, GroupConfig }) {
        if (!isAdmin) return; // Só ADMs da lista ou superusers podem usar

        await GroupConfig.updateOne(
            { groupId: chatId },
            { $set: { onlyAdms: true } },
            { upsert: true }
        );

        await client.sendMessage(chatId, "🔒 *PROTOCOLO DE SEGURANÇA:* A Yukon Station agora está em modo restrito. Apenas oficiais (ADMs) podem interagir com o bot.");
    }
};