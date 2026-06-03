module.exports = {
    name: 'unlock',
    async execute(client, msg, { chatId, isAdmin, args, GroupConfig }) {
        if (!isAdmin) return;

        const subcomando = args[0]?.toLowerCase();

        // --- UNLOCK JOGOS ---
        if (subcomando === 'jogos') {
            await GroupConfig.updateOne(
                { groupId: chatId },
                { $set: { jogosLocked: false } },
                { upsert: true }
            );
            return await client.sendMessage(chatId, "🔓 *JOGOS LIBERADOS:* Os comandos de jogos, pets e quiz foram reativados neste grupo.");
        }

        // --- UNLOCK NORMAL (já existia) ---
        await GroupConfig.updateOne(
            { groupId: chatId },
            { $set: { onlyAdms: false } },
            { upsert: true }
        );
        await client.sendMessage(chatId, "🔓 *SISTEMA LIBERADO:* A tripulação agora tem permissão total para usar os comandos da Yukon.");
    }
};