module.exports = {
    name: 'resetar',
    async execute(client, msg, { args, chatId, isAdmin, User }) {
        // 1. Bloqueio de Segurança: Apenas Administradores
        if (!isAdmin) return;

        try {
            let alvoIdLimpo = null;

            // 2. Extração Identitária (Prioridade: Resposta > Marcação > Número)
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

            // 3. Menu de Ajuda (Caso falte o alvo ou a opção)
            if (!alvoIdLimpo || args.length < 1) {
                const menuAjuda = `⚙️ *CENTRAL DE RESET YUKON*
━━━━━━━━━━━━━━━━━━━━━
Use: */resetar @pessoa [opção]*
Ou: */resetar [número] [opção]*

🔹 *Opções disponíveis:*
• *civil:* Reseta casamento (ambos os lados)
• *moedas:* Zera a carteira de YukonCoins
• *nivel:* Reseta Nível e XP para o 1
• *cargos:* Retorna para 'Tripulante'
• *tudo:* Apaga todos os registros acima
━━━━━━━━━━━━━━━━━━━━━`;
                return await client.sendMessage(chatId, menuAjuda);
            }

            // 4. Definição da lógica de Reset
            const escolhaReset = args[args.length - 1].toLowerCase();
            let queryUpdate = {};
            let textoSucesso = "";

            switch (escolhaReset) {
                case 'civil':
                    const userCiv = await User.findOne({ userId: alvoIdLimpo, groupId: chatId });
                    if (userCiv && userCiv.marriedWith) {
                        await User.updateOne({ userId: userCiv.marriedWith, groupId: chatId }, { $set: { marriedWith: null } });
                    }
                    queryUpdate = { marriedWith: null };
                    textoSucesso = "💔 Status Civil resetado (Ambos os lados).";
                    break;

                case 'moedas':
                    queryUpdate = { coins: 0 };
                    textoSucesso = "💰 Carteira de moedas zerada.";
                    break;

                case 'nivel':
                    queryUpdate = { xp: 0, level: 1 };
                    textoSucesso = "📉 Nível e XP resetados (Voltou ao 1).";
                    break;

                case 'cargos':
                    queryUpdate = { roles: ["Tripulante"] };
                    textoSucesso = "📜 Cargos resetados para 'Tripulante'.";
                    break;

                case 'tudo':
                    const uTudo = await User.findOne({ userId: alvoIdLimpo, groupId: chatId });
                    if (uTudo && uTudo.marriedWith) {
                        await User.updateOne({ userId: uTudo.marriedWith, groupId: chatId }, { $set: { marriedWith: null } });
                    }
                    queryUpdate = { coins: 0, xp: 0, level: 1, roles: ["Tripulante"], marriedWith: null, advs: 0 };
                    textoSucesso = "🧹 Protocolo de limpeza TOTAL aplicado.";
                    break;

                default:
                    return await client.sendMessage(chatId, "⚠️ Opção inválida! Escolha entre: *civil, moedas, nivel, cargos* ou *tudo*.");
            }

            // 5. Execução no Banco de Dados
            await User.updateOne({ userId: alvoIdLimpo, groupId: chatId }, { $set: queryUpdate }, { upsert: true });

            await client.sendMessage(chatId, `✅ *SUCESSO:* @${alvoIdLimpo.split('@')[0]} teve seus dados alterados.\n${textoSucesso}`, { 
                mentions: [alvoIdLimpo] 
            });

        } catch (err) {
            console.error("❌ ERRO NO RESET:", err.message);
            await client.sendMessage(chatId, "⚠️ Falha crítica ao tentar resetar dados no sistema central.");
        }
    }
};