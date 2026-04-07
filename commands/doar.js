module.exports = {
    name: 'doar',
    async execute(client, msg, { chatId, senderRaw, User, args }) {
        try {
            const mencoes = msg.mentionedIds;
            const autorId = String(senderRaw).trim();
            
            // --- 1. VALIDAÇÃO DE ARGUMENTOS ---
            // Esperamos: /doar [valor] @pessoa
            if (args.length < 2 || mencoes.length === 0) {
                return await msg.reply("❓ *COMO USAR:* `/doar 1000 @tripulante`\nTransfira seus YukonCoins para outro membro da estação.");
            }

            const valorDoacao = parseInt(args[0]);
            const alvoId = String(mencoes[0]._serialized || mencoes[0]).trim();

            if (isNaN(valorDoacao) || valorDoacao <= 0) {
                return await msg.reply("❌ *SISTEMA:* Informe um valor numérico válido e maior que zero.");
            }

            if (alvoId === autorId) {
                return await msg.reply("❓ Você não pode enviar moedas para o seu próprio cofre.");
            }

            // --- 2. BUSCA NO BANCO ---
            const autorData = await User.findOne({ userId: autorId, groupId: chatId });
            const alvoData = await User.findOne({ userId: alvoId, groupId: chatId });

            if (!autorData || autorData.coins < valorDoacao) {
                return await msg.reply(`⚠️ *SALDO INSUFICIENTE:* Você possui apenas *${autorData ? autorData.coins : 0}* YukonCoins.`);
            }

            if (!alvoData) {
                return await msg.reply("❌ *ERRO:* O destinatário não foi encontrado nos registros da Yukon.");
            }

            // --- 3. EXECUÇÃO DA TRANSFERÊNCIA ---
            // Remove do autor
            await User.updateOne(
                { userId: autorId, groupId: chatId },
                { $inc: { coins: -valorDoacao } }
            );

            // Adiciona ao alvo
            await User.updateOne(
                { userId: alvoId, groupId: chatId },
                { $inc: { coins: valorDoacao } }
            );

            // --- 4. CONFIRMAÇÃO ---
            const textoSucesso = `
💸 *TRANSFERÊNCIA CONCLUÍDA!*
━━━━━━━━━━━━━━━━━━━━━
📤 *DE:* @${autorId.split('@')[0]}
📥 *PARA:* @${alvoId.split('@')[0]}
💰 *VALOR:* ${valorDoacao.toLocaleString('pt-BR')} YC

*A transação foi registrada nos logs da Yukon Station.*
━━━━━━━━━━━━━━━━━━━━━`.trim();

            await client.sendMessage(chatId, textoSucesso, { 
                mentions: [autorId, alvoId] 
            });

        } catch (e) {
            console.error("❌ Erro no comando doar:", e);
            await msg.reply("❌ Houve um erro processar a transferência galáctica.");
        }
    }
};