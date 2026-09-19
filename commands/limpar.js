module.exports = {
    name: 'limpar',
    async execute(client, msg, { chatId, isFuncionarioAutorizado }) {
        try {
            // 1. Verificação de Permissão — só quem está na LISTA_ADMS (acesso master) ou funcionária autorizada
            const senderRaw = msg.author || msg.from;
            const senderStr = String(senderRaw).trim();
            const listaMasters = global.LISTA_ADMS || [];

            if (!listaMasters.includes(senderStr) && !isFuncionarioAutorizado) {
                return msg.reply("❌ Apenas a equipe master da Yukon pode usar este comando.");
            }

            const API_KEY = process.env.SQUARECLOUD_API_KEY;
            const APP_ID = process.env.SQUARECLOUD_APP_ID;

            if (!API_KEY || !APP_ID) {
                console.error("❌ [LIMPAR] SQUARECLOUD_API_KEY ou SQUARECLOUD_APP_ID não configurados no .env");
                return msg.reply("⚠️ O comando não está configurado corretamente (faltam credenciais da Square Cloud). Avise o desenvolvedor.");
            }

            await msg.reply("🧹 *YUKON:* Iniciando reinicialização da nave... Isso pode levar alguns segundos. A bot pode ficar offline brevemente.");

            const resposta = await fetch(`https://api.squarecloud.app/v2/apps/${APP_ID}/restart`, {
                method: 'POST',
                headers: {
                    'Authorization': API_KEY
                }
            });

            const dados = await resposta.json().catch(() => null);

            if (!resposta.ok || dados?.status !== 'success') {
                console.error("❌ [LIMPAR] Falha na API da Square Cloud:", resposta.status, dados);

                if (resposta.status === 409) {
                    return await client.sendMessage(chatId, "⚠️ A Square Cloud recusou o reinício — a aplicação já está em processo de deploy/reinício. Tente novamente em instantes.");
                }

                return await client.sendMessage(chatId, "❌ Não consegui reiniciar a aplicação. Verifique a API Key/ID configurados ou tente novamente mais tarde.");
            }

            console.log("✅ [LIMPAR] Reinício solicitado com sucesso via API da Square Cloud.");
            // A partir daqui o processo será derrubado pela própria Square Cloud — não há garantia
            // de que essa mensagem chegue a ser enviada antes do restart efetivo.
            await client.sendMessage(chatId, "✅ *YUKON:* Reinício confirmado! Voltando em instantes com mais rapidez. 🚀").catch(() => {});

        } catch (e) {
            console.error("❌ Erro no comando /limpar:", e);
            await msg.reply("⚠️ Erro ao tentar reiniciar a aplicação.");
        }
    }
};