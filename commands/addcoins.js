module.exports = {
    name: 'addcoins',
    async execute(client, msg, { chatId, isAdmin, senderRaw, User, args }) {
        // --- 1. TRAVA DE SEGURANÇA (SOMENTE ADMS) ---
        if (!isAdmin) return await msg.reply("❌ *ACESSO NEGADO:* Apenas oficiais de alta patente (ADMs) podem emitir moedas.");

        try {
            const mencoes = msg.mentionedIds;
            const autorId = String(senderRaw).trim();
            
            // Procura o valor numérico nos argumentos
            const valor = parseInt(args.find(arg => !arg.includes('@'))); 

            if (isNaN(valor) || valor <= 0) {
                return await msg.reply("❓ *COMO USAR:*\n• Para você: `/addcoins 5000`\n• Para outro: `/addcoins @tripulante 5000`.");
            }

            // --- 2. DEFINIÇÃO DO DESTINATÁRIO ---
            // Se houver menção, usa o marcado. Se não, usa o próprio autor (ADM).
            const alvoId = mencoes.length > 0 
                ? String(mencoes[0]._serialized || mencoes[0]).trim() 
                : autorId;

            const ehParaSiMesmo = (alvoId === autorId);

            // --- 3. ATUALIZAÇÃO NO BANCO ---
            const update = await User.findOneAndUpdate(
                { userId: alvoId, groupId: chatId },
                { $inc: { coins: valor } },
                { upsert: true, new: true }
            );

            // --- 4. RESPOSTA PERSONALIZADA ---
            const nomeAlvo = ehParaSiMesmo ? "sua própria conta" : `@${alvoId.split('@')[0]}`;
            
            const textoSucesso = `
💰 *YUKON MINT — EMISSÃO DE CRÉDITOS*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
O Banco Central da Yukon Station injetou:
💵 *VALOR:* ${valor.toLocaleString('pt-BR')} YC
🎯 *DESTINO:* ${nomeAlvo}

✨ *NOVO SALDO:* ${update.coins.toLocaleString('pt-BR')} YC
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`.trim();

            await client.sendMessage(chatId, textoSucesso, {
                mentions: [alvoId]
            });

        } catch (e) {
            console.error("❌ Erro no addcoins:", e);
            await msg.reply("❌ Falha na comunicação com o cofre central.");
        }
    }
};