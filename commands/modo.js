module.exports = {
    name: 'modo',
    async execute(client, msg, { chatId, args, Modo }) {
        const index = parseInt(args[0]) - 1;
        if (isNaN(index)) return await msg.reply("❓ Informe o número do modo. Ex: `/modo 1`.");

        const lista = await Modo.find({ groupId: chatId });
        const modoEscolhido = lista[index];

        if (!modoEscolhido) return await msg.reply("❌ Esse modo não existe na nossa base de dados.");

        const textoModo = `
📑 *DETALHES DO MODO:* ${modoEscolhido.nome.toUpperCase()}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${modoEscolhido.descricao}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🛰️ *YUKON STATION PROTOCOL*`.trim();

        await global.enviarMenuComFoto(msg, 'detalhe_modo.jpg', textoModo);
    }
};