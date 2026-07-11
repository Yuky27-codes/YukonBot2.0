module.exports = {
    name: 'registrar',
    async execute(client, msg, { UserProfile }) {
        // SEGURANÇA: Só funciona em grupos
        if (!msg.from.endsWith('@g.us')) {
            return client.sendMessage(msg.from, "❌ Este comando deve ser usado dentro do grupo que deseja registrar.");
        }

        try {
            const mongoose = require('mongoose');
            const AuthorizedGroup = mongoose.models.AuthorizedGroup || mongoose.model('AuthorizedGroup');
            const UserProfile = mongoose.models.UserProfile || mongoose.model('UserProfile');

            const grupoId = msg.from; // ID já vem formatado como @g.us pelo WhatsApp
            const donoId = msg.author || msg.from; // Tenta pegar o ID do autor (dono do grupo)

            // 1. Verifica se o grupo já não está registrado
            const jaExiste = await AuthorizedGroup.findOne({ groupId: grupoId });
            if (jaExiste) {
                return client.sendMessage(msg.from, "⚠️ Este grupo já está registrado na base de dados da Yukon Station.");
            }

            // 2. Busca o perfil do cliente para vincular automaticamente
            const perfil = await UserProfile.findOne({ userId: donoId });
            if (!perfil) {
                return client.sendMessage(msg.from, "❌ *ERRO:* Seu número não está cadastrado como cliente oficial. Entre em contato com o suporte.");
            }

            // 3. Cria o registro inicial do grupo
            await AuthorizedGroup.create({
                groupId: grupoId,
                isAuthorized: false, // Começa bloqueado até você confirmar o pagamento
                expiresAt: new Date(0),
                authorizedBy: donoId
            });

            // 4. Vincula ao perfil do dono
            await UserProfile.updateOne(
                { userId: donoId },
                { $addToSet: { gruposVinculados: grupoId } }
            );

            // 5. Notificação de Sucesso
            await client.sendMessage(msg.from, `✅ *REGISTRO SOLICITADO COM SUCESSO!*
━━━━━━━━━━━━━━━━━━━━━
🆔 *ID do Grupo:* \`${grupoId}\`
👤 *Vinculado ao Cliente:* @${donoId.split('@')[0]}

⚠️ *Aviso:* O registro foi enviado para análise. Aguarde a confirmação de pagamento para que o acesso seja liberado pela administração.`, { mentions: [donoId] });

            // 6. Alerta o seu PV (Avisando que chegou uma solicitação nova)
            // (Coloque aqui o seu ID de Administrador)
            await client.sendMessage("SEU_NUMERO_AQUI@c.us", `🚨 *Nova Solicitação de Registro:*
Grupo: ${grupoId}
Dono: @${donoId.split('@')[0]}`);

        } catch (err) {
            console.error("❌ ERRO NO /registrar:", err);
            await client.sendMessage(msg.from, "⚠️ Erro ao processar o registro.");
        }
    }
};