module.exports = {
    name: 'checar',
    async execute(client, msg, { args, chatId, isAdmin, isGroupAdmins, User }) {
        // 1. Verificação de Permissão
        if (!isAdmin && !isGroupAdmins) {
            return msg.reply("❌ Acesso negado.");
        }

        try {
            // Importar o modelo de mensagens para ver a última atividade
            const mongoose = require('mongoose');
            const GroupMessage = mongoose.model('GroupMessage');

            let alvoId = null;

            // 2. Identificar o Alvo (Resposta ou Menção)
            if (msg.hasQuotedMsg) {
                const quoted = await msg.getQuotedMessage();
                alvoId = (quoted.author || quoted.from).toString();
            } else if (msg.mentionedIds.length > 0) {
                alvoId = msg.mentionedIds[0]._serialized;
            } else {
                return msg.reply("❗ Mencione ou responda a mensagem de quem você deseja monitorar.");
            }

            // 3. Coleta de Dados no Banco
            const [dadosUser, ultimaMsg] = await Promise.all([
                User.findOne({ userId: alvoId, groupId: chatId }).lean(),
                GroupMessage.findOne({ groupId: chatId, senderName: { $exists: true } /* ou use o ID se salvar */ })
                    .sort({ timestamp: -1 })
                    .lean() 
                    // Nota: Se você não salva o ID na GroupMessage, vamos buscar pela última vez que o XP subiu:
            ]);

            // Como seu Schema de mensagem atual não salva o ID do remetente, 
            // uma forma mais precisa é olhar o 'updatedAt' do User, que muda cada vez que ele ganha XP (manda msg)
            const sinalDeVida = dadosUser?.updatedAt;

            if (!dadosUser) {
                return msg.reply("⚠️ Este usuário ainda não possui registros no banco de dados da Yukon.");
            }

            // 4. Formatação de Data
            const dataAtividade = sinalDeVida 
                ? new Date(sinalDeVida).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
                : "Nenhum registro recente";

            // 5. Status de Engajamento
            let statusEngajamento = "Inativo 🌑";
            if (dadosUser.xp > 50) statusEngajamento = "Ativo 🛰️";
            if (dadosUser.xp > 500) statusEngajagemento = "Muito Ativo 🔥";

            const painelMembro = `🛰️ *MONITORAMENTO DE TRIPULANTE*
━━━━━━━━━━━━━━━━━━━━━
👤 *USUÁRIO:* @${alvoId.split('@')[0]}
📊 *STATUS:* ${statusEngajamento}

📈 *DADOS DE ATIVIDADE:*
• Nível Atual: *${dadosUser.level}*
• XP Total: *${dadosUser.xp}*
• Moedas: *${dadosUser.coins.toLocaleString('pt-BR')}*
• Advertências: *${dadosUser.advs}/3*

🕒 *ÚLTIMO SINAL DE VIDA:*
• Data/Hora: *${dataAtividade}*

🛡️ *REGISTROS CRIMINAIS:*
• Está Preso? *${dadosUser.isMuted ? "Sim ⛓️" : "Não 🟢"}*
• Na Lista Negra? *${dadosUser.isBlacklisted ? "Sim 💀" : "Não 🟢"}*

💍 *ESTADO CIVIL:*
• Casado com: *${dadosUser.marriedWith ? `@${dadosUser.marriedWith.split('@')[0]}` : "Solteiro(a)"}*
━━━━━━━━━━━━━━━━━━━━━
_Relatório individual da Yukon Station._`;

            await client.sendMessage(chatId, painelMembro, { 
                mentions: [alvoId, dadosUser.marriedWith].filter(Boolean) 
            });

        } catch (err) {
            console.error("❌ ERRO NO MONITORAR MEMBRO:", err);
            await msg.reply("⚠️ Erve ao acessar ficha técnica do tripulante.");
        }
    }
};