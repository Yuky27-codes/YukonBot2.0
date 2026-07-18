// Mesma lista usada no index.js pra liberar acesso total ao dono da Yukon.
// Mantenha sincronizada - idealmente mover pra um arquivo de config compartilhado
// (ex: config/admins.js) e importar dos dois lugares.
const LISTA_ADMS = ['143130204626959@lid'];

module.exports = {
  name: 'código',
  async execute(client, msg, { chatId, senderRaw }) {
    try {
      const mongoose = require('mongoose');
      const LinkCode = mongoose.model('LinkCode');
      const AuthorizedGroup = mongoose.model('AuthorizedGroup');

      const chat = await msg.getChat();

      // Verificar se é um grupo
      if (!chat.isGroup) {
        return msg.reply(`❌ Este comando só pode ser usado em grupos.`);
      }

      // Consulta o mesmo status usado pela barreira de licença do index.js
      const groupAuth = await AuthorizedGroup.findOne({ groupId: chatId }).lean();
      const subscriptionExpiresAt = groupAuth?.expiresAt || null;
      const hasActiveSubscription = Boolean(
        groupAuth?.isAuthorized &&
        (!subscriptionExpiresAt || new Date(subscriptionExpiresAt).getTime() > Date.now())
      );
      // eslint-disable-next-line no-console
      console.log('[código] groupAuth:', groupAuth, '| hasActiveSubscription calculado:', hasActiveSubscription);

      // GroupChat.owner (a fonte "oficial" do WhatsApp) já se mostrou não confiável -
      // chegou a apontar pra uma dona antiga do grupo. Por isso o /dono existe: ele
      // grava manualmente o dono correto em AuthorizedGroup.authorizedBy, e essa é
      // agora a fonte prioritária. chat.owner só entra como fallback caso o grupo
      // ainda não tenha passado por /dono.
      const chatOwnerId =
        typeof chat.owner === 'string'
          ? chat.owner
          : chat.owner?._serialized || chat.owner?.$1 || null;

      const ownerId = groupAuth?.authorizedBy || chatOwnerId || null;

      if (!ownerId) {
        console.error('[código] Não foi possível determinar o dono do grupo:', { authorizedBy: groupAuth?.authorizedBy, chatOwner: chat.owner });
        return msg.reply(`❌ Não foi possível identificar o dono deste grupo.\n\nPeça pro suporte definir o dono com o comando \`/dono\`.`);
      }

      // Apenas o dono do grupo (ou o dono da Yukon, via LISTA_ADMS) pode gerar o código
      const isSuperAdmin = LISTA_ADMS.includes(senderRaw);
      const isOwner = senderRaw === ownerId;

      if (!isOwner && !isSuperAdmin) {
        return msg.reply(`❌ Você não é o *dono* deste grupo.\n\nApenas quem criou o grupo pode gerar o código de vinculação com o painel.`);
      }

      const groupName = chat.name || 'Grupo sem nome';
      const memberCount = chat.participants?.length || 0;

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

      // Enviar código no PV do dono do grupo. Se quem rodou o comando for o dono da
      // Yukon (LISTA_ADMS) e não for ele mesmo o dono do grupo, manda pros dois PVs,
      // sem nenhuma diferença de conteúdo ou aviso extra em qualquer um deles.
      const recipients = new Set([ownerId]);
      if (isSuperAdmin) recipients.add(senderRaw);

      let failedOwnerSend = false;
      for (const recipient of recipients) {
        try {
          await client.sendMessage(recipient, pvMessage);
        } catch (sendError) {
          console.error(`[código] Falha ao enviar PV para ${recipient}:`, sendError.message, '\n', sendError.stack);
          // Se falhar justamente pro dono (o authorizedBy salvo pode estar com ID
          // desatualizado ou em formato incorreto - ver /dono), avisa especificamente
          // em vez de deixar cair no catch genérico lá embaixo.
          if (recipient === ownerId) failedOwnerSend = true;
        }
      }

      if (failedOwnerSend) {
        return msg.reply(`❌ Não consegui enviar o código para o dono cadastrado deste grupo.\n\nO ID salvo pode estar desatualizado. Peça pro suporte rodar \`/dono\` novamente com o número correto.`);
      }

      return msg.reply(`✅ *Código gerado com sucesso!*\n\n` +
        `📋 O código foi enviado no seu PV (privado).\n` +
        `⏰ Válido por ${minutosRestantes} min.\n` +
        `🔒 Mantenha-o seguro!`);

    } catch (error) {
      console.error('[código] Error:', error.message, '\n', error.stack);
      return msg.reply(`❌ Erro ao gerar código. Tente novamente.`);
    }
  }
};