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
                const menuCassino = `🎰 *CENTRAL DE APOSTAS YUKON* 🎰\n\n🚀 */cassino apostar [valor] [mult]*\n💀 */cassino roleta [valor]*\n🃏 */cassino 21 [valor] [alvo]*\n🛸 */cassino corrida [valor]*\n\n_Ex: /cassino apostar 500 2_`;
                return await client.sendMessage(chatId, menuCassino, { sendSeen: false });
            }

            const player = await User.findOne({ userId: senderId, groupId: chatId });

            // --- 🕒 SISTEMA DE LIMITE DIÁRIO ---
            const hoje = new Date().toLocaleDateString('pt-BR');
            if (!isComandante) {
                if (player.lastCasinoDate !== hoje) {
                    player.casinoCount = 0;
                    player.lastCasinoDate = hoje;
                }
                if (player.casinoCount >= 3) {
                    return await client.sendMessage(chatId, "🚫 *LIMITE ATINGIDO:* Você já fez suas 3 apostas diárias permitidas pela Federação Yukon! Volte amanhã.");
                }
            }

            if (!player || isNaN(valorAp) || valorAp <= 0 || player.coins < valorAp) {
                return await client.sendMessage(chatId, "❌ *CASSINO:* Saldo insuficiente ou valor de aposta inválido!", { sendSeen: false });
            }

            // Incrementa o contador de uso
            await User.updateOne({ userId: senderId, groupId: chatId }, { $inc: { casinoCount: 1 }, $set: { lastCasinoDate: hoje } });

            switch (jogo) {
                case 'apostar': {
                    const mult = parseInt(parametroExtra) || 2;
                    if (mult < 2 || mult > 10) return await client.sendMessage(chatId, "❌ Multiplicador deve ser entre 2x e 10x.", { sendSeen: false });
                    const winApostar = isComandante ? true : Math.floor(Math.random() * 100) <= (Math.floor(100 / mult) - 5);
                    if (winApostar) {
                        const lucro = (valorAp * mult) - valorAp;
                        await User.updateOne({ userId: senderId, groupId: chatId }, { $inc: { coins: lucro } });
                        await client.sendMessage(chatId, `🎉 *GANHOU!* @${senderId.split('@')[0]} lucrou: ${lucro.toLocaleString()} YC!`, { mentions: [senderId], sendSeen: false });
                    } else {
                        await User.updateOne({ userId: senderId, groupId: chatId }, { $inc: { coins: -valorAp } });
                        await client.sendMessage(chatId, `💸 *PERDEU!* @${senderId.split('@')[0]} perdeu ${valorAp.toLocaleString()} YC.`, { mentions: [senderId], sendSeen: false });
                    }
                    break;
                }
                case 'roleta': {
                    const roletaResultado = isComandante ? 1 : Math.floor(Math.random() * 6);
                    if (roletaResultado === 0) {
                        const perdaFatal = Math.floor(player.coins * 0.8);
                        await User.updateOne({ userId: senderId, groupId: chatId }, { $inc: { coins: -perdaFatal } });
                        await client.sendMessage(chatId, `💀 *POW!* @${senderId.split('@')[0]} perdeu 80% do saldo: -${perdaFatal.toLocaleString()} YC.`, { mentions: [senderId], sendSeen: false });
                    } else {
                        const lucroR = Math.floor(valorAp * 0.5);
                        await User.updateOne({ userId: senderId, groupId: chatId }, { $inc: { coins: lucroR } });
                        await client.sendMessage(chatId, `🔫 *CLACK!* @${senderId.split('@')[0]} sobreviveu e ganhou ${lucroR.toLocaleString()} YC!`, { mentions: [senderId], sendSeen: false });
                    }
                    break;
                }
                case '21': {
                    const alvo = parseInt(parametroExtra);
                    if (isNaN(alvo) || alvo < 2 || alvo > 21) return await client.sendMessage(chatId, "🃏 Escolha um alvo entre 2 e 21!", { sendSeen: false });
                    const mult21 = (1 + (alvo / 21) * 4).toFixed(1);
                    const seuPonto = isComandante ? alvo : (Math.floor(Math.random() * 11) + 1) + (Math.floor(10) + 1);
                    if (seuPonto === alvo) {
                        const premioMax = Math.floor(valorAp * mult21);
                        await User.updateOne({ userId: senderId, groupId: chatId }, { $inc: { coins: premioMax } });
                        await client.sendMessage(chatId, `🃏 *NA MOSCA!* Tirou ${seuPonto}. Prêmio: +${premioMax.toLocaleString()} YC!`, { sendSeen: false });
                    } else {
                        await User.updateOne({ userId: senderId, groupId: chatId }, { $inc: { coins: -valorAp } });
                        await client.sendMessage(chatId, `🃏 *PERDEU!* Tirou ${seuPonto}. -${valorAp.toLocaleString()} YC.`, { sendSeen: false });
                    }
                    break;
                }
                case 'corrida': {
                    const naves = ["🚀", "🛸", "🛰️", "✈️"];
                    const minhaNave = naves[Math.floor(Math.random() * naves.length)];
                    await client.sendMessage(chatId, `🏁 Sua nave ${minhaNave} entrou na pista! Aguarde o resultado...`, { sendSeen: false });
                    setTimeout(async () => {
                        let podio;
                        if (isComandante) {
                            const outrasNaves = naves.filter(n => n !== minhaNave).sort(() => Math.random() - 0.5);
                            podio = [minhaNave, ...outrasNaves];
                        } else {
                            podio = [...naves].sort(() => Math.random() - 0.5);
                        }
                        let textoFinal = `🏁 *RESULTADO DA CORRIDA* 🏁\n🥇 1º: ${podio[0]}\n🥈 2º: ${podio[1]}\n🥉 3º: ${podio[2]}\n━━━━━━━━━━━━━━━\n`;
                        if (minhaNave === podio[0]) {
                            const win = valorAp * 3;
                            await User.updateOne({ userId: senderId, groupId: chatId }, { $inc: { coins: win } });
                            textoFinal += `🏆 @${senderId.split('@')[0]} Ganhou: +${win.toLocaleString()} YC!`;
                        } else {
                            await User.updateOne({ userId: senderId, groupId: chatId }, { $inc: { coins: -valorAp } });
                            textoFinal += `❌ @${senderId.split('@')[0]} Perdeu: -${valorAp.toLocaleString()} YC.`;
                        }
                        await client.sendMessage(chatId, textoFinal, { mentions: [senderId], sendSeen: false });
                    }, 5000);
                    break;
                }
                default:
                    await client.sendMessage(chatId, "❓ Jogo não encontrado no Cassino Yukon.", { sendSeen: false });
            }
        } catch (e) {
            console.error("❌ ERRO NO CASSINO:", e.message);
            await client.sendMessage(chatId, "⚠️ Erro no processador de apostas.", { sendSeen: false });
        }
    }
};