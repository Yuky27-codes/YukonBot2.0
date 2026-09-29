module.exports = {
    name: 'id',
    async execute(client, msg, { chatId, User }) {
        try {
            // --- 🟢 MODO PV: mostra o próprio ID de quem está falando com a bot ---
            // Em PV não dá pra marcar/responder ninguém (só tem a pessoa e a bot na
            // conversa), então o "ID do cliente" aqui só pode ser o dela mesma.
            if (!chatId.endsWith('@g.us')) {
                const meuId = String(msg.from).trim();
                return await client.sendMessage(chatId, `🆔 *SEU ID NA YUKON* 🆔
━━━━━━━━━━━━━━━━━━━━━
👤 *Seu ID:* \`${meuId}\`

_Esse é o identificador que a Yukon usa pra te reconhecer nos grupos. Envie esse código pra administração se precisar de suporte (troca de número, transferência de plano, etc.)._
━━━━━━━━━━━━━━━━━━━━━`);
            }

            let targetId;

            // 1. Identificação do Alvo (Resposta ou Menção)
            if (msg.hasQuotedMsg) {
                const quotedMsg = await msg.getQuotedMessage();
                // author é o remetente da mensagem citada em grupos
                targetId = (quotedMsg.author || quotedMsg.from).toString(); 
            } else if (msg.mentionedIds && msg.mentionedIds.length > 0) {
                targetId = (msg.mentionedIds[0]._serialized || msg.mentionedIds[0]).toString();
            } else {
                return await client.sendMessage(chatId, "❓ *ERRO:* Marque alguém ou responda a uma mensagem para consultar o ID.");
            }

            // 2. Busca no Banco de Dados
            const targetData = await User.findOne({ userId: targetId, groupId: chatId });

            if (!targetData) {
                return await client.sendMessage(chatId, `⚠️ O tripulante @${targetId.split('@')[0]} não possui registros ativos no banco de dados da Yukon.`, { 
                    mentions: [targetId] 
                });
            }

            // 3. Formatação da "Identidade Estelar"
            const infoMsg = `🆔 *IDENTIDADE ESTELAR - YUKON* 🆔
━━━━━━━━━━━━━━━━━━━━━
👤 *User ID:* \`${targetData.userId}\`

💍 *Vínculo Matrimonial:* ${targetData.marriedWith ? `\`${targetData.marriedWith}\`` : "_Nenhum registro encontrado_"}
━━━━━━━━━━━━━━━━━━━━━
🛰️ *Status:* Dados recuperados com sucesso.`;

            await client.sendMessage(chatId, infoMsg, { mentions: [targetId] });

        } catch (e) {
            console.error("❌ ERRO NO ID:", e.message);
            await client.sendMessage(chatId, "⚠️ Falha ao acessar os arquivos de identificação.");
        }
    }
};