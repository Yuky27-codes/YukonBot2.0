module.exports = {
    name: 'rmvcoins',
    async execute(client, msg, { chatId, senderRaw, isAdmin, User, args }) {
        // Mantemos a trava de admin para segurança do sistema
        if (!isAdmin) return await msg.reply("❌ *ACESSO NEGADO:* Você não tem autorização para confiscar bens.");

        try {
            const mencoes = msg.mentionedIds;
            // Busca o primeiro número nos argumentos como o valor
            const valor = parseInt(args.find(arg => !isNaN(arg) && !arg.includes('@')));

            if (isNaN(valor) || valor <= 0) {
                return await msg.reply("❓ *COMO USAR:* \n`/rmvcoins @tripulante 1000` (Remover de alguém)\n`/rmvcoins 1000` (Remover de si mesmo)");
            }

            // LÓGICA DE ALVO: Se tiver menção, usa o mencionado. Se não, usa quem enviou o comando.
            const alvoId = mencoes.length > 0 
                ? String(mencoes[0]._serialized || mencoes[0]).trim() 
                : senderRaw;

            const alvoData = await User.findOne({ userId: alvoId, groupId: chatId });

            if (!alvoData) return await msg.reply("❌ *ERRO:* Tripulante não encontrado nos registros da Yukon.");

            // Impede que o saldo fique negativo (Máximo que pode tirar é o que ele tem)
            const valorFinal = Math.min(valor, alvoData.coins || 0);

            const userAtualizado = await User.findOneAndUpdate(
                { userId: alvoId, groupId: chatId },
                { $inc: { coins: -valorFinal } },
                { new: true }
            );

            const textoSucesso = `
⚖️ *AJUSTE DE CONTAS — YUKON*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📉 *VALOR REMOVIDO:* ${valorFinal.toLocaleString('pt-BR')} YC
👤 *ALVO:* @${alvoId.split('@')[0]}
💰 *SALDO ATUAL:* ${(userAtualizado.coins || 0).toLocaleString('pt-BR')} YC

✨ Registros financeiros atualizados com sucesso.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`.trim();

            await client.sendMessage(chatId, textoSucesso, {
                mentions: [alvoId]
            });

        } catch (e) {
            console.error("Erro no rmvcoins:", e);
            await msg.reply("❌ Falha crítica ao processar a remoção de moedas.");
        }
    }
};