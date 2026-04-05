const path = require('path');
const fs = require('fs');

module.exports = {
    name: 'chutar',
    aliases: ['tapa', 'abraçar'], // Registramos os outros nomes aqui
    async execute(client, msg, { chatId, senderRaw, command, MessageMedia }) {
        try {
            const mencoes = msg.mentionedIds;
            
            // 1. Extração do ID do Alvo
            const alvoRaw = mencoes.length > 0 ? (mencoes[0]._serialized || mencoes[0]) : null;

            if (!alvoRaw) {
                return await client.sendMessage(chatId, "👤 *SISTEMA:* Você precisa mencionar um tripulante para realizar essa ação!", { sendSeen: false });
            }
            
            const autorId = String(senderRaw).trim();
            const alvoId = String(alvoRaw).trim();

            if (alvoId === autorId) {
                return await client.sendMessage(chatId, "❓ *SISTEMA:* Você não pode realizar essa ação contra si mesmo!", { sendSeen: false });
            }

            // 2. Mapeamento de Ações
            // O 'command' aqui deve vir sem a barra (ex: 'chutar') dependendo de como seu handler limpa a string
            const acoes = {
                'chutar': { emoji: '👟', frase: 'deu um chute em', arquivo: 'chute.mp4' },
                'tapa': { emoji: '🖐️', frase: 'deu um tapa em', arquivo: 'tapa.mp4' },
                'abraçar': { emoji: '🫂', frase: 'deu um abraço apertado em', arquivo: 'mds.mp4' },
            };

            // Limpa a barra do comando caso ela venha junto
            const cmdLimpo = command.replace('/', '');
            const acaoRealizada = acoes[cmdLimpo]; 
            
            if (!acaoRealizada) return;

            const nomeAutor = autorId.split('@')[0];
            const nomeAlvo = alvoId.split('@')[0];
            const textoAcao = `${acaoRealizada.emoji} | @${nomeAutor} ${acaoRealizada.frase} @${nomeAlvo}!`;

            // 3. CARREGAMENTO DO ARQUIVO
            // Ajuste o path se seus arquivos estiverem em uma pasta específica (ex: './assets/gifs/')
            const caminhoArquivo = path.join(__dirname, 'assets', acaoRealizada.arquivo);

            if (fs.existsSync(caminhoArquivo)) {
                const media = MessageMedia.fromFilePath(caminhoArquivo);
                
                await client.sendMessage(chatId, media, {
                    caption: textoAcao,
                    mentions: [String(autorId), String(alvoId)],
                    sendVideoAsGif: true // O pulo do gato para economizar dados
                });
            } else {
                console.error(`❌ Arquivo não encontrado: ${caminhoArquivo}`);
                await client.sendMessage(chatId, textoAcao, { 
                    mentions: [String(autorId), String(alvoId)] 
                });
            }

        } catch (e) {
            console.error("❌ ERRO NA AÇÃO SOCIAL:", e.message);
            await client.sendMessage(chatId, "⚠️ Erro nos sensores de imagem da Yukon.", { sendSeen: false });
        }
    }
};
