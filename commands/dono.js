module.exports = {
    name: 'dono',
    async execute(client, msg, { args, isAdmin }) {
        // SEGURANÇA: Apenas você pode usar e apenas no PV
        if (!isAdmin || msg.from.endsWith('@g.us')) return;

        try {
            const [alvoDono, alvoGrupo] = args;

            if (!alvoDono || !alvoGrupo) {
                return client.sendMessage(msg.from, "⚠️ *USO:* `/dono [ID_do_dono] [ID_do_grupo]`\n\n_Aceita ID completo (ex: 259558513623213@lid) ou só o número (ex: 5521999999999)._\n_Exemplo: /dono 259558513623213@lid 120363425078149377@g.us_");
            }

            const mongoose = require('mongoose');
            const AuthorizedGroup = mongoose.models.AuthorizedGroup || mongoose.model('AuthorizedGroup');
            const User = mongoose.models.User || mongoose.model('User');

            // Normaliza o ID do grupo (aceita @g.us ou só o número com hífen)
            const grupoMatch = alvoGrupo.match(/[\d\-]+/);
            const grupoId = grupoMatch ? grupoMatch[0] + '@g.us' : alvoGrupo;

            // Aceita os dois formatos de entrada:
            // 1) ID completo (ex: 259558513623213@lid ou 5521999999999@c.us) - usa direto,
            //    do jeito que você já usava antes.
            // 2) Só o número puro (ex: 5521999999999) - nesse caso não dá pra saber se o
            //    contato usa '@c.us' ou '@lid', então resolve perguntando pro WhatsApp
            //    via client.getNumberId(), que sempre acerta o formato certo.
            let donoId;
            if (alvoDono.includes('@')) {
              donoId = alvoDono;
            } else {
              const numeroLimpo = alvoDono.replace(/\D/g, '');
              const numberInfo = await client.getNumberId(numeroLimpo);

              if (!numberInfo) {
                return client.sendMessage(msg.from, `⚠️ *ERRO:* O número \`${numeroLimpo}\` não foi encontrado no WhatsApp. Confira se está no formato correto (com DDI, ex: 5521999999999) ou passe o ID completo direto (ex: 259558513623213@lid).`);
              }

              donoId = numberInfo._serialized;
            }

            // 1. Atualiza o Dono no AuthorizedGroup
            const authUpdate = await AuthorizedGroup.findOneAndUpdate(
                { groupId: grupoId },
                { $set: { authorizedBy: donoId } },
                { new: true }
            );

            if (!authUpdate) {
                return client.sendMessage(msg.from, `⚠️ *ERRO:* O grupo \`${grupoId}\` não foi encontrado na base de licenças.`);
            }

            // 2. Atualiza a permissão de Admin no User
            await User.updateOne(
                { userId: donoId, groupId: grupoId },
                { $set: { isBotAdmin: true } },
                { upsert: true }
            );

            await client.sendMessage(msg.from, `✅ *Dono Atualizado com Sucesso!*
━━━━━━━━━━━━━━━━━━━━━
🆔 *Grupo:* \`${grupoId}\`
👤 *Novo Dono:* @${donoId.split('@')[0]}
🔑 *Permissão:* BotAdmin atribuída.`, { mentions: [donoId] });

        } catch (err) {
            console.error("❌ ERRO NO /dono:", err.message, '\n', err.stack);
            await client.sendMessage(msg.from, "⚠️ Erro ao atualizar o dono.");
        }
    }
};