module.exports = {
    name: 'ship',
    async execute(client, msg, { chatId, senderRaw, User }) {
        try {
            // Verifica se alguém foi mencionado
            if (!msg.mentionedIds || msg.mentionedIds.length === 0) {
                return await client.sendMessage(chatId, "❗ *RADAR:* Marque alguém para calcular a compatibilidade estelar!", { sendSeen: false });
            }

            // Padronização de IDs: @lid para o banco e @c.us para menções visuais
            const targetRaw = msg.mentionedIds[0]._serialized || msg.mentionedIds[0];
            const loveTargetLid = targetRaw.split('@')[0] + '@lid';
            const senderLid = senderRaw.split('@')[0] + '@lid';

            if (loveTargetLid === senderLid) {
                return await client.sendMessage(chatId, "🚀 *SISTEMA:* Você tem 100% de amor próprio! Continue assim.", { sendSeen: false });
            }

            // 1. Lógica da Semente (Gera um número fixo por casal a cada 24h)
            const hoje = new Date().toDateString(); 
            const seed = senderLid + loveTargetLid + hoje; 
            let baseChance = 0;
            for (let i = 0; i < seed.length; i++) {
                baseChance = (baseChance + seed.charCodeAt(i)) % 101;
            }

            // 2. Busca o bônus de interação no banco (campo 'friends' do /amizade)
            const dataUser = await User.findOne({ userId: senderLid, groupId: chatId });
            const chaveParceiro = loveTargetLid.replace(/\D/g, '');
            
            // O bônus é metade do nível de amizade atual
            const bonusInteracao = (dataUser && dataUser.friends && dataUser.friends[chaveParceiro]) 
                ? Math.floor(dataUser.friends[chaveParceiro] / 2) 
                : 0;

            // Chance Final (Máximo 100%)
            const loveChance = Math.min(baseChance + bonusInteracao, 100);

            // Barra de progresso visual
            const cheios = Math.round(loveChance / 10);
            const barraAmor = "❤️".repeat(cheios) + "🖤".repeat(10 - cheios);

            // Tabela de Vereditos
            let veredito = "❄️ *ZERO ABSOLUTO*";
            let comentario = "Melhor ficarem em cabines separadas...";

            if (loveChance > 20) { veredito = "☁️ *PEQUENA ATRAÇÃO*"; comentario = "Talvez um café na cantina da nave?"; }
            if (loveChance > 50) { veredito = "👀 *CLIMA QUENTE*"; comentario = "Há uma tensão nos circuitos aqui!"; }
            if (loveChance > 85) { veredito = "🔥 *CONEXÃO ABSOLUTA*"; comentario = "O destino escreveu o nome de vocês nas estrelas!"; }
            if (loveChance === 100) { veredito = "👑 *ALMAS GÊMEAS*"; comentario = "Já podem usar o comando /casar!"; }

            const textoShip = `💘 *YUKON SHIP* 💘
━━━━━━━━━━━━━━━━━━
👤 @${senderLid.split('@')[0]}
❤️ @${loveTargetLid.split('@')[0]}

✨ *Chance:* ${loveChance}% 
_(${baseChance}% base + ${bonusInteracao}% bônus de conversa)_

[${barraAmor}]

📡 *Veredito:* ${veredito}
💬 ${comentario}
━━━━━━━━━━━━━━━━━━`;
        
            // Menções seguras para o front-end do WhatsApp
            const m1 = senderLid.split('@')[0] + '@c.us';
            const m2 = loveTargetLid.split('@')[0] + '@c.us';

            await client.sendMessage(chatId, textoShip, { 
                mentions: [m1, m2],
                sendSeen: false 
            });

        } catch (e) {
            console.error("❌ ERRO NO SHIP:", e.message);
            await client.sendMessage(chatId, "⚠️ Erro no sensor de batimentos cardíacos.", { sendSeen: false });
        }
    }
};