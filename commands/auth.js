module.exports = {
    name: 'auth',
    async execute(client, msg, { args, isAdmin }) {
        if (!isAdmin) return; // Apenas VOCÊ pode rodar isso

        const acao = args[0]; // 'add' ou 'rem'
        const idGrupo = args[1];

        if (!acao || !idGrupo) return msg.reply("Use: /auth add [ID] ou /auth rem [ID]");

        const AuthorizedGroup = require('mongoose').model('AuthorizedGroup');

        if (acao === 'add') {
            await AuthorizedGroup.updateOne(
                { groupId: idGrupo },
                { $set: { isAuthorized: true, authorizedBy: msg.author || msg.from } },
                { upsert: true }
            );
            return msg.reply(`✅ Grupo \`${idGrupo}\` autorizado com sucesso!`);
        } 
        
        if (acao === 'rem') {
            await AuthorizedGroup.updateOne(
                { groupId: idGrupo },
                { $set: { isAuthorized: false } }
            );
            return msg.reply(`🔴 Grupo \`${idGrupo}\` bloqueado.`);
        }
    }
};
