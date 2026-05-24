module.exports = {
    name: 'desvincular',
    async execute(client, msg, { args, chatId }) {
        if (chatId.endsWith('@g.us')) return msg.reply("❌ Use este comando apenas no meu *Privado*.");

        const idGrupo = args[0];
        if (!idGrupo || !idGrupo.includes('@g.us')) {
            return msg.reply("⚠️ Use: `/desvincular [ID_DO_GRUPO]`\n\n_Para ver seus grupos vinculados use */meu_plano*._");
        }

        try {
            const mongoose = require('mongoose');
            const UserProfile = mongoose.model('UserProfile');
            const AuthorizedGroup = mongoose.model('AuthorizedGroup');

            const perfil = await UserProfile.findOne({ userId: msg.from });

            if (!perfil || perfil.gruposVinculados.length === 0) {
                return msg.reply("❌ Você não tem grupos vinculados.");
            }

            if (!perfil.gruposVinculados.includes(idGrupo)) {
                return msg.reply("⚠️ Este grupo não está vinculado ao seu perfil.");
            }

            // Remove do perfil do cliente
            await UserProfile.updateOne(
                { userId: msg.from },
                { $pull: { gruposVinculados: idGrupo } }
            );

            // Bloqueia o acesso imediatamente
            await AuthorizedGroup.updateOne(
                { groupId: idGrupo },
                { $set: { isAuthorized: false, expiresAt: new Date(0) } }
            );

            // Notifica o grupo
            try {
                await client.sendMessage(idGrupo, `🔴 *ESTAÇÃO DESATIVADA*
━━━━━━━━━━━━━━━━━━━━━
Este grupo foi desvinculado do plano Yukon.
Os comandos foram desativados imediatamente.

_Para reativar, use */assinar* no PV do bot._`);
            } catch {}

            const nomePlano = perfil.planoPreco === 10 ? 'Recruta' : perfil.planoPreco === 30 ? 'Astronauta' : 'Intergaláctico';
            const restantes = perfil.gruposVinculados.filter(g => g !== idGrupo).length;
            const limite = perfil.planoPreco === 10 ? 1 : perfil.planoPreco === 30 ? 2 : 3;

            return msg.reply(`✅ *GRUPO DESVINCULADO*
━━━━━━━━━━━━━━━━━━━━━
📍 *ID:* \`${idGrupo}\`
❌ *Acesso:* Removido imediatamente
📦 *Plano:* ${nomePlano}
📊 *Grupos restantes:* ${restantes}/${limite}
━━━━━━━━━━━━━━━━━━━━━
_Use */meu_plano* para ver seus grupos ativos._`);

        } catch (err) {
            console.error("❌ Erro no /desvincular:", err);
            return msg.reply("⚠️ Erro ao desvincular grupo.");
        }
    }
};