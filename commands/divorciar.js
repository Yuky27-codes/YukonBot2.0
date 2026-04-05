module.exports = {
    name: 'divorciar',
    async execute(client, msg, { chatId, senderRaw, User }) {
        try {
            const senderId = senderRaw.toString();

            // Busca o usuário para ver se ele realmente é casado
            const userDiv = await User.findOne({ userId: senderId, groupId: chatId });

            if (!userDiv?.marriedWith) {
                return await client.sendMessage(chatId, "🤔 Você não possui um registro de união para dissolver.", { sendSeen: false });
            }

            const conjuge = userDiv.marriedWith.toString();

            const msgDivorcio = `💔 *PEDIDO DE DIVÓRCIO* 💔
━━━━━━━━━━━━━━━━━━━━━
⚠️ @${senderId.split('@')[0]} solicitou a separação oficial.

Para confirmar a dissolução da união, @${conjuge.split('@')[0]} deve *RESPONDER* a esta mensagem com o comando:
👉 */aceitard*
━━━━━━━━━━━━━━━━━━━━━`;

            // Mantendo sua lógica: o cônjuge em [0] para o /aceitard validar
            await client.sendMessage(chatId, msgDivorcio, { 
                mentions: [String(conjuge), String(senderId)],
                sendSeen: false 
            });

        } catch (e) {
            console.error("❌ ERRO NO DIVORCIO:", e.message);
            await client.sendMessage(chatId, "⚠️ Erro nos sensores judiciários da Yukon.", { sendSeen: false });
        }
    }
};