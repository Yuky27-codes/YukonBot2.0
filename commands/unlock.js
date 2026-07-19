module.exports = {
    name: 'unlock',
    async execute(client, msg, { chatId, isAdmin, args, GroupConfig }) {
        if (!isAdmin) return;

        const categoria = args[0]?.toLowerCase();

        // Mapeamento de categorias
        const mapaCampos = {
            'adm': 'admLocked',
            'jogos': 'jogosLocked',
            'economia': 'ecoLocked',
            'ia': 'iaLocked',
            'sala': 'salaLocked',
            'social': 'socLocked',
            'util': 'utilLocked'
        };

        // CASO 1: Desbloqueio Global (Libera o grupo todo para membros)
        if (!categoria) {
            await GroupConfig.updateOne(
                { groupId: chatId },
                { $set: { onlyAdms: false } },
                { upsert: true }
            );
            return await client.sendMessage(chatId, "🔓 *MODO ADM DESATIVADO:* O grupo está aberto para todos.");
        }

        // CASO 2: Desbloqueio por Categoria
        if (mapaCampos[categoria]) {
            const campo = mapaCampos[categoria];
            await GroupConfig.updateOne(
                { groupId: chatId },
                { $set: { [campo]: false } },
                { upsert: true }
            );
            return await client.sendMessage(chatId, `🔓 *SISTEMA:* A categoria *${categoria.toUpperCase()}* foi desbloqueada para os membros.`);
        } else {
            return await client.sendMessage(chatId, "⚠️ *Categoria inválida.* Use: /unlock [ou apenas /unlock para liberar tudo]");
        }
    }
};