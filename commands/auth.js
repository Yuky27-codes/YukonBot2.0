module.exports = {
    name: 'auth',
    async execute(client, msg, { args, isAdmin }) {
        // 1. Bloqueio de segurança: Apenas VOCÊ (Dono) pode rodar
        if (!isAdmin) return; 

        // 2. Trava de Privacidade: Força o uso apenas no Privado do Bot
        const chat = await msg.getChat();
        if (chat.isGroup) {
            return msg.reply("❌ *AÇÃO PRIVADA*\nPor segurança, gerencie as licenças apenas no meu chat privado para não expor dados.");
        }

        const acao = args[0]; // 'add' ou 'rem'
        const idGrupo = args[1];

        // 3. Validação de formato (ID de grupo deve terminar em @g.us)
        if (!acao || !idGrupo || !idGrupo.includes('@g.us')) {
            return msg.reply("⚠️ *FORMATO INVÁLIDO*\n\nUse: `/auth add ID@g.us`\nOu: `/auth rem ID@g.us`\n\n_Dica: Pegue o ID correto usando o comando /grupos._");
        }

        try {
            const mongoose = require('mongoose');
            const AuthorizedGroup = mongoose.model('AuthorizedGroup');

            if (acao === 'add') {
                // Adiciona ou Reativa a licença
                await AuthorizedGroup.updateOne(
                    { groupId: idGrupo },
                    { 
                        $set: { 
                            isAuthorized: true, 
                            authorizedBy: msg.author || msg.from,
                            createdAt: new Date() 
                        } 
                    },
                    { upsert: true }
                );

                return msg.reply(`✅ *ESTAÇÃO AUTORIZADA*\n━━━━━━━━━━━━━━━━━━━━━\n🆔 ID: \`${idGrupo}\`\n🛰️ Status: **Online / Licenciado**`);
            } 
            
            if (acao === 'rem') {
                // Bloqueia o grupo
                const result = await AuthorizedGroup.updateOne(
                    { groupId: idGrupo },
                    { $set: { isAuthorized: false } }
                );

                if (result.matchedCount === 0) {
                    return msg.reply("⚠️ Este grupo não estava cadastrado no banco de dados.");
                }

                return msg.reply(`🔴 *ESTAÇÃO BLOQUEADA*\n━━━━━━━━━━━━━━━━━━━━━\n🆔 ID: \`${idGrupo}\`\n🛰️ Status: **Offline / Acesso Negado**`);
            }

            return msg.reply("❓ Ação desconhecida. Use `add` ou `rem`.");

        } catch (err) {
            console.error("❌ Erro no comando AUTH:", err);
            return msg.reply("⚠️ Erro ao acessar o banco de dados. Verifique o console.");
        }
    }
};