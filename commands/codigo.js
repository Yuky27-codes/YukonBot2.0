module.exports = {
  name: 'código',
  async execute(client, msg, { chatId, senderRaw, isAdmin, isGroupAdmins }) {
    try {
      const mongoose = require('mongoose');
      const LinkCode = mongoose.model('LinkCode');
      const AuthorizedGroup = mongoose.model('AuthorizedGroup');

      const chat = await msg.getChat();

      // Verificar se é um grupo
      if (!chat.isGroup) {
        return msg.reply(`❌ Este comando só pode ser usado em grupos.`);
      }

      // Verificar se o usuário é admin (bot admin OU admin do grupo)
      if (!isAdmin && !isGroupAdmins) {
        return msg.reply(`❌ Apenas administradores do grupo podem gerar códigos de vinculação.`);
      }

      const groupName = chat.name || 'Grupo sem nome';
      const memberCount = chat.participants?.length || 0;

      // Consulta o mesmo status usado pela barreira de licença do index.js
      const groupAuth = await AuthorizedGroup.findOne({ groupId: chatId }).lean();
      const subscriptionExpiresAt = groupAuth?.expiresAt || null;
      const hasActiveSubscription = Boolean(
        groupAuth?.isAuthorized &&
        (!subscriptionExpiresAt || new Date(subscriptionExpiresAt).getTime() > Date.now())
      );
      // eslint-disable-next-line no-console
      console.log('[código] groupAuth:', groupAuth, '| hasActiveSubscription calculado:', hasActiveSubscription);

      // Se já existe um código válido (não expirado) pra esse grupo, reaproveita
      let linkCode = await LinkCode.findOne({
        groupId: chatId,
        expiresAt: { $gt: new Date() },
      });

      if (linkCode) {
        // Atualiza dados do grupo e status de assinatura (podem ter mudado) sem trocar o código
        linkCode.groupName = groupName;
        linkCode.memberCount = memberCount;
        linkCode.hasActiveSubscription = hasActiveSubscription;
        linkCode.subscriptionExpiresAt = subscriptionExpiresAt;
        await linkCode.save();
      } else {
        // Gerar código único (6 caracteres alfanuméricos)
        const generateCode = () => {
          const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
          let code = '';
          for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
          }
          return code;
        };

        let code = generateCode();
        while (await LinkCode.findOne({ code })) {
          code = generateCode();
        }

        linkCode = await LinkCode.create({
          code,
          groupId: chatId,
          groupName,
          memberCount,
          platform: 'whatsapp',
          createdBy: senderRaw,
          hasActiveSubscription,
          subscriptionExpiresAt,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hora
        });
      }

      const minutosRestantes = Math.max(1, Math.round((linkCode.expiresAt.getTime() - Date.now()) / 60000));

      // Enviar código no PV do dono/admin
      const pvMessage = `🔗 *CÓDIGO DE VINCULAÇÃO*\n\n` +
        `📋 *Código:* \`${linkCode.code}\`\n` +
        `📝 *Grupo:* ${groupName}\n` +
        `👥 *Membros:* ${memberCount}\n` +
        `⏰ *Expira em:* ${minutosRestantes} min\n\n` +
        `📌 *Como usar:*\n` +
        `1. Acesse o painel SaaS\n` +
        `2. Vá para a tela de vincular grupos\n` +
        `3. Cole este código no campo indicado\n` +
        `4. Clique em "Verificar Grupos"\n\n` +
        `_Este código é pessoal e intransferível._`;

      await client.sendMessage(senderRaw, pvMessage);

      return msg.reply(`✅ *Código gerado com sucesso!*\n\n` +
        `📋 O código foi enviado no seu PV (privado).\n` +
        `⏰ Válido por ${minutosRestantes} min.\n` +
        `🔒 Mantenha-o seguro!`);

    } catch (error) {
      console.error('[código] Error:', error);
      return msg.reply(`❌ Erro ao gerar código. Tente novamente.`);
    }
  }
};