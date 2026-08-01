const yts = require('yt-search');
const ytdl = require('@distube/ytdl-core');
const { MessageMedia } = require('whatsapp-web.js');
const fs = require('fs-extra');
const path = require('path');

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
            
            await client.sendMessage(chatId, `📥 *YUKON RÁDIO:* Baixando "${title}"...`);

            // Baixa o áudio diretamente do YouTube usando o ytdl-core (sem depender de APIs externas instáveis)
            const stream = ytdl(url, {
                quality: 'highestaudio',
                filter: 'audioonly',
                highWaterMark: 1 << 25 // Buffer de 32MB para garantir estabilidade
            });

            const writer = fs.createWriteStream(tempFile);
            stream.pipe(writer);

            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
                stream.on('error', reject);
            });

            // Desconta as moedas do usuário após o sucesso do download
            await User.updateOne({ userId: autorId, groupId: chatId }, { $inc: { coins: -custoMusica } });
            
            const media = MessageMedia.fromFilePath(tempFile);
            await client.sendMessage(chatId, media, {
                sendAudioAsVoice: true,
                caption: `🎵 *${title}*\n⏱️ ${timestamp}\n💰 -${custoMusica} YC`
            });

            limparTemp();

        } catch (e) {
            console.error("❌ Erro no Play:", e.message);
            limparTemp();
            await client.sendMessage(chatId, `❌ Falha ao processar a música. O YouTube pode estar bloqueando a conexão temporariamente.`);
        }
    }
};