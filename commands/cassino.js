module.exports = {
    name: 'cassino',
    async execute(client, msg, { args, chatId, senderRaw, User }) {
        try {
            const senderId = senderRaw.toString();
            const meuId = "143130204626959@lid";
            const isComandante = senderId === meuId;

            const jogo = args[0] ? args[0].toLowerCase() : null;
            const valorAp = parseInt(args[1]);
            const parametroExtra = args[2];

            if (!jogo) {
                const menu = `🎰 *CENTRAL DE APOSTAS YUKON*\n\n🚀 */cassino apostar [valor] [mult]*\n💀 */cassino roleta [valor]*\n🃏 */cassino 21 [valor] [alvo]*\n🛸 */cassino corrida [valor]*`;
                return await client.sendMessage(chatId, menu);
            }

            const hoje = new Date().toLocaleDateString('pt-BR');

            // 1. SE A DATA DO USUÁRIO FOR DIFERENTE DE HOJE, ZERA O CONTADOR DELE
            await User.updateOne(
                { userId: senderId, groupId: chatId, lastCasinoDate: { $ne: hoje } },
                { $set: { casinoCount: 0, lastCasinoDate: hoje } }
            );

            // 2. BUSCA OS DADOS ATUALIZADOS DO USUÁRIO
            const player = await User.findOne({ userId: senderId, groupId: chatId });
            if (!player) return;

            // 3. VERIFICA O LIMITE ANTES DE QUALQUER COISA
            if (!isComandante && player.casinoCount >= 3) {
                return await client.sendMessage(
                    chatId,
                    `🚫 @${senderId.split('@')[0]}, você já atingiu seu limite de 3 apostas hoje! Volte amanhã.`,
                    { mentions: [senderId] }
                );
            }

            // 4. VERIFICA SALDO E VALOR
            if (isNaN(valorAp) || valorAp <= 0) {
                return await client.sendMessage(chatId, "❌ Valor inválido. Digite um número maior que zero.");
            }
            if (player.coins < valorAp) {
                return await client.sendMessage(chatId, `❌ Saldo insuficiente! Você tem ${player.coins.toLocaleString()} YC.`);
            }

            // 5. VALIDA PARÂMETROS ESPECÍFICOS DE CADA JOGO ANTES DE INCREMENTAR O CONTADOR
            if (jogo === 'apostar') {
                const mult = parseInt(parametroExtra) || 2;
                if (mult < 2 || mult > 10) {
                    return await client.sendMessage(chatId, "❌ Multiplicador inválido. Use entre 2x e 10x.");
                }
            }

            if (jogo === '21') {
                const alvo = parseInt(parametroExtra);
                if (isNaN(alvo) || alvo < 2 || alvo > 21) {
                    return await client.sendMessage(chatId, "🃏 Escolha um alvo entre 2 e 21!");
                }
            }

            const jogosValidos = ['apostar', 'roleta', '21', 'corrida'];
            if (!jogosValidos.includes(jogo)) {
                return await client.sendMessage(chatId, "❓ Jogo não encontrado. Use: apostar, roleta, 21 ou corrida.");
            }

            // 6. SÓ INCREMENTA O CONTADOR DEPOIS DE TODAS AS VALIDAÇÕES PASSAREM
            if (!isComandante) {
                await User.updateOne(
                    { userId: senderId, groupId: chatId },
                    { $inc: { casinoCount: 1 } }
                );
            }

            // --- PROCESSAMENTO DOS JOGOS ---
            switch (jogo) {
                case 'apostar': {
                    const mult = parseInt(parametroExtra) || 2;
                    const win = isComandante ? true : Math.random() < (1 / mult - 0.05);
                    if (win) {
                        const lucro = (valorAp * mult) - valorAp;
                        await User.updateOne({ userId: senderId, groupId: chatId }, { $inc: { coins: lucro } });
                        await client.sendMessage(chatId, `🎉 *GANHOU!* +${lucro.toLocaleString()} YC!`);
                    } else {
                        await User.updateOne({ userId: senderId, groupId: chatId }, { $inc: { coins: -valorAp } });
                        await client.sendMessage(chatId, `💸 *PERDEU!* -${valorAp.toLocaleString()} YC.`);
                    }
                    break;
                }
                case 'roleta': {
                    const roletaResultado = isComandante ? 1 : Math.floor(Math.random() * 6);
                    if (roletaResultado === 0) {
                        const perda = Math.floor(player.coins * 0.8);
                        await User.updateOne({ userId: senderId, groupId: chatId }, { $inc: { coins: -perda } });
                        await client.sendMessage(chatId, `💀 *POW!* Perdeu 80%: -${perda.toLocaleString()} YC.`);
                    } else {
                        const lucroR = Math.floor(valorAp * 0.5);
                        await User.updateOne({ userId: senderId, groupId: chatId }, { $inc: { coins: lucroR } });
                        await client.sendMessage(chatId, `🔫 *CLACK!* Ganhou ${lucroR.toLocaleString()} YC!`);
                    }
                    break;
                }
                case '21': {
                    const alvo = parseInt(parametroExtra);
                    const seuPonto = isComandante ? alvo : (Math.floor(Math.random() * 11) + 1) + (Math.floor(Math.random() * 11) + 1);
                    if (seuPonto === alvo) {
                        const premio = valorAp * 5;
                        await User.updateOne({ userId: senderId, groupId: chatId }, { $inc: { coins: premio } });
                        await client.sendMessage(chatId, `🃏 *NA MOSCA!* Tirou ${seuPonto}: +${premio.toLocaleString()} YC!`);
                    } else {
                        await User.updateOne({ userId: senderId, groupId: chatId }, { $inc: { coins: -valorAp } });
                        await client.sendMessage(chatId, `🃏 *PERDEU!* Tirou ${seuPonto}: -${valorAp.toLocaleString()} YC.`);
                    }
                    break;
                }
                case 'corrida': {
                    const naves = ["🚀", "🛸", "🛰️", "✈️"];
                    const minhaNave = naves[Math.floor(Math.random() * naves.length)];
                    await client.sendMessage(chatId, `🏁 Sua nave ${minhaNave} decolou!`);
                    setTimeout(async () => {
                        const podio = [...naves].sort(() => Math.random() - 0.5);
                        let msgF = `🏁 1º: ${podio[0]} | 2º: ${podio[1]} | 3º: ${podio[2]}\n`;
                        if (isComandante || minhaNave === podio[0]) {
                            const winC = valorAp * 3;
                            await User.updateOne({ userId: senderId, groupId: chatId }, { $inc: { coins: winC } });
                            msgF += `🏆 Ganhou +${winC.toLocaleString()} YC!`;
                        } else {
                            await User.updateOne({ userId: senderId, groupId: chatId }, { $inc: { coins: -valorAp } });
                            msgF += `❌ Perdeu -${valorAp.toLocaleString()} YC.`;
                        }
                        await client.sendMessage(chatId, msgF, { mentions: [senderId] });
                    }, 4000);
                    break;
                }
            }
        } catch (e) { console.error(e); }
    }
};