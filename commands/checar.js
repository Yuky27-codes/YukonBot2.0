module.exports = {
    name: 'checar',
    async execute(client, msg, { args, chatId, isAdmin, isGroupAdmins, User }) {
        // 1. Verificação de Permissão
        if (!isAdmin && !isGroupAdmins) {
            return msg.reply("❌ Acesso negado.");
        }

        try {
            let alvoId = null;

            // 2. Identificar o Alvo (Resposta ou Menção)
            if (msg.hasQuotedMsg) {
                const quoted = await msg.getQuotedMessage();
                alvoId = (quoted.author || quoted.from).toString();
            } else if (msg.mentionedIds && msg.mentionedIds.length > 0) {
                alvoId = msg.mentionedIds[0]._serialized || msg.mentionedIds[0];
            } else {
                return msg.reply("❗ Mencione ou responda a mensagem de quem você deseja monitorar.");
            }

            // 3. Coleta de Dados no Banco (Usando apenas o modelo User que é garantido)
            const dadosUser = await User.findOne({ userId: alvoId, groupId: chatId }).lean();

            if (!dadosUser) {
                return msg.reply("⚠️ Este usuário ainda não possui registros no banco de dados da Yukon.");
            }

            // 4. Formatação de Data (Last Seen)
            // O updatedAt do Mongoose grava exatamente a hora da última alteração (último XP ganho)
            const sinalDeVida = dadosUser.updatedAt;
            const dataAtividade = sinalDeVida 
                ? new Date(sinalDeVida).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
                : "Sem registros recentes";

            // 5. Status de Engajamento baseado no Nível/XP
            let statusEngajamento = "Inativo 🌑";
            if (dadosUser.xp > 10) statusEngajamento = "Em observação 🛰️";
            if (dadosUser.xp > 50) statusEngajamento = "Ativo ✅";
            if (dadosUser.level > 5) statusEngajamento = "Veterano 🔥";

            const painelMembro = `🛰️ *FICHA TÉCNICA DO TRIPULANTE*
━━━━━━━━━━━━━━━━━━━━━
👤 *USUÁRIO:* @${alvoId.split('@')[0]}
📊 *STATUS:* ${statusEngajamento}

📈 *DADOS DE ATIVIDADE:*
• Nível: *${dadosUser.level}*
• XP: *${dadosUser.xp}*
• Moedas: *${(dadosUser.coins || 0).toLocaleString('pt-BR')}*
• Advertências: *${dadosUser.advs || 0}/3*

🕒 *ÚLTIMA ATIVIDADE:*
• Data: *${dataAtividade}*

🛡️ *SITUAÇÃO:*
• Preso? *${dadosUser.isMuted ? "Sim ⛓️" : "Não 🟢"}*
• Banido? *${dadosUser.isBlacklisted ? "Sim 💀" : "Não 🟢"}*

💍 *RELACIONAMENTO:*
• Casado com: *${dadosUser.marriedWith ? `@${dadosUser.marriedWith.split('@')[0]}` : "Solteiro(a)"}*
━━━━━━━━━━━━━━━━━━━━━`;

            await client.sendMessage(chatId, painelMembro, { 
                mentions: [alvoId, dadosUser.marriedWith].filter(Boolean) 
            });

        } catch (err) {
            console.error("❌ ERRO NO CHECAR:", err);
            await msg.reply("⚠️ Erro ao acessar a ficha técnica. Verifique se o banco de dados está online.");
        }
    }
};