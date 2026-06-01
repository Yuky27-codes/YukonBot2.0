module.exports = {
    name: 'addconf',
    async execute(client, msg, { chatId, isGroupAdmins, Modo }) {
        if (!isGroupAdmins) {
            return await msg.reply("❌ Apenas oficiais (ADMs) podem adicionar configurações.");
        }

        const corpoMensagem = msg.body;
        const textoSemComando = corpoMensagem.replace(/^\/\w+\s*/, '');

        if (!textoSemComando.includes('|')) {
            return await msg.reply("❓ *COMO USAR:*\n`/addconf [número do modo] | configurações`\n\n_Exemplo:_\n`/addconf 1 | Velocidade: 1.5x\nImpostores: 2\nTarefas: 5 curtas`");
        }

        const partes = textoSemComando.split('|');
        const numeroModo = parseInt(partes[0].trim());
        const configuracoes = partes.slice(1).join('|').trim();

        if (isNaN(numeroModo) || numeroModo <= 0) {
            return await msg.reply("❌ Informe o número do modo!\n_Exemplo: /addconf 1 | Velocidade: 1.5x_");
        }

        if (!configuracoes) {
            return await msg.reply("❌ As configurações não podem estar vazias!");
        }

        try {
            const lista = await Modo.find({ groupId: chatId });
            const modoEscolhido = lista[numeroModo - 1];

            if (!modoEscolhido) {
                return await msg.reply(`❌ Modo número *${numeroModo}* não encontrado!\nUse */modos* para ver a lista.`);
            }

            await Modo.updateOne(
                { _id: modoEscolhido._id },
                { $set: { configuracoes: configuracoes } }
            );

            await msg.reply(`✅ *CONFIGURAÇÕES SALVAS*\n\nModo: *${modoEscolhido.nome}*\n\n⚙️ *Configurações:*\n${configuracoes}`);

        } catch (e) {
            console.error("❌ Erro no /addconf:", e);
            await msg.reply("❌ Erro ao salvar configurações.");
        }
    }
};