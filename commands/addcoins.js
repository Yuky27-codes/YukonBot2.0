module.exports = {
    name: 'addcoins',
    async execute(client, msg, { chatId, isAdmin, User, args }) {
        if (!isAdmin) return await msg.reply("❌ *ACESSO NEGADO:* Apenas oficiais de alta patente (ADMs) podem emitir moedas.");

        try {
            const mencoes = msg.mentionedIds;
            const valor = parseInt(args.find(arg => !arg.includes('@'))); // Pega o primeiro número que não seja a menção
            
            if (mencoes.length === 0 || isNaN(valor) || valor <= 0) {
                return await msg.reply("❓ *COMO USAR:* `/addcoins @tripulante 5000`\nAdicione créditos ao saldo de um membro.");
            }

            const alvoId = String(mencoes[0]._serialized || mencoes[0]).trim();

            // Atualiza ou Cria o usuário se ele não existir
            const update = await User.findOneAndUpdate(
                { userId: alvoId, groupId: chatId },
                { $inc: { coins: valor } },
                { upsert: true, new: true }
            );

            await client.sendMessage(chatId, `💰 *YUKON MINT:* Foram injetados *${valor.toLocaleString('pt-BR')} YC* na conta de @${alvoId.split('@')[0]}!\n✨ Novo saldo: *${update.coins.toLocaleString('pt-BR')} YC*`, {
                mentions: [alvoId]
            });

        } catch (e) {
            console.error(e);
            await msg.reply("❌ Erro ao processar a emissão de moedas.");
        }
    }
};