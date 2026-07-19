module.exports = {
    name: 'lock',
    async execute(client, msg, { chatId, isAdmin, args, GroupConfig }) {
        if (!isAdmin) return;

        // O primeiro argumento é a categoria, o segundo é o estado (opcional)
        const categoria = args[0]?.toLowerCase();
        
        // Mapeamento das categorias para os campos no seu Schema
        const mapaCampos = {
            'adm': 'admLocked',
            'jogos': 'jogosLocked',
            'economia': 'ecoLocked',
            'ia': 'iaLocked',
            'sala': 'salaLocked',
            'social': 'socLocked',
            'util': 'utilLocked'
        };

        if (!categoria || !mapaCampos[categoria]) {
            return await client.sendMessage(chatId, `⚠️ *Uso correto:* /lock [categoria]
            
Categorias disponíveis: 
- adm, jogos, economia, ia, sala, social, util

Exemplo: /lock jogos`);
        }

        const campo = mapaCampos[categoria];

        // Alterna o estado (se estiver true, vira false e vice-versa)
        const config = await GroupConfig.findOne({ groupId: chatId }) || { groupId: chatId };
        const novoEstado = !config[campo];

        await GroupConfig.updateOne(
            { groupId: chatId },
            { $set: { [campo]: novoEstado } },
            { upsert: true }
        );

        const status = novoEstado ? '🔒 BLOQUEADO' : '🔓 DESBLOQUEADO';
        await client.sendMessage(chatId, `⚙️ *Sistema:* Categoria *${categoria.toUpperCase()}* está agora *${status}*.`);
    }
};