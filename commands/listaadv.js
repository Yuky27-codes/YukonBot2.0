module.exports = {
    name: 'listaadv',
    async execute(client, msg, { chatId, User }) {
        try {
            // 1. Busca usuários com advertências (advs > 0) apenas no grupo atual
            // O uso do .lean() aqui deixa a busca muito mais rápida!
            const advertidos = await User.find({ 
                groupId: chatId, 
                advs: { $gt: 0 } 
            }).lean();

            if (!advertidos || advertidos.length === 0) {
                return await client.sendMessage(chatId, "✅ *YUKON:* Ninguém possui advertências neste grupo.", { sendSeen: false });
            }

            let listaMsg = "📋 *LISTA DE ADVERTÊNCIAS - YUKON*\n\n";
            let targets = [];

            // 2. Monta a lista e prepara as menções
            advertidos.forEach((u) => {
                const userIdStr = String(u.userId).trim(); 
                const numeroExibicao = userIdStr.split('@')[0];
                
                listaMsg += `• @${numeroExibicao} ➔ *${u.advs}/3*\n`;
                targets.push(userIdStr);
            });

            listaMsg += "\n_Fique atento às regras da tripulação!_ 🛰️";

            // 3. Envio com menções para os números ficarem azuis/clicáveis
            await client.sendMessage(chatId, listaMsg, { 
                mentions: targets, 
                sendSeen: false 
            });

        } catch (error) {
            console.error("❌ ERRO NO COMANDO LISTAADV:", error);
            await client.sendMessage(chatId, "⚠️ Erro interno ao processar a lista de advertências.");
        }
    }
};