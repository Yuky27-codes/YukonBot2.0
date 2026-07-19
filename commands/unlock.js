module.exports = {
    name: 'unlock',
    async execute(client, msg, { chatId, isAdmin, args, GroupConfig }) {
        if (!isAdmin) return;

        const categoria = args[0]?.toLowerCase();

        // Mapeamento idêntico ao do /lock
        const mapaCampos = {
            'adm': 'admLocked',
            'jogos': 'jogosLocked',
            'economia': 'ecoLocked',
            'ia': 'iaLocked',
            'sala': 'salaLocked',
            'social': 'socLocked',
            'util': 'utilLocked'
        };

        // Se o usuário digitar apenas /unlock sem categoria, libera tudo (Opcional)
        if (!categoria) {
            await GroupConfig.updateOne(
                { groupId: chatId },
                { $set: { 
                    admLocked: false, jogosLocked: false, ecoLocked: false, 
                    iaLocked: false, salaLocked: false, socLocked: false, utilLocked: false 
                } },
                { upsert: true }
            );
            return await client.sendMessage(chatId, "🔓 *SISTEMA LIBERADO:* Todas as categorias foram reativadas.");
        }

        if (mapaCampos[categoria]) {
            const campo = mapaCampos[categoria];
            await GroupConfig.updateOne(
                { groupId: chatId },
                { $set: { [campo]: false } },
                { upsert: true }
            );
            return await client.sendMessage(chatId, `🔓 *SISTEMA:* A categoria *${categoria.toUpperCase()}* foi desbloqueada com sucesso.`);
        } else {
            return await client.sendMessage(chatId, "⚠️ *Categoria inválida.* Use: /unlock [adm/jogos/economia/ia/sala/social/util]");
        }
    }
};