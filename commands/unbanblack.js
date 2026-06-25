module.exports = {
    name: 'unbanblack',
    async execute(client, msg, { args, chatId, isAdmin, User }) {
        if (!isAdmin) return; 

        try {
            let targetUnban;

            if (msg.hasQuotedMsg) {
                const quoted = await msg.getQuotedMessage();
                targetUnban = (quoted.author || quoted.from).toString();
            } else if (msg.mentionedIds && msg.mentionedIds.length > 0) {
                targetUnban = (msg.mentionedIds[0]._serialized || msg.mentionedIds[0]).toString();
            } else if (args.length > 0) {
                const cleanNum = args[0].replace(/\D/g, '');
                if (cleanNum.length >= 8) { 
                    targetUnban = `${cleanNum}@c.us`;
                }
            }

            if (!targetUnban) {
                return await client.sendMessage(chatId, "❗ Forneça o alvo para remoção da Blacklist.", { sendSeen: false });
            }

            const targetStr = String(targetUnban).trim();

            const update = await User.findOneAndUpdate(
                { userId: targetStr, groupId: chatId },
                { $set: { isBlacklisted: false }, $unset: { blacklistReason: "" } }, // Remove o motivo também para limpar o banco
                { new: true }
            );

            if (update) {
                const msgSucesso = `✅ *ACESSO REESCRITO* ✅
━━━━━━━━━━━━━━━━━━━━━
O tripulante @${targetStr.split('@')[0]} recebeu perdão oficial. Suas credenciais foram limpas e o acesso à estação está autorizado novamente.
━━━━━━━━━━━━━━━━━━━━━`;

                await client.sendMessage(chatId, msgSucesso, {
                    mentions: [targetStr],
                    sendSeen: false
                });
            } else {
                await client.sendMessage(chatId, "⚠️ Usuário não possuía restrições ativas.", { sendSeen: false });
            }

        } catch (e) {
            console.error("❌ ERRO NO UNBANBLACK:", e.message);
        }
    }
};