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

            const numerosEmoji = ['1️⃣', '2️⃣', '3️⃣'];

            // 2. Monta a lista, com os motivos, e prepara as menções
            advertidos.forEach((u) => {
                const userIdStr = String(u.userId).trim(); 
                const numeroExibicao = userIdStr.split('@')[0];

                listaMsg += `👤 @${numeroExibicao} ➔ *${u.advs}/3*\n`;

                // O contador "advs" reseta pra 0 quando a pessoa é ejetada, mas o
                // "advHistory" continua crescendo pra sempre (histórico completo).
                // Então as advertências ATIVAS de cada pessoa são sempre as últimas
                // "advs" entradas do histórico — pegamos só essas pra exibir aqui.
                const historico = Array.isArray(u.advHistory) ? u.advHistory : [];
                const ativas = historico.slice(-u.advs);

                if (ativas.length > 0) {
                    ativas.forEach((h, i) => {
                        const numero = numerosEmoji[i] || `${i + 1}.`;
                        const motivo = h?.motivo || 'Motivo não especificado';
                        listaMsg += `   ${numero} ${motivo}\n`;
                    });
                } else {
                    listaMsg += `   _Motivo não registrado_\n`;
                }

                listaMsg += "\n";
                targets.push(userIdStr);
            });

            listaMsg += "_Fique atento às regras da tripulação!_ 🛰️";

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