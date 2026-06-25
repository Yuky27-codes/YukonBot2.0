module.exports = {
    name: 'banblack',
    async execute(client, msg, { args, chatId, isAdmin, iAmAdmin, chat, User }) {
        if (!isAdmin) return; 
        if (!iAmAdmin) {
            return await client.sendMessage(chatId, "❌ *SISTEMA:* Eu preciso ser Administrador para gerenciar a Blacklist.", { sendSeen: false });
        }

        try {
            let targetBan;
            let motivo = "Não especificado";

            // 1. IDENTIFICAÇÃO DO ALVO E CAPTURA DO MOTIVO
            if (msg.hasQuotedMsg) {
                const quoted = await msg.getQuotedMessage();
                targetBan = (quoted.author || quoted.from).toString();
                // No caso de resposta, todo o "args" enviado vira o motivo
                if (args.length > 0) motivo = args.join(' ');
            } else if (msg.mentionedIds && msg.mentionedIds.length > 0) {
                targetBan = (msg.mentionedIds[0]._serialized || msg.mentionedIds[0]).toString();
                // No caso de menção, o motivo começa a partir do segundo argumento (args[1] em diante)
                if (args.length > 1) motivo = args.slice(1).join(' ');
            } else if (args.length > 0) {
                // Captura por número limpo com DDD
                const cleanNum = args[0].replace(/\D/g, '');
                if (cleanNum.length >= 8) { 
                    targetBan = `${cleanNum}@c.us`;
                    // O motivo começa a partir do segundo argumento
                    if (args.length > 1) motivo = args.slice(1).join(' ');
                }
            }

            if (!targetBan) {
                return await client.sendMessage(chatId, "❗ Marque, responda ou digite o número (com DDD) de quem deseja banir permanentemente seguido do motivo.\n\n*Ex:* `/banblack 3499999999 mensagens inapropriadas`", { sendSeen: false });
            }

            const targetStr = String(targetBan).trim();

            // 2. REGISTRO NO BANCO DE DADOS (Salva a flag e o motivo)
            await User.findOneAndUpdate(
                { userId: targetStr, groupId: chatId },
                { $set: { isBlacklisted: true, blacklistReason: motivo } },
                { upsert: true }
            );

            // 3. REMOVE DO GRUPO IMEDIATAMENTE (Se ele estiver no grupo)
            try {
                await chat.removeParticipants([targetStr]);
            } catch (err) {
                // Ignora o erro caso o usuário digitado por número já estivesse fora do grupo
            }

            // 4. CONFIRMAÇÃO VISUAL
            const msgFeedback = `🚫 *PROTOCOLO DE EXCLUSÃO COLETIVA* 🚫
━━━━━━━━━━━━━━━━━━━━━
👤 *Alvo:* @${targetStr.split('@')[0]}
💀 *Motivo:* ${motivo}

⚠️ Registro adicionado ao banco de dados da Yukon Station. O retorno deste número está permanentemente bloqueado neste setor.
━━━━━━━━━━━━━━━━━━━━━`;

            await client.sendMessage(chatId, msgFeedback, {
                mentions: [targetStr],
                sendSeen: false
            });

        } catch (e) {
            console.error("❌ ERRO NO BANBLACK:", e.message);
            await client.sendMessage(chatId, "⚠️ Erro ao processar banimento permanente.", { sendSeen: false });
        }
    }
};