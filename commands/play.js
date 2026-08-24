const path = require('path');
const fs = require('fs-extra');
const crypto = require('crypto');
const youtubedl = require('yt-dlp-exec');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');

ffmpeg.setFfmpegPath(ffmpegStatic);

// Sistema de cooldown por usuário
const userCooldowns = new Map();
const COOLDOWN_TIME = 10 * 1000; // 10 segundos

module.exports = {
    async execute(client, msg, { args, chatId, senderRaw, isAdmin, MessageMedia }) {
        const query = args.join(' ').trim();

        if (!query) {
            return await client.sendMessage(chatId, 
                "🎵 *Como usar o /play*\n\n" +
                "Digite o nome da música ou envie um link.\n" +
                "*Exemplo:*\n`/play The Weeknd - Blinding Lights`",
                { sendSeen: false }
            );
        }

        if (!isAdmin) {
            const lastRequest = userCooldowns.get(senderRaw);
            const now = Date.now();
            if (lastRequest && now - lastRequest < COOLDOWN_TIME) {
                const remaining = Math.ceil((COOLDOWN_TIME - (now - lastRequest)) / 1000);
                return await client.sendMessage(chatId, `⏳ Aguarde ${remaining}s antes de usar o \`/play\` novamente.`, { sendSeen: false });
            }
            userCooldowns.set(senderRaw, now);
        }

        const statusMsg = await client.sendMessage(chatId, 
            "🎵 *YukonBot Music*\n" +
            "🔎 *Procurando sua música...*\n" +
            "Aguarde um momento.",
            { sendSeen: false }
        );

        // Usa o crypto nativo do Node.js em vez do pacote uuid
        const requestId = crypto.randomUUID();
        const tempDir = path.resolve(__dirname, '..', 'temp', 'play', requestId);
        await fs.ensureDir(tempDir);

        const rawOutputPath = path.join(tempDir, `source.webm`);
        const finalOutputPath = path.join(tempDir, `audio.mp3`);

        try {
            const searchTarget = query.startsWith('http') ? query : `ytsearch1:${query}`;

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

            const files = await fs.readdir(tempDir);
            const downloadedFile = files.find(f => f.startsWith('source'));

            if (!downloadedFile) {
                throw new Error("AUDIO_DOWNLOAD_FAILED");
            }

            const sourceFile = path.join(tempDir, downloadedFile);

            try {
                await statusMsg.edit(
                    `🎵 *YukonBot Music*\n` +
                    `⏳ *Convertendo áudio para o padrão WhatsApp...*`
                );
            } catch (e) {}

            await new Promise((resolve, reject) => {
                ffmpeg(sourceFile)
                    .audioCodec('libmp3lame')
                    .audioBitrate('128k')
                    .toFormat('mp3')
                    .on('end', resolve)
                    .on('error', reject)
                    .save(finalOutputPath);
            });

            if (!await fs.pathExists(finalOutputPath)) {
                throw new Error("CONVERSION_FAILED");
            }

            const media = MessageMedia.fromFilePath(finalOutputPath);
            const pushName = msg._data?.notifyName || senderRaw.split('@')[0];

            await client.sendMessage(chatId, media, {
                sendAudioAsVoice: false,
                caption: `🎵 *Pedido por @${pushName}*`,
                mentions: [senderRaw]
            });

            await fs.remove(tempDir);
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