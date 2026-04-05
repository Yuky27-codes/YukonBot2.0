const path = require('path');
const fs = require('fs');

module.exports = {
    name: 'chutar',
    aliases: ['tapa', 'abraçar'], 
    async execute(client, msg, { chatId, senderRaw, command, MessageMedia }) {
        try {
            const mencoes = msg.mentionedIds;
            
            const alvoRaw = mencoes.length > 0 ? (mencoes[0]._serialized || mencoes[0]) : null;

            if (!alvoRaw) {
                return await client.sendMessage(chatId, "👤 *SISTEMA:* Você precisa mencionar um tripulante!", { sendSeen: false });
            }
            
            const autorId = String(senderRaw).trim();
            const alvoId = String(alvoRaw).trim();

            if (alvoId === autorId) {
                return await client.sendMessage(chatId, "❓ *SISTEMA:* Você não pode realizar essa ação contra si mesmo!", { sendSeen: false });
            }

            // 1. MAPEAMENTO 
            const acoes = {
                'chutar': { emoji: '👟', frase: 'deu um chute em', arquivo: 'chute.mp4' },
                'tapa': { emoji: '🖐️', frase: 'deu um tapa em', arquivo: 'tapa.mp4' },
                'abraçar': { emoji: '🫂', frase: 'deu um abraço apertado em', arquivo: 'abraco.mp4' }, 
            };

            // Limpa a barra e espaços
            const cmdLimpo = command.replace('/', '').trim().toLowerCase();
            const acaoRealizada = acoes[cmdLimpo]; 
            
            if (!acaoRealizada) return;

            const nomeAutor = autorId.split('@')[0];
            const nomeAlvo = alvoId.split('@')[0];
            const textoAcao = `${acaoRealizada.emoji} | @${nomeAutor} ${acaoRealizada.frase} @${nomeAlvo}!`;

            // 2. CAMINHO ABSOLUTO (Garante que o Node ache a pasta assets)
            const caminhoArquivo = path.resolve(__dirname, '..', 'assets', acaoRealizada.arquivo);

            // LOG DE DEBUG (Aparecerá no seu terminal para você conferir o caminho)
            console.log(`🚀 Tentando carregar: ${caminhoArquivo}`);

            if (fs.existsSync(caminhoArquivo)) {
                const media = MessageMedia.fromFilePath(caminhoArquivo);
                
                await client.sendMessage(chatId, media, {
                    caption: textoAcao,
                    mentions: [String(autorId), String(alvoId)],
                    sendVideoAsGif: true 
                });
            } else {
                console.error(`❌ Arquivo não encontrado no disco: ${caminhoArquivo}`);
                // Manda só o texto se o arquivo falhar
                await client.sendMessage(chatId, textoAcao, { 
                    mentions: [String(autorId), String(alvoId)] 
                });
            }

        } catch (e) {
            console.error("❌ ERRO NA AÇÃO SOCIAL:", e.message);
        }
    }
};