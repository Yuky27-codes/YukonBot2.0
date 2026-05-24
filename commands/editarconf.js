module.exports = {
    name: 'editarconf',
    async execute(client, msg, { chatId, isGroupAdmins, Modo }) {
        if (!isGroupAdmins) {
            return await msg.reply("❌ Apenas oficiais (ADMs) podem editar configurações.");
        }

        const corpoMensagem = msg.body;
        const textoSemComando = corpoMensagem.replace(/^\/\w+\s*/, '');

        if (!textoSemComando.includes('|')) {
            return await msg.reply("❓ *COMO USAR:*\n`/editarconf [número do modo] | novas configurações`\n\n_Exemplo:_\n`/editarconf 1 | Velocidade: 2x\nImpostores: 3`");
        }

        const partes = textoSemComando.split('|');
        const numeroModo = parseInt(partes[0].trim());
        const novasConfigs = partes.slice(1).join('|').trim();

        if (isNaN(numeroModo) || numeroModo <= 0) {
            return await msg.reply("❌ Informe o número do modo!\n_Exemplo: /editarconf 1 | Velocidade: 2x_");
        }

        if (!novasConfigs) {
            return await msg.reply("❌ As novas configurações não podem estar vazias!");
        }

        try {
            const lista = await Modo.find({ groupId: chatId });
            const modoEscolhido = lista[numeroModo - 1];

            if (!modoEscolhido) {
                return await msg.reply(`❌ Modo número *${numeroModo}* não encontrado!\nUse */modos* para ver a lista.`);
            }

            await Modo.updateOne(
                { _id: modoEscolhido._id },
                { $set: { configuracoes: novasConfigs } }
            );

            await msg.reply(`⚙️ *CONFIGURAÇÕES ATUALIZADAS*\n\nModo: *${modoEscolhido.nome}*\n\n⚙️ *Novas Configurações:*\n${novasConfigs}`);

        } catch (e) {
            console.error("❌ Erro no /editarconf:", e);
            await msg.reply("❌ Erro ao editar configurações.");
        }
    }
};