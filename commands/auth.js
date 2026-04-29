module.exports = {
    name: 'auth',
    async execute(client, msg, { args, isAdmin }) {
        if (!isAdmin) return; 

        const acao = args[0]; 
        const idGrupo = args[1];

        if (!idGrupo || !idGrupo.includes('@g.us')) {
            return msg.reply("⚠️ Use: /auth [add|ativar|block|teste] [ID_DO_GRUPO]@g.us");
        }

        const AuthorizedGroup = require('mongoose').model('AuthorizedGroup');

        // 🟢 ADD - Apenas cadastra (inativo)
        if (acao === 'add') {
            await AuthorizedGroup.updateOne(
                { groupId: idGrupo },
                { $set: { groupId: idGrupo, isAuthorized: false } },
                { upsert: true }
            );
            return msg.reply(`✅ Grupo \`${idGrupo}\` registrado no sistema.`);
        }

        // 🟢 ATIVAR - Libera por 30 dias
        if (acao === 'ativar') {
            const dataVencimento = new Date();
            dataVencimento.setDate(dataVencimento.getDate() + 30); 

            await AuthorizedGroup.updateOne(
                { groupId: idGrupo },
                { $set: { isAuthorized: true, expiresAt: dataVencimento } }
            );
            return msg.reply(`🔓 *ASSINATURA ATIVADA*\n🗓️ Vence em: ${dataVencimento.toLocaleDateString('pt-BR')}`);
        }

        // 🟢 TESTE - Libera por apenas 10 SEGUNDOS
        if (acao === 'teste') {
            const tempoTeste = new Date(Date.now() + 10 * 1000); // 10 segundos à frente

            await AuthorizedGroup.updateOne(
                { groupId: idGrupo },
                { $set: { isAuthorized: true, expiresAt: tempoTeste } }
            );
            return msg.reply(`⏳ *MODO TESTE ATIVADO*\nO grupo tem **10 segundos** de acesso liberado!`);
        }

        // 🟢 BLOCK - Bloqueia agora
        if (acao === 'block') {
            await AuthorizedGroup.updateOne(
                { groupId: idGrupo },
                { $set: { isAuthorized: false, expiresAt: new Date() } }
            );
            return msg.reply(`🛑 Grupo bloqueado imediatamente.`);
        }
    }
};