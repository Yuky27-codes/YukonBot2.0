module.exports = {
    name: 'simbolo',
    async execute(client, msg, { chatId, args, GroupConfig, isAdmin }) {
        try {
            const config = await GroupConfig.findOne({ groupId: chatId }).lean();
            const simboloAtual = config?.simbolo || null;

            // --- MENU (sem argumentos) ---
            if (!args.length) {
                // Se tem símbolo salvo, envia ele
                if (simboloAtual) {
                    return await client.sendMessage(chatId, simboloAtual, { sendSeen: false });
                }
                // Se não tem, mostra instrução
                return await client.sendMessage(chatId, `⚙️ *SÍMBOLO DO GRUPO — YUKON*\n\nNenhum símbolo definido ainda!\n\n👉 ADMs podem definir com:\n*/simbolo [símbolo desejado]*\n\n_Exemplo: /simbolo ㊐_`);
            }

            // --- APENAS ADMS PODEM DEFINIR ---
            if (!isAdmin) {
                // Se tem símbolo salvo, envia ele mesmo sem ser admin
                if (simboloAtual) {
                    return await client.sendMessage(chatId, simboloAtual, { sendSeen: false });
                }
                return await client.sendMessage(chatId, "❌ Apenas ADMs podem definir o símbolo do grupo.");
            }

            const novoSimbolo = args.join(' ').trim();

            // --- REMOVER ---
            if (novoSimbolo.toLowerCase() === 'remover') {
                await GroupConfig.updateOne(
                    { groupId: chatId },
                    { $unset: { simbolo: "" } },
                    { upsert: true }
                );
                return await client.sendMessage(chatId, "✅ *SÍMBOLO REMOVIDO* com sucesso!");
            }

            // --- SALVA O NOVO SÍMBOLO ---
            await GroupConfig.updateOne(
                { groupId: chatId },
                { $set: { simbolo: novoSimbolo } },
                { upsert: true }
            );

            await client.sendMessage(chatId, `✅ *SÍMBOLO DEFINIDO!*\n\nAgora quando qualquer membro usar */simbolo*, o bot enviará:\n\n${novoSimbolo}\n\n_Para remover: /simbolo remover_`);

        } catch (e) {
            console.error("Erro no comando simbolo:", e);
            await client.sendMessage(chatId, "⚠️ Erro ao processar o símbolo.");
        }
    }
};