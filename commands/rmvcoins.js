module.exports = {
    name: 'rmvcoins',
    async execute(client, msg, { chatId, isAdmin, User, args }) {
        if (!isAdmin) return await msg.reply("❌ *ACESSO NEGADO:* Você não tem autorização para confiscar bens.");

        try {
            const mencoes = msg.mentionedIds;
            const valor = parseInt(args.find(arg => !arg.includes('@')));

            if (mencoes.length === 0 || isNaN(valor) || valor <= 0) {
                return await msg.reply("❓ *COMO USAR:* `/rmvcoins @tripulante 1000`\nConfisque créditos do saldo de um membro.");
            }

            const alvoId = String(mencoes[0]._serialized || mencoes[0]).trim();
            const alvoData = await User.findOne({ userId: alvoId, groupId: chatId });

            if (!alvoData) return await msg.reply("❌ *ERRO:* Alvo não encontrado nos registros.");

            // Impede que o saldo fique negativo (opcional, mas recomendado)
            const valorFinal = Math.min(valor, alvoData.coins);

            await User.updateOne(
                { userId: alvoId, groupId: chatId },
                { $inc: { coins: -valorFinal } }
            );

            await client.sendMessage(chatId, `⚖️ *CONFISCO:* Foram removidos *${valorFinal.toLocaleString('pt-BR')} YC* da conta de @${alvoId.split('@')[0]} por ordem superior.`, {
                mentions: [alvoId]
            });

        } catch (e) {
            console.error(e);
            await msg.reply("❌ Erro ao processar o confisco.");
        }
    }
};