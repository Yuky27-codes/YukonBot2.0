module.exports = {
    name: 'assinatura',
    async execute(client, msg, { chatId, isGroupAdmins, isAdmin }) {
        // 1. Só permite em grupos
        if (!chatId.endsWith('@g.us')) {
            return msg.reply("❌ Este comando só pode ser usado dentro de um grupo.");
        }

        // 2. Só permite que ADMs do grupo ou Você (Dono do bot) vejam
        if (!isGroupAdmins && !isAdmin) {
            return msg.reply("⚠️ Apenas oficiais (ADMs) podem consultar o status da estação.");
        }

        try {
            const mongoose = require('mongoose');
            const AuthorizedGroup = mongoose.model('AuthorizedGroup');

            // Busca os dados do grupo atual
            const groupAuth = await AuthorizedGroup.findOne({ groupId: chatId }).lean();

            if (!groupAuth || !groupAuth.expiresAt) {
                return msg.reply("❌ *ERRO DE SISTEMA*\n\nNão encontrei registros de validade para este setor.");
            }

            const expiraMs = new Date(groupAuth.expiresAt).getTime();
            const agoraMs = Date.now();
            const restanteMs = expiraMs - agoraMs;

            // Cálculo de tempo restante
            const dias = Math.floor(restanteMs / (1000 * 60 * 60 * 24));
            const horas = Math.floor((restanteMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutos = Math.floor((restanteMs % (1000 * 60 * 60)) / (1000 * 60));

            let statusTexto = "";
            if (restanteMs <= 0) {
                statusTexto = "🔴 *EXPIRADA*";
            } else if (dias < 3) {
                statusTexto = "🟡 *PERIGO DE QUEDA* (Vence em breve)";
            } else {
                statusTexto = "🟢 *ESTÁVEL*";
            }

            return msg.reply(`🛰️ *STATUS DA ESTAÇÃO YUKON*
━━━━━━━━━━━━━━━━━━━━━
📊 Status: ${statusTexto}
🗓️ Vencimento: *${new Date(expiraMs).toLocaleString('pt-BR')}*

⏳ **Tempo Restante:**
${dias}d ${horas}h ${minutos}min

_Para renovar sua permanência na Yukon Station, contate o comando central._`);

        } catch (err) {
            console.error("❌ Erro ao consultar assinatura:", err);
            return msg.reply("⚠️ Falha ao conectar com o banco de dados.");
        }
    }
};