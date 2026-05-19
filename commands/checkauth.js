module.exports = {
    name: 'checkauth',
    async execute(client, msg, { args, isAdmin }) {
        if (!isAdmin) return;

        const chat = await msg.getChat();
        if (chat.isGroup) {
            return msg.reply("❌ *COMANDO RESTRITO*\nConsulte os dados da frota apenas no privado.");
        }

        const idGrupo = args[0];
        if (!idGrupo || !idGrupo.includes('@g.us')) {
            return msg.reply("⚠️ *ID INVÁLIDO*\nUse: `/checkauth [ID]@g.us`.");
        }

        try {
            const mongoose = require('mongoose');
            const AuthorizedGroup = mongoose.models.AuthorizedGroup || mongoose.model('AuthorizedGroup');

            const groupAuth = await AuthorizedGroup.findOne({ groupId: idGrupo }).lean();

            if (!groupAuth) {
                return msg.reply(`⚠️ *NÃO ENCONTRADO*\nO grupo \`${idGrupo}\` não existe no banco.`);
            }

            const expiraMs = groupAuth.expiresAt ? new Date(groupAuth.expiresAt).getTime() : 0;
            const agoraMs = Date.now();
            const restanteMs = expiraMs - agoraMs;

            // ✅ CORRIGIDO: statusEmoji e statusTexto agora declaradas antes do uso
            let statusEmoji = "⚪";
            let statusTexto = "Desconhecido";

            if (!groupAuth.isAuthorized) {
                statusEmoji = "🔴";
                statusTexto = "Bloqueado";
            } else if (expiraMs > 0 && restanteMs <= 0) {
                statusEmoji = "🔴";
                statusTexto = "Expirado";
            } else if (expiraMs > 0 && restanteMs < 3 * 24 * 60 * 60 * 1000) {
                statusEmoji = "🟡";
                statusTexto = "Expirando em breve";
            } else {
                statusEmoji = "🟢";
                statusTexto = "Ativo";
            }

            let tempoRestante = "Sem validade definida.";

            if (expiraMs > 0 && restanteMs > 0) {
                const dias = Math.floor(restanteMs / (1000 * 60 * 60 * 24));
                const horas = Math.floor((restanteMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutos = Math.floor((restanteMs % (1000 * 60 * 60)) / (1000 * 60));
                tempoRestante = `${dias}d ${horas}h ${minutos}m`;
            } else if (expiraMs > 0 && restanteMs <= 0) {
                tempoRestante = "🔴 Tempo esgotado.";
            }

            return msg.reply(`🖥️ *PAINEL YUKON*
━━━━━━━━━━━━━━━━━━━━━
🆔 *Grupo:* \`${idGrupo}\`
📡 *Status:* ${statusEmoji} ${statusTexto}
🗓️ *Vencimento:* ${expiraMs > 0 ? new Date(expiraMs).toLocaleString('pt-BR') : 'Sem data'}
⏳ *Restante:* ${tempoRestante}
👤 *Dono da Licença:* @${(groupAuth.authorizedBy || "Sistema").split('@')[0]}`, {
                mentions: groupAuth.authorizedBy ? [groupAuth.authorizedBy] : []
            });

        } catch (err) {
            console.error("❌ ERRO NO CHECKAUTH:", err);
            return msg.reply("⚠️ Erro interno. Verifique se o banco de dados está conectado.");
        }
    }
};