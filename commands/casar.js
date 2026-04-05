module.exports = {
    name: 'casar',
    async execute(client, msg, { chatId, senderRaw, User }) {
        try {
            // Verifica se houve menção
            if (!msg.mentionedIds || msg.mentionedIds.length === 0) {
                return await client.sendMessage(chatId, "❗ Marque quem você quer pedir em casamento!", { sendSeen: false });
            }

            const pretendente = msg.mentionedIds[0].toString();
            const autor = senderRaw.toString();

            // Evita narcisismo extremo
            if (pretendente === autor) {
                return await client.sendMessage(chatId, "😂 Não pode casar consigo mesmo!", { sendSeen: false });
            }

            // Busca os dados de ambos no banco para verificar estado civil
            const dadosAutor = await User.findOne({ userId: autor, groupId: chatId });
            const dadosPretendente = await User.findOne({ userId: pretendente, groupId: chatId });

            if (dadosAutor?.marriedWith) {
                return await client.sendMessage(chatId, "⚠️ Você já é casado no registro desta nave!", { sendSeen: false });
            }
            
            if (dadosPretendente?.marriedWith) {
                return await client.sendMessage(chatId, "⚠️ Esta pessoa já possui um compromisso registrado!", { sendSeen: false });
            }

            // Formatação do pedido
            const autorNum = autor.split('@')[0];
            const pretendenteNum = pretendente.split('@')[0];

            const msgPedido = `💍 *PEDIDO DE UNIÃO ESTELAR* 💍
━━━━━━━━━━━━━━━━━━━━━
🚀 @${autorNum} pediu @${pretendenteNum} em casamento!

⚠️ @${pretendenteNum}, para confirmar este elo, você deve *RESPONDER* a esta mensagem com o comando:
👉 */aceitarp*
━━━━━━━━━━━━━━━━━━━━━`;
            
            await client.sendMessage(chatId, msgPedido, { 
                mentions: [pretendente, autor], 
                sendSeen: false 
            });

        } catch (e) { 
            console.error("❌ ERRO NO CASAR:", e.message);
            await client.sendMessage(chatId, "⚠️ Erro no cartório da Yukon Station.", { sendSeen: false });
        }
    }
};