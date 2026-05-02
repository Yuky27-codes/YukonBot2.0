module.exports = {
    name: 'confirmar',
    async execute(client, msg, { args, isAdmin }) {
        if (!isAdmin) return; // Só você pode rodar

        const idGrupo = args[0];
        if (!idGrupo || !idGrupo.includes('@g.us')) {
            return msg.reply("⚠️ Use: `/confirmar ID@g.us`");
        }

        try {
            // 1. Executa a lógica de autorização (30 dias padrão ou conforme o plano)
            const mongoose = require('mongoose');
            const AuthorizedGroup = mongoose.model('AuthorizedGroup');
            const UserProfile = mongoose.model('UserProfile');

            const dataVencimento = new Date();
            dataVencimento.setDate(dataVencimento.getDate() + 30);

            await AuthorizedGroup.updateOne(
                { groupId: idGrupo },
                { $set: { isAuthorized: true, expiresAt: dataVencimento } },
                { upsert: true }
            );

            // 2. Localiza quem é o dono desse grupo para avisar no PV
            const dono = await UserProfile.findOne({ gruposVinculados: idGrupo });

            // 3. Mensagem de Confirmação para VOCÊ
            await msg.reply(`✅ Grupo \`${idGrupo}\` ativado com sucesso!`);

            // 4. Mensagem para o GRUPO
            await client.sendMessage(idGrupo, `🚀 *SISTEMA ATUALIZADO*
━━━━━━━━━━━━━━━━━━━━━
🛰️ Status: **Assinatura Ativada**
📅 Expira em: ${dataVencimento.toLocaleDateString('pt-BR')}
🎮 Comandos liberados! Divirtam-se.`);

            // 5. Mensagem para o DONO (Cliente)
            if (dono) {
                await client.sendMessage(dono.userId, `✅ *PAGAMENTO APROVADO*
━━━━━━━━━━━━━━━━━━━━━
Seu grupo \`${idGrupo}\` foi ativado com sucesso!
Obrigado por assinar a Yukon Station. 🚀`);
            }

        } catch (err) {
            console.error(err);
            return msg.reply("⚠️ Erro ao confirmar ativação.");
        }
    }
};