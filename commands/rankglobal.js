module.exports = {
    name: 'rankglobal',
    aliases: ['topglobal'],
    async execute(client, msg, { chatId, User }) {
        try {
            // 1. Busca os TOP 10 globais (ordenado por coins em toda a database)
            const topGeral = await User.find({ userId: { $ne: null } })
                .sort({ coins: -1 })
                .limit(10)
                .lean();

            if (!topGeral || topGeral.length === 0) {
                return await client.sendMessage(chatId, "🌌 O universo Yukon ainda está deserto...", { sendSeen: false });
            }

            // Hierarquia de prestígio
            const ordemCargos = [
                'Lenda Estelar', 'Governador Planetário', 'Almirante de Frota', 
                'Lorde das Estrelas', 'Viajante Dimensional', 'Guardião Estelar', 
                'Elite Galáctica', 'Comandante', 'Veterano', 'Especialista', 
                'Capitão', 'Cientista', 'Impostor'
            ];

            let rankMsg = `🌌 *RANKING GLOBAL YUKON* 🌌\n`;
            rankMsg += `_Os 10 usuários mais poderosos do universo_\n`;
            rankMsg += `━━━━━━━━━━━━━━━━━━━━\n\n`;

            let mentions = [];

            topGeral.forEach((u, i) => {
                const jid = u.userId.toString();
                const medalha = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "🎖️";
                
                // Lógica de Patente Global
                let maiorCargo = "Tripulante";
                if (u.roles && Array.isArray(u.roles)) {
                    maiorCargo = ordemCargos.find(cargo => u.roles.includes(cargo)) || "Tripulante";
                }

                rankMsg += `${medalha} *${i + 1}º* | @${jid.split('@')[0]}\n`;
                rankMsg += `╰ 💰 *Coins:* ${Number(u.coins || 0).toLocaleString('pt-BR')} YC\n`;
                rankMsg += `╰ 🆙 *Level:* ${u.level || 0} | 🎖️ *${maiorCargo}*\n`;
                rankMsg += `⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯\n`;

                mentions.push(jid);
            });

            rankMsg += `🛰️ *Yukon Station — Central Intergaláctica*`;

            await client.sendMessage(chatId, rankMsg, { 
                mentions, 
                sendSeen: false 
            });

        } catch (e) {
            console.error("❌ ERRO NO RANK GLOBAL:", e);
            await client.sendMessage(chatId, "⚠️ Erro ao sintonizar o ranking galáctico.", { sendSeen: false });
        }
    }
};