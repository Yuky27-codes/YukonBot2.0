module.exports = {
    name: 'mesada',
    async execute(client, msg, { chatId, senderRaw, User, args }) {
        try {
            const valorTotal = parseInt(args[0]);
            const autorId = String(senderRaw).trim();

            if (isNaN(valorTotal) || valorTotal <= 0) {
                return await msg.reply("❓ *COMO USAR:* `/mesada 1000`\nO valor será dividido entre todos os seus filhos(as).");
            }

            const autorData = await User.findOne({ userId: autorId, groupId: chatId });

            if (!autorData || autorData.coins < valorTotal) {
                return await msg.reply(`⚠️ *SALDO INSUFICIENTE:* Você precisa de ${valorTotal} YC.`);
            }

            // Filtra apenas quem é filho ou filha no array family
            const filhos = autorData.family.filter(p => p.role === 'filho' || p.role === 'filha');

            if (filhos.length === 0) {
                return await msg.reply("📭 *YUKON:* Você não tem filhos ou filhas registrados para receber a mesada.");
            }

            const valorPorFilho = Math.floor(valorTotal / filhos.length);
            const idsFilhos = filhos.map(f => f.userId);

            // Tira do Pai/Mãe
            await User.updateOne({ userId: autorId, groupId: chatId }, { $inc: { coins: -valorTotal } });

            // Dá para cada Filho/Filha
            await User.updateMany(
                { userId: { $in: idsFilhos }, groupId: chatId },
                { $inc: { coins: valorPorFilho } }
            );

            const textoMesada = `
💰 *HORA DA MESADA — YUKON*
━━━━━━━━━━━━━━━━━━━━━
👤 *PATROCÍNIO:* @${autorId.split('@')[0]}
👥 *BENEFICIADOS:* ${filhos.length} filhos(as)
💵 *VALOR PARA CADA:* ${valorPorFilho.toLocaleString('pt-BR')} YC

*Educação financeira é a base de uma colônia próspera!*
━━━━━━━━━━━━━━━━━━━━━`.trim();

            await client.sendMessage(chatId, textoMesada, { mentions: [autorId, ...idsFilhos] });

        } catch (e) {
            console.error(e);
            await msg.reply("❌ Erro ao processar a mesada familiar.");
        }
    }
};