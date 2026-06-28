module.exports = {
    name: 'dono',
    async execute(client, msg, { args, isAdmin }) {
        // SEGURANÇA: Apenas você pode usar e apenas no PV
        if (!isAdmin || msg.from.endsWith('@g.us')) return;

        try {
            const [alvoDono, alvoGrupo] = args;

            if (!alvoDono || !alvoGrupo) {
                return client.sendMessage(msg.from, "⚠️ *USO:* `/dono [número@c.us] [ID_GRUPO@g.us]`\n\n_Exemplo: /dono 5521999999999@c.us 120363406518324752@g.us_");
            }

            const mongoose = require('mongoose');
            const AuthorizedGroup = mongoose.models.AuthorizedGroup || mongoose.model('AuthorizedGroup');
            const User = mongoose.models.User || mongoose.model('User');

            // Normaliza os IDs para evitar erros de @g.us ou @c.us
            const donoId = alvoDono.replace(/\D/g, '') + '@c.us';
            const grupoMatch = alvoGrupo.match(/[\d\-]+/);
            const grupoId = grupoMatch ? grupoMatch[0] + '@g.us' : alvoGrupo;

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
            console.error("❌ ERRO NO /dono:", err.message);
            await client.sendMessage(msg.from, "⚠️ Erro ao atualizar o dono.");
        }
    }
};