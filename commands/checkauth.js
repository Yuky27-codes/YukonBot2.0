module.exports = {
    name: 'checkauth',
    async execute(client, msg, { args, isAdmin }) {
        // 1. Bloqueio de segurança: Apenas VOCÊ (Dono)
        if (!isAdmin) return; 

        // 2. Trava de Privacidade: Apenas no seu PV com o bot
        const chat = await msg.getChat();
        if (chat.isGroup) {
            return msg.reply("❌ *COMANDO RESTRITO*\nPor segurança, consulte os dados da frota apenas no privado.");
        }

        const idGrupo = args[0];

        // 3. Validação do ID
        if (!idGrupo || !idGrupo.includes('@g.us')) {
            return msg.reply("⚠️ *ID INVÁLIDO*\n\nUse: `/checkauth [ID]@g.us`\n\n_Dica: Você pode pegar o ID no comando /grupos._");
        }

        try {
            const mongoose = require('mongoose');
            const AuthorizedGroup = mongoose.model('AuthorizedGroup');

            // Busca o registro no banco
            const groupAuth = await AuthorizedGroup.findOne({ groupId: idGrupo }).lean();

            if (!groupAuth) {
                return msg.reply(`⚠️ *ESTAÇÃO NÃO REGISTRADA*\n\nO grupo \`${idGrupo}\` nunca foi cadastrado no sistema Yukon.`);
            }

            const expiraMs = groupAuth.expiresAt ? new Date(groupAuth.expiresAt).getTime() : 0;
            const agoraMs = Date.now();
            const restanteMs = expiraMs - agoraMs;

            // Lógica de Status
            let statusEmoji = groupAuth.isAuthorized ? "✅" : "❌";
            let statusTexto = groupAuth.isAuthorized ? "ATIVO" : "INATIVO / BLOQUEADO";

            if (groupAuth.isAuthorized && expiraMs > 0 && agoraMs > expiraMs) {
                statusEmoji = "⏰";
                statusTexto = "EXPIRADO (Aguardando limpeza)";
            }

            // Formatação de tempo restante (se houver)
            let tempoRestante = "Sem validade definida.";
            if (expiraMs > 0 && restanteMs > 0) {
                const dias = Math.floor(restanteMs / (1000 * 60 * 60 * 24));
                const horas = Math.floor((restanteMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                tempoRestante = `${dias}d ${horas}h ${minutos}min`;
            } else if (restanteMs <= 0 && expiraMs > 0) {
                tempoRestante = "Tempo esgotado.";
            }

            return msg.reply(`🖥️ *CENTRAL DE CONTROLE YUKON*
━━━━━━━━━━━━━━━━━━━━━
🆔 **Grupo:** \`${idGrupo}\`
📡 **Status:** ${statusEmoji} ${statusTexto}
👤 **Autorizado por:** @${(groupAuth.authorizedBy || "Sistema").split('@')[0]}

🗓️ **Vencimento:** ${expiraMs > 0 ? new Date(expiraMs).toLocaleString('pt-BR') : 'N/A'}
⏳ **Tempo Restante:** ${tempoRestante}
✨ **Registrado em:** ${groupAuth.createdAt ? new Date(groupAuth.createdAt).toLocaleDateString('pt-BR') : 'N/A'}

_Use /auth add ou /auth rem para alterar este status._`, {
                mentions: [groupAuth.authorizedBy]
            });

        } catch (err) {
            console.error("❌ Erro no comando checkauth:", err);
            return msg.reply("⚠️ Falha técnica ao acessar a base de dados.");
        }
    }
};