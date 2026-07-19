module.exports = {
    name: 'lock',
    async execute(client, msg, { chatId, isAdmin, args, GroupConfig }) {
        if (!isAdmin) return;

        const categoria = args[0]?.toLowerCase();

        // CASO 1: Bloqueio Global (Original)
        if (!categoria) {
            const config = await GroupConfig.findOne({ groupId: chatId }) || { groupId: chatId };
            const novoEstado = !config.onlyAdms;
            
            await GroupConfig.updateOne({ groupId: chatId }, { $set: { onlyAdms: novoEstado } }, { upsert: true });
            return await client.sendMessage(chatId, `🛡️ *MODO ADM:* O grupo agora está ${novoEstado ? 'somente para administradores' : 'aberto para todos'}.`);
        }

        // CASO 2: Bloqueio por Categoria (Novo)
        const mapaCampos = {
            'adm': 'admLocked',
            'jogos': 'jogosLocked',
            'economia': 'ecoLocked',
            'ia': 'iaLocked',
            'sala': 'salaLocked',
            'social': 'socLocked',
            'util': 'utilLocked'
        };

        if (mapaCampos[categoria]) {
            const campo = mapaCampos[categoria];
            const config = await GroupConfig.findOne({ groupId: chatId }) || { groupId: chatId };
            const novoEstado = !config[campo];

            await GroupConfig.updateOne({ groupId: chatId }, { $set: { [campo]: novoEstado } }, { upsert: true });
            return await client.sendMessage(chatId, `🔒 *SISTEMA:* Categoria *${categoria.toUpperCase()}* está agora ${novoEstado ? 'BLOQUEADA' : 'LIBERADA'}.`);
        } else {
            return await client.sendMessage(chatId, "⚠️ *Categoria inválida.* Use: /lock [ou apenas /lock para bloquear tudo]");
        }
    }
};