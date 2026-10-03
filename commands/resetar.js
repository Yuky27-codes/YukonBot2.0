module.exports = {
    name: 'resetar',
    async execute(client, msg, { args, chatId, isAdmin, User }) {
        if (!isAdmin) return;

        try {
            let alvoIdLimpo = null;
            const escolhaReset = args[args.length - 1]?.toLowerCase();

            if (escolhaReset !== 'advs') {
                if (msg.hasQuotedMsg) {
                    const quoted = await msg.getQuotedMessage();
                    alvoIdLimpo = (quoted.author || quoted.from).toString();
                }
                else if (msg.mentionedIds && msg.mentionedIds.length > 0) {
                    alvoIdLimpo = (msg.mentionedIds[0]._serialized || msg.mentionedIds[0]).toString();
                }
                else if (args.length >= 2) {
                    const possivelNumero = args[0].replace(/\D/g, '');
                    if (possivelNumero.length >= 10) {
                        alvoIdLimpo = `${possivelNumero}@c.us`;
                    }
                }
            }

            if ((!alvoIdLimpo && escolhaReset !== 'advs') || !escolhaReset) {
                const menuAjuda = `⚙️ *CENTRAL DE RESET YUKON*
━━━━━━━━━━━━━━━━━━━━━
Use: */resetar @pessoa [opção]*
Ou: */resetar advs* (Para limpar todas as ADVs do grupo)

🔹 *Opções de Alvo:*
• *civil:* Reseta casamento
• *familia:* Reseta linhagem e filhos
• *moedas:* Zera a carteira
• *nivel:* Reseta Nível e XP
• *cargos:* Reseta patentes e inventário

🔹 *Opções Globais:*
• *advs:* Limpa e zera todas as ADVs (Nível 1, 2, 3 e Histórico) de TODO o grupo
• *tudo:* Apaga todos os dados do alvo
━━━━━━━━━━━━━━━━━━━━━`;
                return await client.sendMessage(chatId, menuAjuda);
            }

            let textoSucesso = "";

            switch (escolhaReset) {
                case 'advs':
                    // Zera os contadores de todos os níveis e limpa o histórico de advertências no grupo
                    await User.updateMany(
                        { groupId: chatId },
                        { 
                            $set: { 
                                advsNivel1: 0, 
                                advsNivel2: 0, 
                                advsNivel3: 0,
                                advHistory: [] 
                            } 
                        }
                    );
                    textoSucesso = "📢 *ANISTIA GERAL:* Todas as advertências (Leves, Moderadas e Pesadas) e históricos do grupo foram completamente apagados.";
                    break;

                case 'familia':
                    await User.updateMany({ groupId: chatId }, { $pull: { family: { userId: alvoIdLimpo } } });
                    await User.updateOne({ userId: alvoIdLimpo, groupId: chatId }, { $set: { family: [] } });
                    textoSucesso = "🧬 Linhagem e parentescos resetados globalmente.";
                    break;

                case 'civil': {
                    const userCiv = await User.findOne({ userId: alvoIdLimpo, groupId: chatId });
                    if (userCiv && userCiv.marriedWith) {
                        await User.updateOne({ userId: userCiv.marriedWith, groupId: chatId }, { $set: { marriedWith: null } });
                    }
                    await User.updateOne({ userId: alvoIdLimpo, groupId: chatId }, { $set: { marriedWith: null } });
                    textoSucesso = "💔 Status Civil resetado.";
                    break;
                }

                case 'moedas':
                    await User.updateOne({ userId: alvoIdLimpo, groupId: chatId }, { $set: { coins: 0 } });
                    textoSucesso = "💰 Carteira de moedas zerada.";
                    break;

                case 'nivel':
                    await User.updateOne(
                        { userId: alvoIdLimpo, groupId: chatId },
                        { $set: { level: 1, xp: 0 } }
                    );
                    textoSucesso = "🆙 Nível e XP resetados para o início.";
                    break;

                case 'cargos':
                    await User.updateOne({ userId: alvoIdLimpo, groupId: chatId }, { $set: { roles: ["Tripulante"], inventory: [] } });
                    textoSucesso = "📜 Patentes e Inventário limpos.";
                    break;

                case 'tudo': {
                    await User.updateMany({ groupId: chatId }, { $pull: { family: { userId: alvoIdLimpo } } });
                    const uTudo = await User.findOne({ userId: alvoIdLimpo, groupId: chatId });
                    if (uTudo && uTudo.marriedWith) {
                        await User.updateOne({ userId: uTudo.marriedWith, groupId: chatId }, { $set: { marriedWith: null } });
                    }
                    await User.updateOne({ userId: alvoIdLimpo, groupId: chatId }, {
                        $set: { 
                            coins: 0, 
                            xp: 0, 
                            level: 1, 
                            roles: ["Tripulante"], 
                            inventory: [], 
                            marriedWith: null, 
                            family: [], 
                            advsNivel1: 0, 
                            advsNivel2: 0, 
                            advsNivel3: 0,
                            advHistory: [] 
                        }
                    });
                    textoSucesso = "🧹 Protocolo de limpeza TOTAL aplicado (incluindo advertências do usuário).";
                    break;
                }

                default:
                    return await msg.reply("⚠️ Opção inválida.");
            }

            const mencaoMesa = alvoIdLimpo ? `@${alvoIdLimpo.split('@')[0]}` : "Tripulação";
            await client.sendMessage(chatId, `✅ *SUCESSO:* ${mencaoMesa} teve seus dados alterados.\n${textoSucesso}`, {
                mentions: alvoIdLimpo ? [alvoIdLimpo] : []
            });

        } catch (err) {
            console.error("❌ ERRO NO RESET:", err);
            await msg.reply("⚠️ Falha crítica ao processar reset.");
        }
    }
};