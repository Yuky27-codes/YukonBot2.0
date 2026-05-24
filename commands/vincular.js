module.exports = {
    name: 'vincular',
    async execute(client, msg, { args, chatId }) {
        if (chatId.endsWith('@g.us')) return msg.reply("❌ Use este comando apenas no meu *Privado*.");

        const idGrupo = args[0];
        if (!idGrupo || !idGrupo.includes('@g.us')) {
            return msg.reply("⚠️ Use: `/vincular [ID_DO_GRUPO]`\n\n_Para pegar o ID do grupo, use */id_grupo* dentro do grupo._");
        }

        try {
            const mongoose = require('mongoose');
            const UserProfile = mongoose.model('UserProfile');
            const AuthorizedGroup = mongoose.model('AuthorizedGroup');

            let perfil = await UserProfile.findOne({ userId: msg.from });

            if (!perfil) {
                return msg.reply("⚠️ Você precisa escolher um plano primeiro!\nUse **/assinar** para ver os planos disponíveis.");
            }

            // Limite por plano
            const limite = perfil.planoPreco === 10 ? 1 : perfil.planoPreco === 30 ? 2 : 3;
            const nomePlano = perfil.planoPreco === 10 ? 'Recruta' : perfil.planoPreco === 30 ? 'Astronauta' : 'Intergaláctico';

            if (perfil.gruposVinculados.includes(idGrupo)) {
                return msg.reply("⚠️ Este grupo já está vinculado ao seu perfil.");
            }

            if (perfil.gruposVinculados.length >= limite) {
                return msg.reply(`🚫 *LIMITE ATINGIDO*\nSeu plano *${nomePlano}* permite apenas *${limite} grupo(s)*.\n\nUse */upgrade* para aumentar o limite.`);
            }

            // Adiciona o grupo ao perfil
            perfil.gruposVinculados.push(idGrupo);
            await perfil.save();

            // Verifica se já tem assinatura ativa em outro grupo
            // Se sim, replica a validade para o novo grupo automaticamente
            let msgExtra = "";
            if (perfil.gruposVinculados.length > 1) {
                // Busca a validade de um grupo já ativo
                const gruposExistentes = perfil.gruposVinculados.filter(g => g !== idGrupo);
                for (const gId of gruposExistentes) {
                    const authExistente = await AuthorizedGroup.findOne({ groupId: gId, isAuthorized: true });
                    if (authExistente && authExistente.expiresAt && new Date(authExistente.expiresAt) > new Date()) {
                        // Replica a mesma validade para o novo grupo
                        await AuthorizedGroup.updateOne(
                            { groupId: idGrupo },
                            {
                                $set: {
                                    isAuthorized: true,
                                    expiresAt: authExistente.expiresAt,
                                    authorizedBy: 'sistema'
                                }
                            },
                            { upsert: true }
                        );

                        // Notifica o novo grupo
                        try {
                            await client.sendMessage(idGrupo, `🚀 *YUKON STATION ATIVADA*\n━━━━━━━━━━━━━━━━━━━━━\n✅ Este grupo foi vinculado ao plano *${nomePlano}*!\n📅 Validade: *${new Date(authExistente.expiresAt).toLocaleDateString('pt-BR')}*\n🎮 Comandos liberados! Divirtam-se.`);
                        } catch {}

                        msgExtra = `\n\n✅ *Boa notícia!* Você já tem uma assinatura ativa. O novo grupo foi ativado automaticamente com a mesma validade: *${new Date(authExistente.expiresAt).toLocaleDateString('pt-BR')}*`;
                        break;
                    }
                }
            }

            if (!msgExtra) {
                msgExtra = "\n\n📋 *Próximo passo:* Use */pix* para gerar os dados de pagamento e ativar sua assinatura.";
            }

            return msg.reply(`✅ *GRUPO VINCULADO!*
━━━━━━━━━━━━━━━━━━━━━
📍 *ID:* \`${idGrupo}\`
📦 *Plano:* ${nomePlano}
📊 *Vagas:* ${perfil.gruposVinculados.length}/${limite}${msgExtra}`);

        } catch (err) {
            console.error("❌ Erro no /vincular:", err);
            return msg.reply("⚠️ Erro ao vincular grupo.");
        }
    }
};