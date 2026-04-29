module.exports = {
    name: 'auth',
    async execute(client, msg, { args, isAdmin }) {
        if (!isAdmin) return; 

        const acao = args[0]; 
        const idGrupo = args[1];

        if (!idGrupo || !idGrupo.includes('@g.us')) {
            return msg.reply("⚠️ *FORMATO INCORRETO*\n\nUse: `/auth [add|ativar|block|teste] [ID]@g.us`\n\n_Dica: Use /grupos para pegar o ID._");
        }

        const AuthorizedGroup = require('mongoose').model('AuthorizedGroup');

        // 🟢 ADD - Registro inicial
        if (acao === 'add') {
            await AuthorizedGroup.updateOne(
                { groupId: idGrupo },
                { $set: { groupId: idGrupo, isAuthorized: false } },
                { upsert: true }
            );
            return msg.reply(`🛰️ *YUKON REGISTRY*\n\nGrupo \`${idGrupo}\` foi adicionado ao banco de dados com sucesso.`);
        }

        // 🟢 ATIVAR - 30 Dias
        if (acao === 'ativar') {
            const dataVencimento = new Date();
            dataVencimento.setDate(dataVencimento.getDate() + 30); 

            await AuthorizedGroup.updateOne(
                { groupId: idGrupo },
                { $set: { isAuthorized: true, expiresAt: dataVencimento } },
                { upsert: true }
            );
            return msg.reply(`🔓 *ESTAÇÃO LIBERADA*\n━━━━━━━━━━━━━━━━━━━━━\n🛰️ Status: **Assinatura Ativa**\n🗓️ Vencimento: **${dataVencimento.toLocaleDateString('pt-BR')}**`);
        }

        // 🟢 TESTE - 10 Segundos (Foco no milissegundo para o banco não arredondar)
        if (acao === 'teste') {
            const tempoTeste = new Date(Date.now() + 10000); 

            await AuthorizedGroup.updateOne(
                { groupId: idGrupo },
                { $set: { isAuthorized: true, expiresAt: tempoTeste } },
                { upsert: true }
            );
            return msg.reply(`⏳ *MODO DE TESTE RÁPIDO*\n━━━━━━━━━━━━━━━━━━━━━\nAcesso liberado por **10 segundos**.\n\n_Prepare o cronômetro!_`);
        }

        // 🟢 BLOCK - Corte imediato
        if (acao === 'block') {
            await AuthorizedGroup.updateOne(
                { groupId: idGrupo },
                { $set: { isAuthorized: false, expiresAt: new Date(0) } }, // Define a data para o ano 1970 (garante que expirou)
                { upsert: true }
            );
            return msg.reply(`🛑 *CONEXÃO ENCERRADA*\n\nO grupo foi bloqueado e a licença revogada.`);
        }
    }
};