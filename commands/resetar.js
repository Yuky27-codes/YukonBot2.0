module.exports = {
    name: 'resetar',
    async execute(client, msg, { args, chatId, isAdmin, User }) {
        if (!isAdmin) return;

        try {
            let alvoIdLimpo = null;

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

            if (!alvoIdLimpo || args.length < 1) {
                const menuAjuda = `⚙️ *CENTRAL DE RESET YUKON*
━━━━━━━━━━━━━━━━━━━━━
🔹 *Opções disponíveis:*
• *civil:* Reseta casamento
• *familia:* Apaga parentesco/filhos (Limpeza Total)
• *moedas:* Zera a carteira
• *nivel:* Reseta Nível e XP
• *cargos:* Retorna para 'Tripulante'
• *tudo:* Apaga todos os registros acima
━━━━━━━━━━━━━━━━━━━━━`;
                return await client.sendMessage(chatId, menuAjuda);
            }

            const escolhaReset = args[args.length - 1].toLowerCase();
            let queryUpdate = {};
            let textoSucesso = "";

            switch (escolhaReset) {
                case 'familia':
                    // 1. Remove o alvo de QUALQUER lista de família no grupo (Limpeza Global)
                    await User.updateMany(
                        { groupId: chatId },
                        { $pull: { family: { userId: alvoIdLimpo } } }
                    );
                    // 2. Reseta a própria lista de família do usuário para um array vazio
                    queryUpdate = { family: [] };
                    textoSucesso = "🧬 Linhagem e parentescos resetados globalmente.";
                    break;

                case 'civil':
                    const userCiv = await User.findOne({ userId: alvoIdLimpo, groupId: chatId });
                    if (userCiv && userCiv.marriedWith) {
                        await User.updateOne({ userId: userCiv.marriedWith, groupId: chatId }, { $set: { marriedWith: null } });
                    }
                    queryUpdate = { marriedWith: null };
                    textoSucesso = "💔 Status Civil resetado.";
                    break;

                case 'moedas':
                    queryUpdate = { coins: 0 };
                    textoSucesso = "💰 Carteira de moedas zerada.";
                    break;

                case 'nivel':
                    queryUpdate = { xp: 0, level: 1 };
                    textoSucesso = "📉 Nível e XP resetados.";
                    break;

                case 'cargos':
                    queryUpdate = { roles: ["Tripulante"], inventory: [] };
                    textoSucesso = "📜 Cargos e Inventário resetados.";
                    break;

                case 'tudo':
                    // Limpeza global de família antes do reset total
                    await User.updateMany({ groupId: chatId }, { $pull: { family: { userId: alvoIdLimpo } } });
                    
                    const uTudo = await User.findOne({ userId: alvoIdLimpo, groupId: chatId });
                    if (uTudo && uTudo.marriedWith) {
                        await User.updateOne({ userId: uTudo.marriedWith, groupId: chatId }, { $set: { marriedWith: null } });
                    }
                    queryUpdate = { 
                        coins: 0, xp: 0, level: 1, 
                        roles: ["Tripulante"], inventory: [], 
                        marriedWith: null, family: [], advs: 0 
                    };
                    textoSucesso = "🧹 Protocolo de limpeza TOTAL aplicado.";
                    break;

                default:
                    return await client.sendMessage(chatId, "⚠️ Opção inválida!");
            }

            // Executa o reset principal
            await User.updateOne({ userId: alvoIdLimpo, groupId: chatId }, { $set: queryUpdate }, { upsert: true });

            await client.sendMessage(chatId, `✅ *SUCESSO:* @${alvoIdLimpo.split('@')[0]} resetado.\n${textoSucesso}`, { 
                mentions: [alvoIdLimpo] 
            });

        } catch (err) {
            console.error("❌ ERRO NO RESET:", err.message);
            await client.sendMessage(chatId, "⚠️ Falha crítica ao resetar dados.");
        }
    }
};