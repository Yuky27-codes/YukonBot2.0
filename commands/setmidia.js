const fs = require('fs');
const path = require('path');

// Pasta onde ficam os arquivos de mídia (assets/), na raiz do projeto —
// ajuste esse caminho se a estrutura de pastas da Yukon for diferente.
const PASTA_ASSETS = path.resolve(__dirname, '..', 'assets');

const TAMANHO_MAXIMO = 15 * 1024 * 1024; // 15MB — limite seguro pra mídia de assets
const TEMPO_EXPIRACAO = 2 * 60 * 1000; // 2 minutos pra confirmar

// Sessões pendentes de confirmação, por quem pediu (persiste em memória
// enquanto o processo estiver rodando, igual aos outros sistemas de sessão da Yukon)
const sessoesSetMidia = new Map();

module.exports = {
    name: 'setmidia',
    async execute(client, msg, { chatId, senderRaw, args, isAdmin }) {
        try {
            if (!isAdmin) {
                return msg.reply("❌ Você não tem permissão para usar este comando.");
            }

            const autorId = String(senderRaw).trim();
            const subcomando = args[0]?.toLowerCase();

            // --- CONFIRMAÇÃO: /setmidia sim | /setmidia não ---
            if (subcomando === 'sim' || subcomando === 'não' || subcomando === 'nao') {
                const pendente = sessoesSetMidia.get(autorId);

                if (!pendente) {
                    return msg.reply("⚠️ Não há nenhuma troca de mídia pendente de confirmação.\n_Envie a mídia com `/setmidia [nome_do_arquivo]` primeiro._");
                }

                if (subcomando === 'sim') {
                    try {
                        fs.writeFileSync(pendente.caminhoDestino, pendente.buffer);
                    } catch (e) {
                        console.error("❌ [SETMIDIA] Erro ao gravar arquivo:", e);
                        sessoesSetMidia.delete(autorId);
                        return msg.reply("❌ Não consegui gravar o arquivo. Verifique os logs.");
                    }

                    sessoesSetMidia.delete(autorId);
                    return await client.sendMessage(chatId, `✅ *ARQUIVO SUBSTITUÍDO*\n\n📁 \`${pendente.nomeArquivo}\` foi atualizado com sucesso!`);
                } else {
                    sessoesSetMidia.delete(autorId);
                    return await client.sendMessage(chatId, `🚫 Substituição de \`${pendente.nomeArquivo}\` cancelada. Nada foi alterado.`);
                }
            }

            // --- PEDIDO DE TROCA: /setmidia [nome_do_arquivo] (com mídia anexada) ---
            const nomeArquivoArg = args[0];
            if (!nomeArquivoArg) {
                return msg.reply("❗ Use: */setmidia [nome_do_arquivo]* enviando a mídia nova junto (como legenda) ou respondendo a ela.\n_Exemplo: envie o vídeo com a legenda `/setmidia beijar.mp4`_");
            }

            // 🔒 Sanitização — impede path traversal (ex: /setmidia ../../index.js)
            const nomeArquivo = path.basename(nomeArquivoArg);
            const caminhoDestino = path.resolve(PASTA_ASSETS, nomeArquivo);

            if (!caminhoDestino.startsWith(PASTA_ASSETS + path.sep)) {
                return msg.reply("❌ Nome de arquivo inválido.");
            }

            if (!fs.existsSync(caminhoDestino)) {
                return msg.reply(`❌ O arquivo \`${nomeArquivo}\` não existe na pasta de mídias.\n_Esse comando só troca o conteúdo de arquivos que já existem — não cria novos._`);
            }

            // Pega a mídia: anexada direto na mensagem, ou na mensagem respondida
            let midiaMsg = msg;
            if (!msg.hasMedia && msg.hasQuotedMsg) {
                const quoted = await msg.getQuotedMessage();
                if (quoted.hasMedia) midiaMsg = quoted;
            }

            if (!midiaMsg.hasMedia) {
                return msg.reply("❗ Você precisa anexar a mídia (imagem/vídeo) junto com o comando, ou responder a uma mensagem que tenha mídia.");
            }

            const media = await midiaMsg.downloadMedia();
            if (!media || !media.data) {
                return msg.reply("❌ Não consegui baixar essa mídia. Tente novamente.");
            }

            const buffer = Buffer.from(media.data, 'base64');

            if (buffer.length > TAMANHO_MAXIMO) {
                return msg.reply(`❌ Arquivo muito grande (${(buffer.length / 1024 / 1024).toFixed(1)}MB). Limite: 15MB.`);
            }

            // Guarda a sessão pendente e agenda a expiração automática
            const timer = setTimeout(() => {
                if (sessoesSetMidia.has(autorId)) {
                    sessoesSetMidia.delete(autorId);
                    client.sendMessage(chatId, `⏰ A confirmação de troca de \`${nomeArquivo}\` expirou. Nada foi alterado.`).catch(() => {});
                }
            }, TEMPO_EXPIRACAO);

            sessoesSetMidia.set(autorId, { nomeArquivo, caminhoDestino, buffer, timer });

            return await client.sendMessage(chatId, `⚠️ *CONFIRMAÇÃO NECESSÁRIA*\n\nVocê quer substituir o arquivo \`${nomeArquivo}\` por essa nova mídia?\n_O nome do arquivo não será alterado._\n\n👉 Responda com */setmidia sim* ou */setmidia não*\n⏳ Essa confirmação expira em 2 minutos.`);

        } catch (e) {
            console.error("❌ Erro no /setmidia:", e);
            await msg.reply("⚠️ Erro ao processar a troca de mídia.");
        }
    }
};