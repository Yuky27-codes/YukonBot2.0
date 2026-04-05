module.exports = {
    name: 'addcoins',
    aliases: ['givecoins', 'adicionarmonedas'],
    async execute(client, msg, { args, chatId, isAdmin, User }) {
        // 1. Trava de segurança: Só Administradores da Yukon podem gerar moedas
        if (!isAdmin) return;

        try {
            let targetId = null;
            let quantidade = 0;

            // 2. Lógica para identificar o alvo e a quantidade
            if (msg.hasQuotedMsg) {
                // Se responder a uma mensagem: /addcoins 100
                const quoted = await msg.getQuotedMessage();
                targetId = (quoted.author || quoted.from).split('@')[0] + '@lid';
                quantidade = parseInt(args[0]);
            } 
            else if (msg.mentionedIds && msg.mentionedIds.length > 0) {
                // Se marcar alguém: /addcoins @usuario 100
                targetId = msg.mentionedIds[0].split('@')[0] + '@lid';
                quantidade = parseInt(args[1]);
            } 
            else if (args.length >= 2) {
                // Se digitar o número: /addcoins 552199999999 100
                const numLimpo = args[0].replace(/\D/g, '');
                targetId = numLimpo + '@lid';
                quantidade = parseInt(args[1]);
            }

            // 3. Validações básicas
            if (!targetId || isNaN(quantidade)) {
                const helpMsg = `⚠️ *ERRO DE FORMATO - TESOURARIA*
━━━━━━━━━━━━━━━━━━━━━
Use um dos formatos abaixo:
🔹 Resposta: */addcoins 500*
🔹 Menção: */addcoins @user 500*
🔹 Número: */addcoins 55219... 500*
━━━━━━━━━━━━━━━━━━━━━`;
                return await client.sendMessage(chatId, helpMsg, { sendSeen: false });
            }

            // 4. Atualização Atômica no MongoDB
            // O { upsert: true } garante que se o usuário for novo, ele seja criado agora
            const userUpdate = await User.findOneAndUpdate(
                { userId: targetId, groupId: chatId },
                { $inc: { coins: quantidade } }, 
                { upsert: true, new: true } // 'new: true' retorna o documento pós-update
            );

            // 5. Feedback Visual
            // Criamos um ID compatível com menções (@c.us) para o WhatsApp marcar corretamente
            const mentionId = targetId.split('@')[0] + '@c.us';
            
            const msgSucesso = `💰 *TESOURARIA YUKON STATION* 💰
━━━━━━━━━━━━━━━━━━━━━
💵 *Depósito Confirmado:*
Tripulante: @${targetId.split('@')[0]}
Quantia: *${quantidade.toLocaleString()}* YukonCoins

📊 *Saldo Atualizado:* ${userUpdate.coins.toLocaleString()} YC
━━━━━━━━━━━━━━━━━━━━━
_Protocolo de emissão monetária concluído._`;

            await client.sendMessage(chatId, msgSucesso, { 
                mentions: [mentionId],
                sendSeen: false 
            });

        } catch (e) {
            console.error("❌ ERRO NO ADDCOINS:", e.message);
            await client.sendMessage(chatId, "⚠️ Falha crítica ao acessar o cofre central da Yukon.");
        }
    }
};