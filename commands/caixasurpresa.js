module.exports = {
    name: 'caixasurpresa',
    async execute(client, msg, { chatId, senderRaw, User }) {
        try {
            const autorId = String(senderRaw).trim();
            const CUSTO = 100;

            const user = await User.findOne({ userId: autorId, groupId: chatId });

            if (!user || user.coins < CUSTO) {
                return await client.sendMessage(chatId, `❌ *SALDO INSUFICIENTE!*\nA Caixa Surpresa custa *${CUSTO} YC*.\nSeu saldo: *${(user?.coins || 0).toLocaleString('pt-BR')} YC*`);
            }

            // Debita o custo
            await User.updateOne({ userId: autorId, groupId: chatId }, { $inc: { coins: -CUSTO } });

            // Sorteio: 40% perde, 35% ganha fixo, 25% multiplicador
            const sorteio = Math.random() * 100;
            let resultado, variacao, mensagem;

            if (sorteio < 40) {
                // PERDE — 40%
                resultado = -CUSTO;
                mensagem = `💸 *CAIXA VAZIA!*\n\nVocê abriu a caixa e... não tinha nada!\n❌ Perdeu: *${CUSTO} YC*`;

            } else if (sorteio < 75) {
                // GANHA FIXO — 35%
                const ganho = Math.floor(Math.random() * (500 - 100 + 1)) + 100;
                await User.updateOne({ userId: autorId, groupId: chatId }, { $inc: { coins: ganho } });
                resultado = ganho;
                mensagem = `💰 *BOA SURPRESA!*\n\nVocê abriu a caixa e encontrou moedas!\n✅ Ganhou: *${ganho.toLocaleString('pt-BR')} YC*`;

            } else {
                // MULTIPLICADOR — 25%
                const mult = Math.floor(Math.random() * (10 - 2 + 1)) + 2;
                const ganho = CUSTO * mult;
                await User.updateOne({ userId: autorId, groupId: chatId }, { $inc: { coins: ganho } });
                resultado = ganho;
                mensagem = `🎰 *MULTIPLICADOR ${mult}x!*\n\nVocê abriu a caixa e ativou um multiplicador!\n✅ Ganhou: *${ganho.toLocaleString('pt-BR')} YC* (${mult}x)`;
            }

            const userAtualizado = await User.findOne({ userId: autorId, groupId: chatId });

            await client.sendMessage(chatId, `🎁 *CAIXA SURPRESA — YUKON*
━━━━━━━━━━━━━━━━━━━━━
@${autorId.split('@')[0]} abriu uma Caixa Surpresa!

${mensagem}

💰 *Saldo atual:* ${(userAtualizado?.coins || 0).toLocaleString('pt-BR')} YC
━━━━━━━━━━━━━━━━━━━━━`, { mentions: [autorId] });

        } catch (e) {
            console.error("❌ Erro no /caixasurpresa:", e);
            await client.sendMessage(chatId, "⚠️ Erro ao abrir a caixa surpresa.");
        }
    }
};