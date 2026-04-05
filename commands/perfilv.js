module.exports = {
    name: 'perfilv',
    aliases: ['pv', 'inspect'], // Atalhos para agilizar a vigilância
    async execute(client, msg, { args, chatId, isAdmin, User }) {
        // 1. Bloqueio de Segurança: Apenas Oficiais (Admins)
        if (!isAdmin) return;

        try {
            let idAlvoV = null;

            // 2. Lógica de Identificação (Resposta > Marcação > Número)
            if (msg.hasQuotedMsg) {
                const quoted = await msg.getQuotedMessage();
                idAlvoV = (quoted.author || quoted.from).toString();
            } 
            else if (msg.mentionedIds && msg.mentionedIds.length > 0) {
                idAlvoV = (msg.mentionedIds[0]._serialized || msg.mentionedIds[0]).toString();
            } 
            else if (args.length >= 1) {
                const numDig = args[0].replace(/\D/g, '');
                if (numDig.length >= 10) idAlvoV = `${numDig}@c.us`;
            }

            if (!idAlvoV) {
                return await client.sendMessage(chatId, "🛰️ *SISTEMA:* Alvo não identificado. Marque alguém, responda a uma mensagem ou digite o número com DDD.");
            }

            // 3. Busca de Dados no Banco
            const dadosV = await User.findOne({ userId: idAlvoV, groupId: chatId }).lean();

            if (!dadosV) {
                return await client.sendMessage(chatId, "⚠️ *ERRO:* Nenhum registro estelar encontrado para este ID neste setor.");
            }

            // 4. Formatação do Relatório de Inteligência
            const statusCivil = dadosV.marriedWith ? `@${dadosV.marriedWith.split('@')[0]}` : "Solteiro(a)";
            
            let msgV = `📡 *RELATÓRIO DE MONITORAMENTO - YUKON* 📡\n`;
            msgV += `━━━━━━━━━━━━━━━━━━━━━\n`;
            msgV += `👤 *Tripulante:* @${idAlvoV.split('@')[0]}\n`;
            msgV += `🎖️ *Nível:* ${dadosV.level || 1}\n`;
            msgV += `📊 *XP:* [${dadosV.xp || 0}/100]\n`;
            msgV += `💰 *Moedas:* ${dadosV.coins || 0} YC\n`;
            msgV += `🎭 *Cargos:* ${(dadosV.roles && dadosV.roles.length) ? dadosV.roles.join(', ') : 'Tripulante'}\n`;
            msgV += `💍 *União:* ${statusCivil}\n`;
            msgV += `━━━━━━━━━━━━━━━━━━━━━\n`;
            msgV += `📜 *STATUS DISCIPLINAR:*\n`;
            msgV += `⚠️ *ADVs:* ${dadosV.advs || 0}\n`;
            msgV += `🔇 *Mutado:* ${dadosV.isMuted ? '✅ Sim' : '❌ Não'}\n`;
            msgV += `🚫 *Blacklist:* ${dadosV.isBlacklisted ? '✅ Sim' : '❌ Não'}\n`;
            msgV += `━━━━━━━━━━━━━━━━━━━━━\n`;
            msgV += `❄️ *Yukon Intelligence Service*`;

            // 5. Envio com menções para o tripulante e o cônjuge (se houver)
            const mentions = [idAlvoV];
            if (dadosV.marriedWith) mentions.push(dadosV.marriedWith);

            await client.sendMessage(chatId, msgV, { 
                mentions: mentions.filter(Boolean),
                sendSeen: false 
            });

        } catch (err) {
            console.error("❌ ERRO NO PERFILV:", err.message);
            await client.sendMessage(chatId, "⚠️ Falha nos sistemas de vigilância ao acessar banco de dados.");
        }
    }
};
