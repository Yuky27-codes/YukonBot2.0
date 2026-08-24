const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');
const youtubedl = require('yt-dlp-exec');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');

ffmpeg.setFfmpegPath(ffmpegStatic);

// Sistema simples de cooldown por usuário para evitar spam
const userCooldowns = new Map();
const COOLDOWN_TIME = 10 * 1000; // 10 segundos

module.exports = {
    async execute(client, msg, { args, chatId, senderRaw, isAdmin, MessageMedia }) {
        const query = args.join(' ').trim();

        // Etapa 1: Instrução de uso se vier vazio
        if (!query) {
            return await client.sendMessage(chatId, 
                "🎵 *Como usar o /play*\n\n" +
                "Digite o nome da música ou envie um link.\n" +
                "*Exemplo:*\n`/play The Weeknd - Blinding Lights`",
                { sendSeen: false }
            );
        }

        // Rate Limit / Cooldown
        if (!isAdmin) {
            const lastRequest = userCooldowns.get(senderRaw);
            const now = Date.now();
            if (lastRequest && now - lastRequest < COOLDOWN_TIME) {
                const remaining = Math.ceil((COOLDOWN_TIME - (now - lastRequest)) / 1000);
                return await client.sendMessage(chatId, `⏳ Aguarde ${remaining}s antes de usar o \`/play\` novamente.`, { sendSeen: false });
            }
            userCooldowns.set(senderRaw, now);
        }

        // Mensagem inicial de processamento
        const statusMsg = await client.sendMessage(chatId, 
            "🎵 *YukonBot Music*\n" +
            "🔎 *Procurando sua música...*\n" +
            "Aguarde um momento.",
            { sendSeen: false }
        );

        // Diretório temporário isolado por UUID para evitar concorrência
        const requestId = uuidv4();
        const tempDir = path.resolve(__dirname, '..', 'temp', 'play', requestId);
        await fs.ensureDir(tempDir);

        const rawOutputPath = path.join(tempDir, `source.webm`);
        const finalOutputPath = path.join(tempDir, `audio.mp3`);

        try {
            // Se não for URL, utiliza o mecanismo de busca do yt-dlp
            const searchTarget = query.startsWith('http') ? query : `ytsearch1:${query}`;

            // Executa o download usando yt-dlp-exec
            await youtubedl(searchTarget, {
                extractAudio: true,
                audioFormat: 'mp3',
                output: rawOutputPath,
                maxFilesize: '50M',
                noCheckCertificates: true,
                noWarnings: true,
                preferFreeFormats: true,
                addMetadata: true
            });

            // Como o arquivo baixado pode vir com extensão variável dependendo do formato bruto, procuramos o arquivo na pasta
            const files = await fs.readdir(tempDir);
            const downloadedFile = files.find(f => f.startsWith('source'));

            if (!downloadedFile) {
                throw new Error("AUDIO_DOWNLOAD_FAILED");
            }

            const sourceFile = path.join(tempDir, downloadedFile);

            // Atualiza status informando a conversão
            try {
                await statusMsg.edit(
                    `🎵 *YukonBot Music*\n` +
                    `⏳ *Convertendo áudio para o padrão WhatsApp...*`
                );
            } catch (e) {}

            // Conversão otimizada com FFmpeg para garantir compatibilidade e tamanho ideal
            await new Promise((resolve, reject) => {
                ffmpeg(sourceFile)
                    .audioCodec('libmp3lame')
                    .audioBitrate('128k')
                    .toFormat('mp3')
                    .on('end', resolve)
                    .on('error', reject)
                    .save(finalOutputPath);
            });

            // Verifica se o arquivo final existe
            if (!await fs.pathExists(finalOutputPath)) {
                throw new Error("CONVERSION_FAILED");
            }

            // Envio via whatsapp-web.js
            const media = MessageMedia.fromFilePath(finalOutputPath);
            const pushName = msg._data?.notifyName || senderRaw.split('@')[0];

            await client.sendMessage(chatId, media, {
                sendAudioAsVoice: false,
                caption: `🎵 *Pedido por @${pushName}*`,
                mentions: [senderRaw]
            });

            // Limpeza bem-sucedida do diretório temporário
            await fs.remove(tempDir);

            // Tenta remover a mensagem de status
            try { await statusMsg.delete(); } catch (e) {}

        } catch (error) {
            console.error(`[PLAY ERROR]`, error);
            await fs.remove(tempDir).catch(() => {});
            
            try {
                await statusMsg.edit("❌ Não consegui encontrar ou processar essa música. Tente pesquisar novamente usando outro nome ou envie um link válido.");
            } catch (e) {
                await client.sendMessage(chatId, "❌ Não consegui encontrar ou processar essa música. Tente pesquisar novamente usando outro nome ou envie um link válido.", { sendSeen: false });
            }
        }
    }
};