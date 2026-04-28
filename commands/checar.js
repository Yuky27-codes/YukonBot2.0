module.exports = {
    name: 'checar',
    async execute(client, msg, { args, chatId, isAdmin, isGroupAdmins, User }) {
        if (!isAdmin && !isGroupAdmins) return msg.reply("❌ Acesso negado.");

        try {
            let alvoId = null;
            if (msg.hasQuotedMsg) {
                const quoted = await msg.getQuotedMessage();
                alvoId = (quoted.author || quoted.from).toString();
            } else if (msg.mentionedIds && msg.mentionedIds.length > 0) {
                alvoId = msg.mentionedIds[0]._serialized || msg.mentionedIds[0];
            } else {
                return msg.reply("❗ Mencione alguém.");
            }

            const dadosUser = await User.findOne({ userId: alvoId, groupId: chatId }).lean();
            if (!dadosUser) return msg.reply("⚠️ Usuário sem registros.");

            // Usa o novo campo lastMessageAt
            const sinalDeVida = dadosUser.lastMessageAt;
            const dataAtividade = sinalDeVida 
                ? new Date(sinalDeVida).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
                : "Sem registros reais";

            // Lógica de status baseada no tempo (Opcional: Marca como fantasma se > 7 dias)
            const seteDiasEmMs = 7 * 24 * 60 * 60 * 1000;
            const ehFantasma = sinalDeVida && (Date.now() - new Date(sinalDeVida).getTime() > seteDiasEmMs);
            
            let statusEngajamento = ehFantasma ? "Fantasma 👻" : "Ativo ✅";

            const painelMembro = `🛰️ *FICHA TÉCNICA YUKON*
━━━━━━━━━━━━━━━━━━━━━
👤 *USUÁRIO:* @${alvoId.split('@')[0]}
📊 *STATUS:* ${statusEngajamento}

📈 *DADOS:*
• Nível: *${dadosUser.level}*
• Moedas: *${(dadosUser.coins || 0).toLocaleString('pt-BR')}*

🕒 *SINAL DE VIDA REAL:*
• Última Msg: *${dataAtividade}*

🛡️ *SITUAÇÃO:*
• Preso? *${dadosUser.isMuted ? "Sim ⛓️" : "Não 🟢"}*
━━━━━━━━━━━━━━━━━━━━━`;

            await client.sendMessage(chatId, painelMembro, { mentions: [alvoId] });

        } catch (err) {
            console.error(err);
            await msg.reply("⚠️ Erro ao acessar ficha.");
        }
    }
};