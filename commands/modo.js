module.exports = {
    name: 'modo',
    async execute(client, msg, { chatId, args, Modo }) {
        const index = parseInt(args[0]) - 1;
        if (isNaN(index) || index < 0) {
            return await msg.reply("❓ Informe o número do modo. Ex: `/modo 1`.");
        }

        const lista = await Modo.find({ groupId: chatId });
        const modoEscolhido = lista[index];

        if (!modoEscolhido) {
            return await msg.reply("❌ Esse modo não existe na nossa base de dados.");
        }

        // ORGANIZAÇÃO DA DESCRIÇÃO:
        // Se o texto vier "grudado", podemos tentar separar por pontos ou 
        // apenas garantir que o template string respeite os espaços.
        const descricaoFormatada = modoEscolhido.descricao
            .replace(/\. /g, '.\n\n') // Adiciona quebra de linha após pontos finais (opcional)
            .trim();

        const textoModo = `
📑 *DETALHES DO MODO:* ${modoEscolhido.nome.toUpperCase()}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚀 *DIRETRIZES:*
${descricaoFormatada}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🛰️ *YUKON STATION PROTOCOL*`.trim();

        await global.enviarMenuComFoto(msg, 'detalhe_modo.jpg', textoModo);
    }
};