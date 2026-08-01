const mongoose = require('mongoose');

module.exports = {
    name: 'chat', // ou o nome que estiver usando no indexador
    async execute(client, msg, { args, chatId, isAdmin, User }) {
        try {
            const authorId = (msg.author || msg.from).toString();
            let temPermissao = false;

            // 1. Verifica se é o dono do bot pelo ID do cliente
            const meuNumeroBot = client.info.wid._serialized;
            if (authorId === meuNumeroBot) {
                temPermissao = true;
            }

            // 2. Se já veio como isAdmin do index.js ou é admin do grupo no WhatsApp
            if (!temPermissao && isAdmin) {
                temPermissao = true;
            } else {
                const chat = await msg.getChat();
                if (chat.isGroup) {
                    const participant = chat.participants.find(p => p.id._serialized === authorId);
                    if (participant && (participant.isAdmin || participant.isSuperAdmin)) {
                        temPermissao = true;
                    }
                } else {
                    temPermissao = true;
                }
            }

            // 3. Verifica se o usuário é um Oficial/Admin interno cadastrado no banco (igual ao /promover)
            if (!temPermissao && User) {
                const userData = await User.findOne({ userId: authorId, groupId: chatId });
                if (userData && userData.isBotAdmin) {
                    temPermissao = true;
                }
            }

            if (!temPermissao) {
                return msg.reply("❌ *ACESSO NEGADO:* Apenas administradores do bot ou do grupo podem configurar o chat da Yukon.");
            }

            const subAcao = args[0] ? args[0].toLowerCase() : '';

            if (!subAcao || (subAcao !== 'off' && subAcao !== 'on' && subAcao !== 'chance')) {
                return msg.reply(
                    "⚠️ *Uso incorreto!*\n\n" +
                    "Utilize os comandos abaixo:\n" +
                    "• `/chat off` - Desativa totalmente as respostas automáticas neste grupo\n" +
                    "• `/chat on` - Ativa as respostas automáticas (padrão)\n" +
                    "• `/chat chance <0-100>` - Define a porcentagem de chance (Ex: `/chat chance 10` para 10%)"
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
                    return msg.reply("⚠️ Por favor, informe um valor válido entre **0** e **100**. Exemplo: `/chat chance 15`");
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
            console.error("❌ Erro no comando chat:", err);
            return msg.reply("❌ Erro ao atualizar as configurações do chat.");
        }
    }
};