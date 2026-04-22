module.exports = {
    name: 'resetar',
    async execute(client, msg, { args, chatId, isAdmin, User }) {
        // 1. Bloqueio de Segurança: Apenas Administradores
        if (!isAdmin) return;

        try {
            let alvoIdLimpo = null;
            const escolhaReset = args[args.length - 1]?.toLowerCase();

            // 2. Extração Identitária (Só necessária se não for reset de grupo)
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

            // 3. Menu de Ajuda
            if ((!alvoIdLimpo && escolhaReset !== 'advs') || !escolhaReset) {
                const menuAjuda = `⚙️ *CENTRAL DE RESET YUKON*
━━━━━━━━━━━━━━━━━━━━━
Use: */resetar @pessoa [opção]*
Ou: */resetar advs* (Para o grupo todo)

🔹 *Opções de Alvo:*
• *civil:* Reseta casamento
• *familia:* Reseta linhagem e filhos
• *moedas:* Zera a carteira
• *nivel:* Reseta Nível e XP
• *cargos:* Reseta patentes e inventário

🔹 *Opções Globais:*
• *advs:* Limpa as ADVs de TODO o grupo
• *tudo:* Apaga todos os dados do alvo
━━━━━━━━━━━━━━━━━━━━━`;
                return await client.sendMessage(chatId, menuAjuda);
            }

            let textoSucesso = "";

            // 4. Lógica de Reset
            switch (escolhaReset) {
                case 'advs':
                    // RESET GLOBAL DE ADVERTÊNCIAS
                    await User.updateMany(
                        { groupId: chatId },
                        { $set: { advs: 0 } }
                    );
                    textoSucesso = "📢 *ANISTIA GERAL:* Todas as advertências do grupo foram revogadas.";
                    break;

                case 'familia':
                    await User.updateMany({ groupId: chatId }, { $pull: { family: { userId: alvoIdLimpo } } });
                    await User.updateOne({ userId: alvoIdLimpo, groupId: chatId }, { $set: { family: [] } });
                    textoSucesso = "🧬 Linhagem e parentescos resetados globalmente.";
                    break;

                case 'civil':
                    const userCiv = await User.findOne({ userId: alvoIdLimpo, groupId: chatId });
                    if (userCiv && userCiv.marriedWith) {
                        await User.updateOne({ userId: userCiv.marriedWith, groupId: chatId }, { $set: { marriedWith: null } });
                    }
                    await User.updateOne({ userId: alvoIdLimpo, groupId: chatId }, { $set: { marriedWith: null } });
                    textoSucesso = "💔 Status Civil resetado.";
                    break;

                case 'moedas':
                    await User.updateOne({ userId: alvoIdLimpo, groupId: chatId }, { $set: { coins: 0 } });
                    textoSucesso = "💰 Carteira de moedas zerada.";
                    break;

                case 'cargos':
                    await User.updateOne({ userId: alvoIdLimpo, groupId: chatId }, { $set: { roles: ["Tripulante"], inventory: [] } });
                    textoSucesso = "📜 Patentes e Inventário limpos.";
                    break;

                case 'tudo':
                    // Limpeza completa do alvo
                    await User.updateMany({ groupId: chatId }, { $pull: { family: { userId: alvoIdLimpo } } });
                    const uTudo = await User.findOne({ userId: alvoIdLimpo, groupId: chatId });
                    if (uTudo && uTudo.marriedWith) {
                        await User.updateOne({ userId: uTudo.marriedWith, groupId: chatId }, { $set: { marriedWith: null } });
                    }
                    await User.updateOne({ userId: alvoIdLimpo, groupId: chatId }, { 
                        $set: { coins: 0, xp: 0, level: 1, roles: ["Tripulante"], inventory: [], marriedWith: null, family: [], advs: 0 } 
                    });
                    textoSucesso = "🧹 Protocolo de limpeza TOTAL aplicado.";
                    break;

                default:
                    return await msg.reply("⚠️ Opção inválida.");
            }

            // 5. Mensagem de Confirmação
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