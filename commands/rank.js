module.exports = {
    name: 'rank',
    aliases: ['top'],
    async execute(client, msg, { chatId, User }) {
        try {
            // 1. Busca os 10 melhores EXCLUSIVAMENTE deste grupo
            const rawTopUsers = await User.find({ 
                groupId: chatId, 
                userId: { $ne: null } 
            })
            .sort({ level: -1, xp: -1 })
            .limit(10);

            const topUsers = rawTopUsers.filter(u => u && u.userId);

            if (topUsers.length === 0) {
                return await client.sendMessage(chatId, "🚀 Setor vazio. Nenhuma atividade registrada nesta nave.", { sendSeen: false });
            }

            // Tabela de referência para definir qual cargo é mais "caro"
            const ordemCargos = [
                'Lenda Estelar', 'Governador Planetário', 'Almirante de Frota', 
                'Lorde das Estrelas', 'Viajante Dimensional', 'Guardião Estelar', 
                'Elite Galáctica', 'Comandante', 'Veterano', 'Especialista', 
                'Capitão', 'Cientista', 'Impostor'
            ];

            const groupChat = await client.getChatById(chatId);
            let rankMsg = `🏆 *RANKING DO SETOR* 🏆\n`;
            rankMsg += `🛰️ *Nave:* ${groupChat.name || "Yukon Station"}\n`;
            rankMsg += `━━━━━━━━━━━━━━━━━━\n\n`;
            
            let mentions = [];

            topUsers.forEach((u, index) => {
                const jid = u.userId.toString();
                const numero = jid.split('@')[0];
                
                let posicao = `${index + 1}º`;
                if (index === 0) posicao = "🥇";
                if (index === 1) posicao = "🥈";
                if (index === 2) posicao = "🥉";

                // Lógica do cargo mais alto (primeiro que encontrar na lista de ordemCargos)
                let cargoElite = "Tripulante";
                if (u.roles && u.roles.length > 0) {
                    cargoElite = ordemCargos.find(r => u.roles.includes(r)) || "Tripulante";
                }

                const moedas = (u.coins || 0).toLocaleString('pt-BR');

                rankMsg += `${posicao} | @${numero}\n`;
                rankMsg += `╰ ⭐ *Lvl:* ${u.level || 0} | 🎖️ *${cargoElite}*\n`;
                rankMsg += `╰ 💰 *Créditos:* ${moedas} YC\n\n`;
                
                mentions.push(jid);
            });

            rankMsg += `━━━━━━━━━━━━━━━━━━\n❄️ *Ranking exclusivo deste setor*`;

            await client.sendMessage(chatId, rankMsg, { 
                mentions, 
                sendSeen: false 
            });

        } catch (err) {
            console.error("❌ ERRO NO RANK:", err);
            await client.sendMessage(chatId, "⚠️ Falha ao acessar banco de dados do setor.", { sendSeen: false });
        }
    }
};