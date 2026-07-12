module.exports = {
  name: 'código',
  async execute(client, msg, { chatId, senderId }) {
    try {
      // ✅ Liberado para todos — necessário para vincular grupos ao SaaS
      // A barreira de licença do index.js é ignorada para este comando

      // Verificar se é um grupo (não PV)
      if (!chatId.includes('@g.us')) {
        return msg.reply(`❌ Este comando só pode ser usado em grupos.`);
      }

      // Verificar se o usuário é admin do grupo
      const groupMetadata = await msg.groupMetadata?.();
      if (!groupMetadata) {
        return msg.reply(`❌ Não foi possível obter informações do grupo.`);
      }

      const isAdmin = groupMetadata.participants?.find(p => p.id === senderId)?.admin;
      if (!isAdmin) {
        return msg.reply(`❌ Apenas administradores do grupo podem gerar códigos de vinculação.`);
      }

      // Gerar código único (6 caracteres alfanuméricos)
      const generateCode = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
      };

      const code = generateCode();

      // Buscar informações do grupo no banco Yukon
      // Aqui você precisa adaptar para buscar no seu banco de dados
      // Exemplo usando MongoDB:
      /*
      const groupInfo = await db.collection('authorizedgroups').findOne({ 
        groupId: chatId 
      });
      
      if (!groupInfo) {
        return msg.reply(`❌ Grupo não encontrado no sistema Yukon.`);
      }
      */

      // Mock das informações do grupo (substituir com busca real no banco)
      const groupInfo = {
        groupId: chatId,
        groupName: groupMetadata.subject || 'Grupo sem nome',
        memberCount: groupMetadata.participants?.length || 0,
        platform: 'whatsapp',
      };

      // Calcular expiração (1 hora)
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      // Salvar código no banco SaaS (via API)
      const saasResponse = await fetch('http://localhost:4000/api/v1/community-links/group-codes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          groupId: groupInfo.groupId,
          groupName: groupInfo.groupName,
          memberCount: groupInfo.memberCount,
          platform: groupInfo.platform,
          createdBy: senderId,
          expiresAt: expiresAt.toISOString(),
        }),
      });

      if (!saasResponse.ok) {
        const errorData = await saasResponse.json();
        console.error('[código] SaaS API Error:', errorData);
        return msg.reply(`❌ Erro ao salvar código no sistema SaaS.`);
      }

      // Enviar código no PV do dono/admin
      const pvMessage = `🔗 *CÓDIGO DE VINCULAÇÃO*\n\n` +
        `📋 *Código:* \`${code}\`\n` +
        `📝 *Grupo:* ${groupInfo.groupName}\n` +
        `👥 *Membros:* ${groupInfo.memberCount}\n` +
        `⏰ *Expira em:* 1 hora\n\n` +
        `📌 *Como usar:*\n` +
        `1. Acesse o painel SaaS\n` +
        `2. Vá para a tela de vincular grupos\n` +
        `3. Cole este código no campo indicado\n` +
        `4. Clique em "Verificar Grupos"\n\n` +
        `_Este código é pessoal e intransferível._`;

      await client.sendMessage(senderId + '@s.whatsapp.net', { text: pvMessage });

      // Confirmação no grupo
      return msg.reply(`✅ *Código gerado com sucesso!*\n\n` +
        `📋 O código foi enviado no seu PV (privado).\n` +
        `⏰ O código expira em 1 hora.\n` +
        `🔒 Mantenha-o seguro!`);

    } catch (error) {
      console.error('[código] Error:', error);
      return msg.reply(`❌ Erro ao gerar código. Tente novamente.`);
    }
  }
};
