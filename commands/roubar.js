module.exports = {
    name: 'roubar',
    async execute(client, msg, { chatId, senderRaw, User }) {
        try {
            const mencoes = msg.mentionedIds;
            const alvoRaw = mencoes.length > 0 ? (mencoes[0]._serialized || mencoes[0]) : null;
            const autorId = String(senderRaw).trim();
            const meuId = "143130204626959@lid";
            const isComandante = autorId === meuId;

            if (!alvoRaw) return await client.sendMessage(chatId, "👤 *SISTEMA:* Mencione o alvo do assalto!");

            const alvoId = String(alvoRaw).trim();
            if (alvoId === autorId) return await client.sendMessage(chatId, "❓ Você não pode roubar a si mesmo.");
            if (alvoId === meuId) return; // Imunidade silenciada

            const hoje = new Date().toLocaleDateString('pt-BR');

            // 1. SE A DATA DO AUTOR FOR DIFERENTE DE HOJE, ZERA O CONTADOR DELE
            await User.updateOne(
                { userId: autorId, groupId: chatId, lastRobberyDate: { $ne: hoje } },
                { $set: { robberyCount: 0, lastRobberyDate: hoje } }
            );

            // 2. BUSCA OS DADOS ATUALIZADOS DO AUTOR E DO ALVO
            const autorData = await User.findOne({ userId: autorId, groupId: chatId });
            const alvoData = await User.findOne({ userId: alvoId, groupId: chatId });

            if (!autorData) return;

            // 3. VERIFICA O LIMITE INDIVIDUAL ANTES DE QUALQUER OUTRA COISA
            if (!isComandante && autorData.robberyCount >= 3) {
                return await client.sendMessage(
                    chatId,
                    `🚫 @${autorId.split('@')[0]}, você já atingiu seu limite de 3 assaltos hoje! Volte amanhã.`,
                    { mentions: [autorId] }
                );
            }

            // --- VERIFICAÇÕES DE REGRAS ---
            if (autorData.isPassive) {
                return await client.sendMessage(chatId, "⚠️ Você está no *Modo Passivo* e não pode roubar!");
            }

            if (alvoData && alvoData.isPassive) {
                return await client.sendMessage(chatId, `🛡️ @${alvoId.split('@')[0]} está no *Modo Passivo*!`, { mentions: [alvoId] });
            }

            if (!alvoData || alvoData.coins <= 0) {
                return await client.sendMessage(chatId, "⚠️ O alvo não tem moedas.");
            }

            const caosAtivo = global.modoCaosAtivo?.[chatId] > Date.now();
if (!caosAtivo && alvoData.protectedUntil && alvoData.protectedUntil > agora) {
    return await client.sendMessage(chatId, `🛡️ *ESCUDO ATIVO:* O alvo está protegido!`);
}

            if (autorData.coins < 50) {
                return await client.sendMessage(chatId, "⚠️ Você precisa de pelo menos 50 coins para arriscar um roubo.");
            }

            // 4. INCREMENTA O CONTADOR SÓ DEPOIS DE TODAS AS VALIDAÇÕES PASSAREM
            if (!isComandante) {
                await User.updateOne(
                    { userId: autorId, groupId: chatId },
                    { $inc: { robberyCount: 1 } }
                );
            }

            // --- EXECUÇÃO DO ROUBO ---
            const sucesso = Math.random() < 0.40;

            if (sucesso) {
                const valorRoubado = Math.floor(alvoData.coins * 0.20);
                await User.updateOne({ userId: autorId, groupId: chatId }, { $inc: { coins: valorRoubado } });
                await User.updateOne({ userId: alvoId, groupId: chatId }, { $inc: { coins: -valorRoubado } });
                await client.sendMessage(
                    chatId,
                    `🥷 @${autorId.split('@')[0]} roubou ${valorRoubado.toLocaleString()} YC de @${alvoId.split('@')[0]}!`,
                    { mentions: [autorId, alvoId] }
                );
            } else {
                const multa = Math.floor(autorData.coins * 0.30);
                const soltarEm = Date.now() + (5 * 60 * 1000);
                await User.updateOne(
                    { userId: autorId, groupId: chatId },
                    { $inc: { coins: -multa }, $set: { isMuted: true, muteExpires: soltarEm } }
                );
                await client.sendMessage(
                    chatId,
                    `🚨 @${autorId.split('@')[0]} foi preso por 5 min e multado em ${multa.toLocaleString()} YC!`,
                    { mentions: [autorId] }
                );
            }

        } catch (e) {
            console.error("❌ ERRO NO ROUBAR:", e);
        }
    }
};