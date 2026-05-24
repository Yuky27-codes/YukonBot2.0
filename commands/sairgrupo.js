module.exports = {
    name: 'sairgrupo',
    async execute(client, msg, { args, isAdmin, User }) {
        if (!isAdmin) return;

        if (msg.from.endsWith('@g.us')) {
            return client.sendMessage(msg.from, "❌ Use este comando apenas no meu *Privado*.");
        }

        const idGrupo = args[0];
        if (!idGrupo || !idGrupo.includes('@g.us')) {
            return client.sendMessage(msg.from, "⚠️ Use: `/sairgrupo [ID@g.us]`\n\nUse */grupos* para ver todos os grupos.");
        }

        try {
            const mongoose = require('mongoose');
            const AuthorizedGroup = mongoose.model('AuthorizedGroup');
            const UserProfile = mongoose.model('UserProfile');

            // 1. Remove a Yukon do grupo
            try {
                const chat = await client.getChatById(idGrupo);
                await chat.leave();
            } catch (e) {
                console.error("⚠️ Não conseguiu sair do grupo:", e.message);
            }

            // 2. Bloqueia a licença
            await AuthorizedGroup.updateOne(
                { groupId: idGrupo },
                { $set: { isAuthorized: false, expiresAt: new Date(0) } }
            );

            // 3. Limpa todos os dados dos usuários do grupo
            const totalUsers = await User.countDocuments({ groupId: idGrupo });
            await User.deleteMany({ groupId: idGrupo });

            // 4. Remove o grupo do perfil do cliente
            const dono = await UserProfile.findOne({ gruposVinculados: idGrupo });
            if (dono) {
                await UserProfile.updateOne(
                    { userId: dono.userId },
                    { $pull: { gruposVinculados: idGrupo } }
                );
            }

            return client.sendMessage(msg.from, `✅ *SAÍDA CONCLUÍDA*
━━━━━━━━━━━━━━━━━━━━━
🆔 *Grupo:* \`${idGrupo}\`
🚪 *Yukon saiu:* ✅
🔴 *Licença:* Bloqueada
🗑️ *Dados limpos:* ${totalUsers} usuário(s)
👤 *Dono:* ${dono ? `@${dono.userId.split('@')[0]}` : 'Não encontrado'}
━━━━━━━━━━━━━━━━━━━━━`);

        } catch (err) {
            console.error("❌ Erro no /sairgrupo:", err);
            return client.sendMessage(msg.from, "⚠️ Erro ao processar saída do grupo.");
        }
    }
};