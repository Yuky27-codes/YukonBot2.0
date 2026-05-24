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

            const descricaoFormatada = modoEscolhido.descricao.trim();

            // Monta seção de configurações se existir
            let secaoConfigs = "";
            if (modoEscolhido.configuracoes && modoEscolhido.configuracoes.trim()) {
                secaoConfigs = `\n⚙️ *CONFIGURAÇÕES DO JOGO:*\n${modoEscolhido.configuracoes.trim()}\n`;
            }

            const textoModo = `
📑 *DETALHES DO MODO:* ${modoEscolhido.nome.toUpperCase()}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚀 *DIRETRIZES:*
${descricaoFormatada}
${secaoConfigs}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🛰️ *YUKON STATION PROTOCOL*`.trim();

            await global.enviarMenuComFoto(msg, 'detalhe_modo.jpg', textoModo);

        } catch (error) {
            console.error("Erro ao exibir detalhes do modo:", error);
            await msg.reply("❌ Ocorreu um erro ao acessar os registros do modo.");
        }
    }
};