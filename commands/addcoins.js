module.exports = {
    name: 'addcoins',
    async execute(client, msg, { chatId, isAdmin, senderRaw, User, args }) {
        if (!isAdmin) return await msg.reply("❌ *ACESSO NEGADO:* Apenas oficiais de alta patente (ADMs) podem emitir moedas.");

        try {
            const mencoes = msg.mentionedIds;
            const autorId = String(senderRaw).trim();
            
            const valor = parseInt(args.find(arg => !arg.includes('@'))); 

            if (isNaN(valor) || valor <= 0) {
                return await msg.reply("❓ *COMO USAR:*\n• Para você: `/addcoins 5000`\n• Para outro: `/addcoins @tripulante 5000`.");
            }

            const alvoId = mencoes.length > 0 
                ? String(mencoes[0]._serialized || mencoes[0]).trim() 
                : autorId;

            const ehParaSiMesmo = (alvoId === autorId);

            const update = await User.findOneAndUpdate(
                { userId: alvoId, groupId: chatId },
                { $inc: { coins: valor } },
                { upsert: true, new: true }
            );

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