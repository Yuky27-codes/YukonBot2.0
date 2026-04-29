module.exports = {
    name: 'auth',
    async execute(client, msg, { args, isAdmin }) {
        if (!isAdmin) return; 

        const chat = await msg.getChat();
        if (chat.isGroup) {
            return msg.reply("❌ *AÇÃO PRIVADA*\nGerencie as licenças apenas no meu chat privado.");
        }

        const acao = args[0]; // add, rem ou teste
        const idGrupo = args[1];

        if (!acao || !idGrupo || !idGrupo.includes('@g.us')) {
            return msg.reply("⚠️ *FORMATO INVÁLIDO*\n\nUse: `/auth add ID@g.us [dias]`\nEx: `/auth add ID@g.us 30`\nOu: `/auth teste ID@g.us` (10 segundos)");
        }

        try {
            const mongoose = require('mongoose');
            const AuthorizedGroup = mongoose.model('AuthorizedGroup');

            if (acao === 'add') {
                const dias = parseInt(args[2]) || 30; // Se não disser os dias, assume 30
                const dataVencimento = new Date();
                dataVencimento.setDate(dataVencimento.getDate() + dias);

                await AuthorizedGroup.updateOne(
                    { groupId: idGrupo },
                    { 
                        $set: { 
                            isAuthorized: true, 
                            authorizedBy: msg.author || msg.from,
                            expiresAt: dataVencimento,
                            createdAt: new Date() 
                        } 
                    },
                    { upsert: true }
                );

                return msg.reply(`✅ *ESTAÇÃO AUTORIZADA*\n━━━━━━━━━━━━━━━━━━━━━\n🛰️ Status: **Online**\n🗓️ Expira em: **${dias} dias** (${dataVencimento.toLocaleDateString('pt-BR')})`);
            } 
            
            if (acao === 'teste') {
                const tempoTeste = new Date(Date.now() + 10 * 1000); // 10 segundos

                await AuthorizedGroup.updateOne(
                    { groupId: idGrupo },
                    { $set: { isAuthorized: true, expiresAt: tempoTeste } },
                    { upsert: true }
                );
                return msg.reply(`⏳ *MODO TESTE*\nGrupo liberado por **10 segundos**!`);
            }

            if (acao === 'rem') {
                await AuthorizedGroup.updateOne(
                    { groupId: idGrupo },
                    { $set: { isAuthorized: false, expiresAt: new Date(0) } }
                );
                return msg.reply(`🔴 *ESTAÇÃO BLOQUEADA*`);
            }

        } catch (err) {
            console.error("❌ Erro no comando AUTH:", err);
            return msg.reply("⚠️ Erro no banco de dados.");
        }
    }
};