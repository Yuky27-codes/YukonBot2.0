module.exports = {
    name: 'auth',
    async execute(client, msg, { args, isAdmin }) {
        // 1. Bloqueio de segurança: Apenas você (Dono) pode rodar
        if (!isAdmin) return; 

        // 2. Recomendação: Usar apenas no PV para segurança de dados
        const chat = await msg.getChat();
        if (chat.isGroup) {
            return msg.reply("❌ Por segurança, gerencie as licenças apenas no meu chat privado.");
        }

        const acao = args[0]; // 'add' ou 'rem'
        const idGrupo = args[1];

        // 3. Validação de argumentos
        if (!acao || !idGrupo || !idGrupo.includes('@g.us')) {
            return msg.reply("⚠️ *FORMATO INVÁLIDO*\nUse: `/auth add ID@g.us` ou `/auth rem ID@g.us`\n\n_Dica: Use /grupos para pegar os IDs corretamente._");
        }

        try {
            const mongoose = require('mongoose');
            const AuthorizedGroup = mongoose.model('AuthorizedGroup');

            if (acao === 'add') {
                // Adiciona ou reativa a licença
                await AuthorizedGroup.updateOne(
                    { groupId: idGrupo },
                    { 
                        $set: { 
                            isAuthorized: true, 
                            authorizedBy: msg.author || msg.from,
                            updatedAt: new Date()
                        } 
                    },
                    { upsert: true }
                );
                return msg.reply(`✅ *ESTAÇÃO AUTORIZADA*\n━━━━━━━━━━━━━━━━━━━━━\n🆔 ID: \`${idGrupo}\`\nStatus: **Ativo (Licenciado)**`);
            } 
            
            if (acao === 'rem') {
                // Desativa a licença (O grupo continua no banco, mas com isAuthorized: false)
                const result = await AuthorizedGroup.updateOne(
                    { groupId: idGrupo },
                    { $set: { isAuthorized: false, updatedAt: new Date() } }
                );

                if (result.matchedCount === 0) {
                    return msg.reply("⚠️ Este grupo não estava na lista de autorizados.");
                }

                return msg.reply(`🔴 *ESTAÇÃO BLOQUEADA*\n━━━━━━━━━━━━━━━━━━━━━\n🆔 ID: \`${idGrupo}\`\nStatus: **Inativo (Acesso Negado)**`);
            }

            return msg.reply("❓ Ação inválida. Use `add` ou `rem`.");

        } catch (err) {
            console.error("❌ Erro no comando AUTH:", err);
            return msg.reply("⚠️ Erro interno ao processar a licença no banco de dados.");
        }
    }
};