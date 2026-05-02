module.exports = {
    name: 'confirmar',
    async execute(client, msg, { args, isAdmin }) {
        if (!isAdmin) return; // Acesso restrito ao Comandante Yukon

        const idGrupo = args[0];
        const modo = args[1]; // Detecta se foi passado "migrar"

        if (!idGrupo || !idGrupo.includes('@g.us')) {
            return msg.reply("⚠️ Use: `/confirmar ID@g.us [migrar]`");
        }

        try {
            const mongoose = require('mongoose');
            const AuthorizedGroup = mongoose.model('AuthorizedGroup');
            const UserProfile = mongoose.model('UserProfile');

            // 1. Busca informações prévias para o caso de migração
            const infoGrupo = await AuthorizedGroup.findOne({ groupId: idGrupo });
            const dono = await UserProfile.findOne({ gruposVinculados: idGrupo });

            let novaData;
            let tituloMsg = "";

            // 2. Lógica de Data: Migração ou Nova Ativação
            if (modo === 'migrar' && infoGrupo) {
                novaData = infoGrupo.expiresAt;
                tituloMsg = "🔄 *MIGRAÇÃO DE SISTEMA CONCLUÍDA*";
            } else {
                novaData = new Date();
                novaData.setDate(novaData.getDate() + 30);
                tituloMsg = "✅ *ASSINATURA ATIVADA COM SUCESSO*";
            }

            // 3. Atualiza ou cria a autorização no banco de dados
            await AuthorizedGroup.updateOne(
                { groupId: idGrupo },
                { $set: { isAuthorized: true, expiresAt: novaData } },
                { upsert: true }
            );

            const textoNotificacao = `${tituloMsg}
━━━━━━━━━━━━━━━━━━━━━━
O grupo foi atualizado com sucesso para o novo sistema de assinatura por perfil!

📍 **Grupo:** \`${idGrupo}\`
📅 **Vencimento:** ${novaData.toLocaleDateString('pt-BR')}
🚀 **Status:** Licença Ativa e Atualizada`;

            // 4. Mensagem de Confirmação para VOCÊ (Dono do Bot)
            await msg.reply(`✅ Operação finalizada para o grupo \`${idGrupo}\` (${modo === 'migrar' ? 'Migração' : 'Nova Ativação'}).`);

            // 5. Mensagem para o GRUPO (Notificação Tripla - Parte 1)
            await client.sendMessage(idGrupo, textoNotificacao);

            // 6. Mensagem para o DONO/CLIENTE (Notificação Tripla - Parte 2)
            if (dono) {
                await client.sendMessage(dono.userId, textoNotificacao + "\n\n_A Yukon Station agradece sua preferência!_");
            }

        } catch (err) {
            console.error("ERRO NO CONFIRMAR:", err);
            return msg.reply("⚠️ Erro ao processar a confirmação de assinatura.");
        }
    }
};