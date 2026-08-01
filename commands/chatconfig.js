const mongoose = require('mongoose');

module.exports = {
    name: 'chatconfig',
    async execute(client, msg, { args, chatId }) {
        try {
            const authorId = (msg.author || msg.from).toString();
            let temPermissao = false;

            // Verifica se é o dono do bot ou admin do grupo
            const meuNumeroBot = client.info.wid._serialized;
            if (authorId === meuNumeroBot) {
                temPermissao = true;
            }

            const chat = await msg.getChat();
            if (chat.isGroup) {
                const participant = chat.participants.find(p => p.id._serialized === authorId);
                if (participant && (participant.isAdmin || participant.isSuperAdmin)) {
                    temPermissao = true;
                }
            } else {
                temPermissao = true;
            }

            if (!temPermissao) {
                return msg.reply("❌ *ACESSO NEGADO:* Apenas administradores podem configurar o chat da Yukon.");
            }

            const subAcao = args[0] ? args[0].toLowerCase() : '';

            if (!subAcao || (subAcao !== 'off' && subAcao !== 'on' && subAcao !== 'chance')) {
                return msg.reply(
                    "⚠️ *Uso incorreto!*\n\n" +
                    "Utilize os comandos abaixo:\n" +
                    "• `/chatconfig off` - Desativa totalmente as respostas automáticas neste grupo\n" +
                    "• `/chatconfig on` - Ativa as respostas automáticas (padrão)\n" +
                    "• `/chatconfig chance <0-100>` - Define a porcentagem de chance (Ex: `/chatconfig chance 10` para 10%)"
                );
            }

            const GroupConfig = mongoose.model('GroupConfig');

            if (subAcao === 'off' || subAcao === 'on') {
                const ativar = subAcao === 'on';

                await GroupConfig.updateOne(
                    { groupId: chatId },
                    { $set: { chatAtivo: ativar } },
                    { upsert: true }
                );

                return msg.reply(
                    ativar 
                        ? "✅ *Respostas automáticas da Yukon ATIVADAS neste grupo!*" 
                        : "🛑 *Respostas automáticas da Yukon DESATIVADAS neste grupo!* (Ela só responderá se for marcada)."
                );
            }

            if (subAcao === 'chance') {
                const valorStr = args[1];
                const porcentagem = parseInt(valorStr);

                if (isNaN(porcentagem) || porcentagem < 0 || porcentagem > 100) {
                    return msg.reply("⚠️ Por favor, informe um valor válido entre **0** e **100**. Exemplo: `/chatconfig chance 15`");
                }

                const chanceDecimal = porcentagem / 100;

                await GroupConfig.updateOne(
                    { groupId: chatId },
                    { $set: { chanceChat: chanceDecimal } },
                    { upsert: true }
                );

                return msg.reply(`🎯 *Chance de resposta aleatória atualizada para ${porcentagem}% neste grupo!*`);
            }

        } catch (err) {
            console.error("❌ Erro no comando chatconfig:", err);
            return msg.reply("❌ Erro ao atualizar as configurações do chat.");
        }
    }
};