module.exports = {
    name: 'cassino',
    async execute(client, msg, { args, chatId, senderRaw, User }) {
        try {
            const senderId = senderRaw.toString();
            
            // Captura de argumentos
            const jogo = args[0] ? args[0].toLowerCase() : null;
            const valorAp = parseInt(args[1]);
            const parametroExtra = args[2];

            // 1. Menu Inicial (caso não digite o jogo)
            if (!jogo) {
                const menuCassino = `🎰 *CENTRAL DE APOSTAS YUKON* 🎰

🚀 */cassino apostar [valor] [mult]*
💀 */cassino roleta [valor]*
🃏 */cassino 21 [valor] [alvo]*
🛸 */cassino corrida [valor]*

_Ex: /cassino apostar 500 2_`;
                return await client.sendMessage(chatId, menuCassino, { sendSeen: false });
            }

            // 2. Busca o jogador no banco
            const player = await User.findOne({ userId: senderId, groupId: chatId });

            // 3. Validação Geral de Saldo e Aposta
            if (!player || isNaN(valorAp) || valorAp <= 0 || player.coins < valorAp) {
                return await client.sendMessage(chatId, "❌ *CASSINO:* Saldo insuficiente ou valor de aposta inválido!", { sendSeen: false });
            }

            // 4. Lógica dos Jogos
            switch (jogo) {
                case 'apostar': {
                    const mult = parseInt(parametroExtra) || 2;
                    if (mult < 2 || mult > 10) {
                        return await client.sendMessage(chatId, "❌ Multiplicador deve ser entre 2x e 10x.", { sendSeen: false });
                    }
                    
                    const winApostar = Math.floor(Math.random() * 100) <= (Math.floor(100 / mult) - 5);
                    
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
                    if (Math.floor(Math.random() * 6) === 0) {
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
                    if (isNaN(alvo) || alvo < 2 || alvo > 21) {
                        return await client.sendMessage(chatId, "🃏 Escolha um alvo entre 2 e 21!\nEx: */cassino 21 100 18*", { sendSeen: false });
                    }
                    
                    const mult21 = (1 + (alvo / 21) * 4).toFixed(1);
                    const seuPonto = (Math.floor(Math.random() * 11) + 1) + (Math.floor(Math.random() * 11) + 1);
                    
                    if (seuPonto === alvo) {
                        const premioMax = Math.floor(valorAp * mult21);
                        await User.updateOne({ userId: senderId, groupId: chatId }, { $inc: { coins: premioMax } });
                        await client.sendMessage(chatId, `🃏 *NA MOSCA!* Tirou ${seuPonto}. Prêmio: +${premioMax.toLocaleString()} YC!`, { sendSeen: false });
                    } else if (seuPonto < alvo && seuPonto > (alvo - 3)) {
                        const premioPerto = Math.floor(valorAp * 0.5);
                        await User.updateOne({ userId: senderId, groupId: chatId }, { $inc: { coins: premioPerto } });
                        await client.sendMessage(chatId, `🃏 *QUASE!* Tirou ${seuPonto}. Ganhou: +${premioPerto.toLocaleString()} YC.`, { sendSeen: false });
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
                        const podio = [...naves].sort(() => Math.random() - 0.5);
                        let textoFinal = `🏁 *RESULTADO DA CORRIDA* 🏁\n🥇 1º: ${podio[0]}\n🥈 2º: ${podio[1]}\n🥉 3º: ${podio[2]}\n━━━━━━━━━━━━━━━\n`;
                        
                        if (minhaNave === podio[0]) {
                            const win = valorAp * 3;
                            await User.updateOne({ userId: senderId, groupId: chatId }, { $inc: { coins: win } });
                            textoFinal += `🏆 @${senderId.split('@')[0]} Ganhou: +${win.toLocaleString()} YC!`;
                        } else if (minhaNave === podio[1]) {
                            const win2 = Math.floor(valorAp * 0.5);
                            await User.updateOne({ userId: senderId, groupId: chatId }, { $inc: { coins: win2 } });
                            textoFinal += `🥈 @${senderId.split('@')[0]} Ganhou: +${win2.toLocaleString()} YC.`;
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