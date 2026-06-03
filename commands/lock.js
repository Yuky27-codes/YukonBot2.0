module.exports = {
    name: 'lock',
    async execute(client, msg, { chatId, isAdmin, args, GroupConfig }) {
        if (!isAdmin) return;

        const subcomando = args[0]?.toLowerCase();

        // --- LOCK JOGOS ---
        if (subcomando === 'jogos') {
            await GroupConfig.updateOne(
                { groupId: chatId },
                { $set: { jogosLocked: true } },
                { upsert: true }
            );
            return await client.sendMessage(chatId, "🔒 *JOGOS BLOQUEADOS:* Os comandos de jogos, pets e quiz foram desativados neste grupo.");
        }

        // --- LOCK NORMAL (já existia) ---
        await GroupConfig.updateOne(
            { groupId: chatId },
            { $set: { onlyAdms: true } },
            { upsert: true }
        );
        await client.sendMessage(chatId, "🔒 *PROTOCOLO DE SEGURANÇA:* A Yukon Station agora está em modo restrito. Apenas oficiais (ADMs) podem interagir com o bot.");
    }
};