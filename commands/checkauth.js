module.exports = {
    name: 'checkauth',
    async execute(client, msg, { args, isAdmin }) {
        try {
            if (!isAdmin) return;

            const ehGrupo = msg.from.endsWith('@g.us');
            if (ehGrupo) {
                return client.sendMessage(msg.from, "❌ *COMANDO RESTRITO*\nConsulte os dados da frota apenas no privado.");
            }

            if (!args[0]) {
                return client.sendMessage(msg.from, "⚠️ *FORMATO INVÁLIDO*\nUse: `/checkauth [ID]`.");
            }

            // Limpa o ID extraindo apenas os números e hifens (suporta IDs antigos e de comunidades)
            const matchId = args[0].match(/[\d\-]+/);
            if (!matchId) {
                 return client.sendMessage(msg.from, "⚠️ *ID INVÁLIDO*\nNão consegui reconhecer o formato numérico do grupo.");
            }

            // Garante que a formatação padrão termine com @g.us
            const idGrupo = matchId[0] + '@g.us';

            const mongoose = require('mongoose');
            const AuthorizedGroup = mongoose.models.AuthorizedGroup || mongoose.model('AuthorizedGroup');

            const groupAuth = await AuthorizedGroup.findOne({ groupId: idGrupo }).lean();

            // Se não existir na coleção, ele é um grupo "Não Registrado" (ainda não ativaram plano nele)
            if (!groupAuth) {
                return client.sendMessage(msg.from, `🖥️ *PAINEL YUKON*
━━━━━━━━━━━━━━━━━━━━━
🆔 *Grupo:* \`${idGrupo}\`
📡 *Status:* ⚪ Não Registrado
🗓️ *Vencimento:* Sem registro
⏳ *Restante:* Nunca ativado
👤 *Dono da Licença:* Nenhum

⚠️ *Aviso:* Este grupo nunca recebeu uma licença na base de dados. O acesso aos comandos encontra-se interceptado pela Barreira Mestra.`);
            }

            // Se o grupo foi encontrado, calcula o tempo restante
            const expiraMs = groupAuth.expiresAt ? new Date(groupAuth.expiresAt).getTime() : 0;
            const agoraMs = Date.now();
            const restanteMs = expiraMs - agoraMs;

            let statusEmoji = "⚪";
            let statusTexto = "Desconhecido";

            if (!groupAuth.isAuthorized) {
                statusEmoji = "🔴"; statusTexto = "Bloqueado";
            } else if (expiraMs > 0 && restanteMs <= 0) {
                statusEmoji = "🔴"; statusTexto = "Expirado";
            } else if (expiraMs > 0 && restanteMs < 3 * 24 * 60 * 60 * 1000) {
                statusEmoji = "🟡"; statusTexto = "Expirando em breve";
            } else {
                statusEmoji = "🟢"; statusTexto = "Ativo";
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

            return client.sendMessage(msg.from, `🖥️ *PAINEL YUKON*
━━━━━━━━━━━━━━━━━━━━━
🆔 *Grupo:* \`${idGrupo}\`
📡 *Status:* ${statusEmoji} ${statusTexto}
🗓️ *Vencimento:* ${expiraMs > 0 ? new Date(expiraMs).toLocaleString('pt-BR') : 'Sem data'}
⏳ *Restante:* ${tempoRestante}
👤 *Dono da Licença:* @${(groupAuth.authorizedBy || "Sistema").split('@')[0]}`);

        } catch (err) {
            console.error("❌ ERRO CHECKAUTH:", err.message, err.stack);
            try {
                await client.sendMessage(msg.from, `⚠️ Erro: ${err.message}`);
            } catch {}
        }
    }
};