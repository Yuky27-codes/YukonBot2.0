module.exports = {
    name: 'aceitard',
    async execute(client, msg, { chatId, senderRaw, User }) {
        try {
            const aceitanteId = senderRaw.toString();

            // 1. Verifica se está respondendo à mensagem do pedido
            if (!msg.hasQuotedMsg) {
                return await client.sendMessage(chatId, "❌ Você precisa *RESPONDER* à mensagem do pedido de divórcio!", { sendSeen: false });
            }

            const quotedMsg = await msg.getQuotedMessage();
            
            // 2. Extração Identitária (Baseada na ordem de menções do comando /divorciar)
            // Mentions[0] = O parceiro que precisa aceitar
            // Mentions[1] = Quem pediu o divórcio originalmente
            let parceiroAlvoId = quotedMsg.mentionedIds[0] ? 
                (quotedMsg.mentionedIds[0]._serialized || quotedMsg.mentionedIds[0]).toString() : null;
            
            let solicitanteId = quotedMsg.mentionedIds[1] ? 
                (quotedMsg.mentionedIds[1]._serialized || quotedMsg.mentionedIds[1]).toString() : null;

            // 🛑 TRAVA DE IDENTIDADE: Só o parceiro marcado pode assinar o divórcio
            if (aceitanteId !== parceiroAlvoId) {
                const alvoMencao = parceiroAlvoId ? `@${parceiroAlvoId.split('@')[0]}` : "o parceiro correto";
                return await client.sendMessage(chatId, `✋ @${aceitanteId.split('@')[0]}, você não pode assinar um divórcio que não é seu! Apenas ${alvoMencao} pode aceitar.`, {
                    mentions: [aceitanteId, parceiroAlvoId].filter(Boolean)
                });
            }

            // 3. Validação de Banco: Eles ainda estão casados um com o outro?
            const dadosAceitante = await User.findOne({ userId: aceitanteId, groupId: chatId });
            
            if (!dadosAceitante || dadosAceitante.marriedWith !== solicitanteId) {
                return await client.sendMessage(chatId, "🚫 Registro inválido: Você não possui um vínculo matrimonial ativo com essa pessoa no banco de dados da Yukon.", { sendSeen: false });
            }

            // 4. Limpeza Atômica de AMBOS (Divórcio oficializado)
            await User.updateOne({ userId: aceitanteId, groupId: chatId }, { $set: { marriedWith: null } });
            await User.updateOne({ userId: solicitanteId, groupId: chatId }, { $set: { marriedWith: null } });

            const msgFim = `📜 *DIVÓRCIO CONCLUÍDO* 📜
━━━━━━━━━━━━━━━━━━━━━
O contrato de união entre @${aceitanteId.split('@')[0]} e @${solicitanteId.split('@')[0]} foi dissolvido oficialmente.

🛰️ Status: Ambos agora estão livres para novas missões.
━━━━━━━━━━━━━━━━━━━━━`;

            await client.sendMessage(chatId, msgFim, { 
                mentions: [String(aceitanteId), String(solicitanteId)],
                sendSeen: false 
            });

        } catch (e) {
            console.error("❌ ERRO AO ACEITAR DIVORCIO:", e.message);
            await client.sendMessage(chatId, "⚠️ Erro crítico ao processar o divórcio no sistema central.", { sendSeen: false });
        }
    }
};