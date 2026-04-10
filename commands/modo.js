module.exports = {
    name: 'modo',
    async execute(client, msg, { chatId, args, Modo }) {
        const index = parseInt(args[0]) - 1;
        if (isNaN(index) || index < 0) {
            return await msg.reply("❓ Informe o número do modo. Ex: `/modo 1`.");
        }

        try {
            const lista = await Modo.find({ groupId: chatId });
            const modoEscolhido = lista[index];

            if (!modoEscolhido) {
                return await msg.reply("❌ Esse modo não existe na nossa base de dados.");
            }

            // Agora que o /addmodo salva as quebras de linha (\n), 
            // basta dar um trim() para limpar espaços inúteis no início/fim.
            const descricaoFormatada = modoEscolhido.descricao.trim();

            const textoModo = `
📑 *DETALHES DO MODO:* ${modoEscolhido.nome.toUpperCase()}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚀 *DIRETRIZES:*
${descricaoFormatada}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🛰️ *YUKON STATION PROTOCOL*`.trim();

            // Chamada da função global que já busca na pasta 'assets'
            await global.enviarMenuComFoto(msg, 'detalhe_modo.jpg', textoModo);

        } catch (error) {
            console.error("Erro ao exibir detalhes do modo:", error);
            await msg.reply("❌ Ocorreu um erro ao acessar os registros do modo.");
        }
    }
};