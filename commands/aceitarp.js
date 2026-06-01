module.exports = {
    name: 'aceitarp',
    async execute(client, msg, { chatId, senderRaw, User }) {
        try {
            if (!msg.hasQuotedMsg) {
                return await client.sendMessage(chatId, "❌ Você precisa *RESPONDER* à mensagem do pedido!", { sendSeen: false });
            }

            const quotedMsg = await msg.getQuotedMessage();
            const aceitanteId = senderRaw.toString();

            let pretendenteOriginalId = quotedMsg.mentionedIds[0] ? 
                (quotedMsg.mentionedIds[0]._serialized || quotedMsg.mentionedIds[0]).toString() : null;

            let autorDoPedidoId = quotedMsg.mentionedIds[1] ? 
                (quotedMsg.mentionedIds[1]._serialized || quotedMsg.mentionedIds[1]).toString() : null;

            if (!pretendenteOriginalId || aceitanteId !== pretendenteOriginalId) {
                const targetMencion = pretendenteOriginalId ? `@${pretendenteOriginalId.split('@')[0]}` : "o destinatário correto";
                return await client.sendMessage(chatId, `✋ @${aceitanteId.split('@')[0]}, você não pode aceitar um pedido que não foi para você! Apenas ${targetMencion} pode aceitar.`, {
                    mentions: [aceitanteId, pretendenteOriginalId].filter(Boolean)
                });
            }

            if (!autorDoPedidoId) {
                return await client.sendMessage(chatId, "❌ Erro: Não encontrei os dados do autor do pedido original.");
            }

            await User.updateOne({ userId: aceitanteId, groupId: chatId }, { $set: { marriedWith: autorDoPedidoId } });
            await User.updateOne({ userId: autorDoPedidoId, groupId: chatId }, { $set: { marriedWith: aceitanteId } });

            const autorNum = autorDoPedidoId.split('@')[0];
            const aceitanteNum = aceitanteId.split('@')[0];

            const msgSucesso = `🎊 *UNIÃO REGISTRADA!* 🎊
━━━━━━━━━━━━━━━━━━━━━
💍 @${autorNum} e @${aceitanteNum}

Felicidades aos novos parceiros da Yukon Station! 🥂
━━━━━━━━━━━━━━━━━━━━━`;

            await client.sendMessage(chatId, msgSucesso, { 
                mentions: [autorDoPedidoId, aceitanteId], 
                sendSeen: false 
            });

        } catch (err) { 
            console.error("❌ ERRO NO ACEITARP:", err.message);
            await client.sendMessage(chatId, "⚠️ Erro ao processar o registro civil.", { sendSeen: false });
        }
    }
};