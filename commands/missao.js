module.exports = {
    name: 'missão',
    aliases: ['daily', 'mis'], // Apelidos para facilitar o uso
    async execute(client, msg, { chatId, senderRaw, User }) {
        try {
            const autorId = String(senderRaw).trim();

            // 1. Busca ou Cria o usuário (Garante a existência no DB)
            let userD = await User.findOne({ userId: autorId, groupId: chatId });

            if (!userD) {
                userD = await User.create({ 
                    userId: autorId, 
                    groupId: chatId, 
                    coins: 0, 
                    lastDaily: null 
                });
            }

            const agora = new Date();
            const tempoEspera = 24 * 60 * 60 * 1000; // 24 horas

            // 2. Verificação de Cooldown (Tempo de Espera)
            if (userD.lastDaily && (agora - new Date(userD.lastDaily) < tempoEspera)) {
                const restante = tempoEspera - (agora - new Date(userD.lastDaily));
                const horas = Math.floor(restante / (1000 * 60 * 60));
                const minutos = Math.floor((restante % (1000 * 60 * 60)) / (1000 * 60));
                
                return await client.sendMessage(chatId, `⏳ *SISTEMA:* Você já coletou suas moedas hoje, @${autorId.split('@')[0]}!\n\nRetorne em: *${horas}h ${minutos}min*.`, { 
                    mentions: [autorId],
                    sendSeen: false 
                });
            }

            // 3. Cálculo de Recompensa (200 a 500 YukonCoins)
            const ganho = Math.floor(Math.random() * (500 - 200 + 1)) + 200;

            // 4. Atualização Atômica (Segurança total contra spam)
            await User.updateOne(
                { userId: autorId, groupId: chatId },
                { 
                    $inc: { coins: ganho },
                    $set: { lastDaily: agora } 
                }
            );

            // 5. Confirmação Visual
            const msgSucesso = `💰 *RECOMPENSA DE MISSÃO* 💰
━━━━━━━━━━━━━━━━━━━━━
Excelente trabalho, @${autorId.split('@')[0]}!
Você recebeu: *${ganho}* YukonCoins.

🛰️ Continue mantendo a nave em órbita!
━━━━━━━━━━━━━━━━━━━━━`;

            await client.sendMessage(chatId, msgSucesso, { 
                mentions: [autorId],
                sendSeen: false 
            });

        } catch (e) {
            console.error("❌ ERRO NA MISSÃO DIÁRIA:", e.message);
            await client.sendMessage(chatId, "⚠️ *SISTEMA:* Falha nos sensores de recompensa da Yukon. Tente novamente em órbita estável.", { sendSeen: false });
        }
    }
};