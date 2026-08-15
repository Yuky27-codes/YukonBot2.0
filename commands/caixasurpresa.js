const { getAtributos } = require('./patentes');
const mongoose = require('mongoose');

module.exports = {
    name: 'caixasurpresa',
    async execute(client, msg, { chatId, senderRaw, User }) {
        try {
            const autorId = String(senderRaw).trim();
            const CUSTO = 100;
            const COOLDOWN_MS = 60 * 60 * 1000; // 1 hora

            const user = await User.findOne({ userId: autorId, groupId: chatId });

            if (!user || user.coins < CUSTO) {
                return await client.sendMessage(chatId, `❌ *SALDO INSUFICIENTE!*\nA Caixa Surpresa custa *${CUSTO} YC*.\nSeu saldo: *${(user?.coins || 0).toLocaleString('pt-BR')} YC*`);
            }

            // ✅ Verifica cooldown
            const agora = Date.now();
            if (user.lastCaixaSurpresa && (agora - new Date(user.lastCaixaSurpresa).getTime()) < COOLDOWN_MS) {
                const restante = COOLDOWN_MS - (agora - new Date(user.lastCaixaSurpresa).getTime());
                const minutos = Math.floor(restante / (1000 * 60));
                const segundos = Math.floor((restante % (1000 * 60)) / 1000);
                return await client.sendMessage(chatId, `⏳ *AGUARDE!*\nVocê já abriu uma Caixa Surpresa recentemente!\n\nPróxima disponível em: *${minutos}min ${segundos}s*`);
            }

            // --- 🟢 ATRIBUTOS DE PATENTE ---
            const atributos = getAtributos(user.inventory);
            const aplicarBonusCoins = (valor) => Math.round(valor * (1 + atributos.coinBonusPercent / 100));

            // Debita o custo e registra o cooldown
            await User.updateOne(
                { userId: autorId, groupId: chatId },
                {
                    $inc: { coins: -CUSTO },
                    $set: { lastCaixaSurpresa: new Date() }
                }
            );

            // Sorteio: 40% perde, 35% ganha fixo, 25% multiplicador
            const sorteio = Math.random() * 100;
            let mensagem;
            let ganhoGerado = 0;

            if (sorteio < 40) {
                mensagem = `💸 *CAIXA VAZIA!*\n\nVocê abriu a caixa e... não tinha nada!\n❌ Perdeu: *${CUSTO} YC*`;

            } else if (sorteio < 75) {
                ganhoGerado = aplicarBonusCoins(Math.floor(Math.random() * (500 - 100 + 1)) + 100);
                await User.updateOne({ userId: autorId, groupId: chatId }, { $inc: { coins: ganhoGerado } });
                mensagem = `💰 *BOA SURPRESA!*\n\nVocê abriu a caixa e encontrou moedas!\n✅ Ganhou: *${ganhoGerado.toLocaleString('pt-BR')} YC*`;

            } else {
                const mult = Math.floor(Math.random() * (10 - 2 + 1)) + 2;
                ganhoGerado = aplicarBonusCoins(CUSTO * mult);
                await User.updateOne({ userId: autorId, groupId: chatId }, { $inc: { coins: ganhoGerado } });
                mensagem = `🎰 *MULTIPLICADOR ${mult}x!*\n\nVocê abriu a caixa e ativou um multiplicador!\n✅ Ganhou: *${ganhoGerado.toLocaleString('pt-BR')} YC* (${mult}x)`;
            }

            // Capturar coins gerados em GroupDailyStats (só se ganhou algo)
            if (ganhoGerado > 0) {
                const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
                const GroupDailyStats = mongoose.model('GroupDailyStats');
                await GroupDailyStats.findOneAndUpdate(
                    { groupId: chatId, date: today },
                    { $inc: { coinsGenerated: ganhoGerado } },
                    { upsert: true }
                );
            }

            const userAtualizado = await User.findOne({ userId: autorId, groupId: chatId });

            await client.sendMessage(chatId, `🎁 *CAIXA SURPRESA — YUKON*
━━━━━━━━━━━━━━━━━━━━━
@${autorId.split('@')[0]} abriu uma Caixa Surpresa!

${mensagem}

💰 *Saldo atual:* ${(userAtualizado?.coins || 0).toLocaleString('pt-BR')} YC
⏳ *Próxima caixa em:* 1 hora
━━━━━━━━━━━━━━━━━━━━━`, { mentions: [autorId] });

        } catch (e) {
            console.error("❌ Erro no /caixasurpresa:", e);
            await client.sendMessage(chatId, "⚠️ Erro ao abrir a caixa surpresa.");
        }
    }
};