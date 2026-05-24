module.exports = {
    name: 'resetconf',
    async execute(client, msg, { chatId, isGroupAdmins, args, Modo }) {
        if (!isGroupAdmins) {
            return await msg.reply("❌ Apenas oficiais (ADMs) podem resetar configurações.");
        }

        const numeroModo = parseInt(args[0]);

        if (isNaN(numeroModo) || numeroModo <= 0) {
            return await msg.reply("❓ *COMO USAR:* `/resetconf [número do modo]`\n_Exemplo: /resetconf 1_");
        }

        try {
            const lista = await Modo.find({ groupId: chatId });
            const modoEscolhido = lista[numeroModo - 1];

            if (!modoEscolhido) {
                return await msg.reply(`❌ Modo número *${numeroModo}* não encontrado!\nUse */modos* para ver a lista.`);
            }

            await Modo.updateOne(
                { _id: modoEscolhido._id },
                { $unset: { configuracoes: "" } }
            );

            await msg.reply(`🗑️ *CONFIGURAÇÕES REMOVIDAS*\n\nAs configurações do modo *${modoEscolhido.nome}* foram apagadas com sucesso.`);

        } catch (e) {
            console.error("❌ Erro no /resetconf:", e);
            await msg.reply("❌ Erro ao resetar configurações.");
        }
    }
};