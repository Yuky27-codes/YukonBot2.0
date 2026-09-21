module.exports = {
    name: 'amizade',
    async execute(client, msg, { chatId, senderRaw, User }) {
        try {
            // Verifica se alguém foi mencionado
            if (!msg.mentionedIds || msg.mentionedIds.length === 0) {
                return await client.sendMessage(chatId, "❗ *RADAR:* Marque um tripulante para medir a sincronia!", { sendSeen: false });
            }

            // 🛡️ Blindagem: extração segura do ID independentemente do formato recebido
            const rawMention = msg.mentionedIds[0];
            const targetRaw = (typeof rawMention === 'object' && rawMention !== null) 
                ? (rawMention._serialized || rawMention.toString()) 
                : String(rawMention);

            if (!targetRaw || !targetRaw.includes('@')) {
                return await client.sendMessage(chatId, "⚠️ Não foi possível identificar o usuário mencionado.", { sendSeen: false });
            }

            const targetAmigo = targetRaw.split('@')[0] + '@lid';
            const senderId = senderRaw.split('@')[0] + '@lid';

            if (targetAmigo === senderId) {
                return await client.sendMessage(chatId, "🎡 *SISTEMA:* Sua amizade própria é de 100%, mas tente marcar outra pessoa!", { sendSeen: false });
            }

            // Busca os dados do remetente para ver a lista de amigos dele
            const dataUser = await User.findOne({ userId: senderId, groupId: chatId });
            
            // Pega a porcentagem (usando apenas os números do ID como chave)
            const chaveAmigo = targetAmigo.replace(/\D/g, '');
            let porcentagem = (dataUser && dataUser.friends && dataUser.friends[chaveAmigo]) ? dataUser.friends[chaveAmigo] : 0;
            
            // Lógica de exibição (limite de 100%)
            const nivelFinal = Math.min(Math.floor(porcentagem), 100);

            // Barra de progresso visual
            const completas = Math.round(nivelFinal / 10);
            const barraVisual = "🟦".repeat(completas) + "⬜".repeat(10 - completas);

            // Tabela de Status
            let statusAmizade = "Desconhecidos 👤";
            if (nivelFinal > 10) statusAmizade = "Conversa Casual 💬";
            if (nivelFinal > 30) statusAmizade = "Colegas de Cabine 🤝";
            if (nivelFinal > 60) statusAmizade = "Parceiros de Missão 🚀";
            if (nivelFinal > 90) statusAmizade = "Irmãos Estelares 💎";
            if (nivelFinal === 100) statusAmizade = "Sincronia Total 🌌";

            const msgAmizade = `👥 *SINCRONIA DE AMIZADE* 👥
━━━━━━━━━━━━━━━━━━
👤 @${senderId.split('@')[0]}
🤝 @${targetAmigo.split('@')[0]}

📊 *Nível:* ${nivelFinal}%
[${barraVisual}]

🛰️ *Status:* ${statusAmizade}
━━━━━━━━━━━━━━━━━━
_Dica: Responda as mensagens um do outro para aumentar este nível!_`;
        
            // Menções formatadas para o WhatsApp reconhecer o @
            const m1 = senderId.split('@')[0] + '@c.us';
            const m2 = targetAmigo.split('@')[0] + '@c.us';

            await client.sendMessage(chatId, msgAmizade, { 
                mentions: [m1, m2],
                sendSeen: false 
            });

        } catch (e) {
            console.error("❌ ERRO NO AMIZADE:", e.message);
            await client.sendMessage(chatId, "⚠️ Erro nos sensores de afinidade.", { sendSeen: false });
        }
    }
};