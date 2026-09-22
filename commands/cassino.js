const mongoose = require('mongoose');
const { getAtributos } = require('./patentes');

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

            // --- 🟢 ATRIBUTOS DE PATENTE ---
            const atributos = getAtributos(player.inventory);
            const limiteApostas = 3 + (atributos.usosExtras.cassino || 0);

            // 3. VERIFICA O LIMITE ANTES DE QUALQUER COISA
            if (!isComandante && player.casinoCount >= limiteApostas) {
                return await client.sendMessage(
                    chatId,
                    `🚫 @${senderId.split('@')[0]}, você já atingiu seu limite de ${limiteApostas} apostas hoje! Volte amanhã.`,
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

            // Capturar aposta em GroupDailyStats
            const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
            const GroupDailyStats = mongoose.model('GroupDailyStats');
            await GroupDailyStats.findOneAndUpdate(
                { groupId: chatId, date: today },
                { $inc: { coinsBet: valorAp } },
                { upsert: true }
            );

            // Helper: aplica o bônus de ganho de coins da patente em cima de um valor positivo
            const aplicarBonusCoins = (valor) => Math.round(valor * (1 + atributos.coinBonusPercent / 100));

            // Helper: capturar coins gerados (prêmios do sistema)
            const capturarCoinsGerados = async (valor) => {
                if (valor > 0) {
                    await GroupDailyStats.findOneAndUpdate(
                        { groupId: chatId, date: today },
                        { $inc: { coinsGenerated: valor } },
                        { upsert: true }
                    );
                }
            };

            // --- PROCESSAMENTO DOS JOGOS ---
            switch (jogo) {
                case 'apostar': {
                    const mult = parseInt(parametroExtra) || 2;
                    const chanceBase = (1 / mult - 0.05);
                    const win = isComandante ? true : Math.random() < (chanceBase + atributos.sorteBonus / 100);
                    if (win) {
                        const lucro = aplicarBonusCoins((valorAp * mult) - valorAp);
                        await User.updateOne({ userId: senderId, groupId: chatId }, { $inc: { coins: lucro } });
                        await capturarCoinsGerados(lucro);
                        await client.sendMessage(chatId, `🎉 *GANHOU!* +${lucro.toLocaleString()} YC!`);
                    } else {
                        await User.updateOne({ userId: senderId, groupId: chatId }, { $inc: { coins: -valorAp } });
                        await client.sendMessage(chatId, `💸 *PERDEU!* -${valorAp.toLocaleString()} YC.`);
                    }
                    break;
                }
                case 'rolea': // mantido caso use sem 't' ou corrigido para 'roleta' abaixo
                case 'roleta': {
                    if (isComandante) {
                        const premioCmd = aplicarBonusCoins(valorAp * 2);
                        await User.updateOne({ userId: senderId, groupId: chatId }, { $inc: { coins: premioCmd } });
                        await capturarCoinsGerados(premioCmd);
                        return await client.sendMessage(chatId, `👑 *COMANDANTE:* Vitória garantida! Ganhou +${premioCmd.toLocaleString()} YC!`);
                    }

                    const roll = Math.random(); // Número aleatório entre 0.0 e 1.0

                    if (roll < 0.90) {
                        // 90% de chance: Perde apenas o valor apostado
                        await User.updateOne({ userId: senderId, groupId: chatId }, { $inc: { coins: -valorAp } });
                        await client.sendMessage(chatId, `💀 *POW!* A roleta falhou. Perdeu: -${valorAp.toLocaleString()} YC.`);
                    } 
                    else if (roll < 0.97) {
                        // 7% de chance (de 0.90 até 0.97): Não acontece nada (devolve o valor descontado ou mantém saldo)
                        // Como o saldo já havia sido validado, se não acontece nada, estornamos o valorap tirado ou simplesmente não debitamos. 
                        // Aqui trataremos como "nada alterado" na carteira.
                        await client.sendMessage(chatId, `🌀 *PASSOU RASGANDO!* A arma travou e nada aconteceu. Sua aposta de ${valorAp.toLocaleString()} YC foi estornada.`);
                    } 
                    else if (roll < 0.99) {
                        // 2% de chance (de 0.97 até 0.99): Perde TUDO da carteira
                        const saldoTotalPerdido = player.coins;
                        await User.updateOne({ userId: senderId, groupId: chatId }, { $set: { coins: 0 } });
                        await client.sendMessage(chatId, `💥 *DESASTRE TOTAL!* Deu pane crítica na nave e você perdeu *tudo* o que tinha na carteira: -${saldoTotalPerdido.toLocaleString()} YC!`);
                    } 
                    else {
                        // 1% de chance (de 0.99 até 1.0): Ganha com multiplicador de 2x
                        const premio = aplicarBonusCoins(valorAp * 2);
                        await User.updateOne({ userId: senderId, groupId: chatId }, { $inc: { coins: premio } });
                        await capturarCoinsGerados(premio);
                        await client.sendMessage(chatId, `🎯 *JACKPOT ESTELAR!* (1% de chance) Acertou o multiplicador de 2x! Ganhou +${premio.toLocaleString()} YC!`);
                    }
                    break;
                }
                case '21': {
                    const alvo = parseInt(parametroExtra);
                    const seuPonto = isComandante ? alvo : (Math.floor(Math.random() * 11) + 1) + (Math.floor(Math.random() * 11) + 1);
                    const salvouPelaSorte = !isComandante && seuPonto !== alvo && Math.random() < (atributos.sorteBonus / 100);
                    if (seuPonto === alvo || salvouPelaSorte) {
                        const premio = aplicarBonusCoins(valorAp * 5);
                        await User.updateOne({ userId: senderId, groupId: chatId }, { $inc: { coins: premio } });
                        await capturarCoinsGerados(premio);
                        const textoResultado = salvouPelaSorte ? `Tirou ${seuPonto}, mas sua sorte estelar salvou a jogada!` : `Tirou ${seuPonto}!`;
                        await client.sendMessage(chatId, `🃏 *NA MOSCA!* ${textoResultado} +${premio.toLocaleString()} YC!`);
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
                        const venceuPelaSorte = minhaNave !== podio[0] && Math.random() < (atributos.sorteBonus / 100);
                        if (isComandante || minhaNave === podio[0] || venceuPelaSorte) {
                            const winC = aplicarBonusCoins(valorAp * 3);
                            await User.updateOne({ userId: senderId, groupId: chatId }, { $inc: { coins: winC } });
                            await capturarCoinsGerados(winC);
                            msgF += venceuPelaSorte ? `🍀 Sorte estelar! Ganhou +${winC.toLocaleString()} YC!` : `🏆 Ganhou +${winC.toLocaleString()} YC!`;
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