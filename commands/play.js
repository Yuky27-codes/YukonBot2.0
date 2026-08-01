const yts = require('yt-search');
const { MessageMedia } = require('whatsapp-web.js');
const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');

module.exports = {
    name: 'play',
    async execute(client, msg, { chatId, args, User, senderRaw }) {
        if (!args.length) return await client.sendMessage(chatId, "❓ *COMO USAR:* `/play nome da música`");

        const query = args.join(' ');
        const autorId = String(senderRaw).trim();

        const user = await User.findOne({ userId: autorId, groupId: chatId });
        const custoMusica = 100;

        if (!user || user.coins < custoMusica) {
            return await client.sendMessage(chatId, `⚠️ *SALDO INSUFICIENTE:* Sintonizar a rádio custa *${custoMusica} YC*.`);
        }

        await client.sendMessage(chatId, `🔍 *YUKON RÁDIO:* Buscando "${query}"...`);

        const tempDir = path.resolve(__dirname, '..', 'temp');
        const tempFile = path.resolve(tempDir, `${Date.now()}.mp3`);
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

        const limparTemp = () => {
            try { if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile); } catch {}
        };

        try {
            const r = await yts(query);
            const video = r.videos[0];

            if (!video) return await client.sendMessage(chatId, "❌ Nenhuma frequência encontrada.");
            if (video.seconds > 600) return await client.sendMessage(chatId, "⏳ Limite de 10 minutos.");

            const { title, timestamp, url } = video;

            // Usando uma API de conversão pública e estável para burlar o bloqueio de bot do YouTube
            const apiUrl = `https://api.siputzx.my.id/api/d/youtube?url=${encodeURIComponent(url)}`;
            
            await client.sendMessage(chatId, `📥 *YUKON RÁDIO:* Baixando "${title}"...`);

            const response = await axios.get(apiUrl);
            const resData = response.data;

            let audioDownloadUrl = null;
            if (resData && resData.status && resData.data && resData.data.dl) {
                audioDownloadUrl = resData.data.dl;
            } else if (resData && resData.dl) {
                audioDownloadUrl = resData.dl;
            }

            if (!audioDownloadUrl) {
                // Tenta uma rota alternativa caso a primeira falhe
                const altApi = `https://deliriusapi-oficial.vercel.app/download/ytdl?url=${encodeURIComponent(url)}`;
                const altRes = await axios.get(altApi);
                if (altRes.data && altRes.data.data && altRes.data.data.audio) {
                    audioDownloadUrl = altRes.data.data.audio;
                }
            }

            if (!audioDownloadUrl) {
                limparTemp();
                return await client.sendMessage(chatId, "❌ Erro: O YouTube bloqueou a extração desta faixa no momento.");
            }

            // Baixa o arquivo de áudio para a pasta temp
            const audioStream = await axios({
                method: 'get',
                url: audioDownloadUrl,
                responseType: 'stream'
            });

            const writer = fs.createWriteStream(tempFile);
            audioStream.data.pipe(writer);

            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });

            const media = MessageMedia.fromFilePath(tempFile);
            await User.updateOne({ userId: autorId, groupId: chatId }, { $inc: { coins: -custoMusica } });
            
            await client.sendMessage(chatId, media, {
                sendAudioAsVoice: true,
                caption: `🎵 *${title}*\n⏱️ ${timestamp}\n💰 -${custoMusica} YC`
            });

            limparTemp();

        } catch (e) {
            console.error("❌ Erro no Play:", e.message);
            limparTemp();
            await client.sendMessage(chatId, `❌ Falha ao processar a música: ${e.message}`);
        }
    }
};