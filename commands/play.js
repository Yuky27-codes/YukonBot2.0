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

            // Monta o agent com cookies no formato correto do @distube/ytdl-core
            const cookiePath = path.resolve(__dirname, '..', 'cookies.txt');
            let agent = undefined;

            if (fs.existsSync(cookiePath)) {
                try {
                    const raw = fs.readFileSync(cookiePath, 'utf8');
                    const cookies = [];

                    for (const linha of raw.split('\n')) {
                        if (linha.startsWith('#') || !linha.trim()) continue;
                        const cols = linha.split('\t');
                        if (cols.length < 7) continue;
                        cookies.push({
                            domain:   cols[0].replace(/^\./, ''),
                            path:     cols[2],
                            secure:   cols[3] === 'TRUE',
                            expires:  parseInt(cols[4]) || 0,
                            name:     cols[5].trim(),
                            value:    cols[6].trim(),
                            httpOnly: false,
                            sameSite: 'None'
                        });
                    }

                    if (cookies.length > 0) {
                        agent = ytdl.createAgent(cookies);
                        console.log(`✅ [PLAY] ${cookies.length} cookies carregados.`);
                    }
                } catch (e) {
                    console.error("⚠️ Erro ao ler cookies.txt:", e.message);
                }
            } else {
                console.warn("⚠️ [PLAY] cookies.txt não encontrado em:", cookiePath);
            }

            const ytdlOptions = {
                filter: 'audioonly',
                quality: 'lowestaudio',
                highWaterMark: 1 << 25,
                ...(agent ? { agent } : {})
            };

            const stream = ytdl(url, ytdlOptions);
            const fileStream = fs.createWriteStream(tempFile);
            stream.pipe(fileStream);

            stream.on('error', async (err) => {
                console.error("❌ Erro no Stream:", err.message);
                limparTemp();
                await client.sendMessage(chatId, `❌ Erro no YouTube: ${err.message}`);
            });

            fileStream.on('finish', async () => {
                try {
                    const media = MessageMedia.fromFilePath(tempFile);
                    await User.updateOne({ userId: autorId, groupId: chatId }, { $inc: { coins: -custoMusica } });
                    await client.sendMessage(chatId, media, {
                        sendAudioAsVoice: true,
                        caption: `🎵 *${title}*\n⏱️ ${timestamp}\n💰 -${custoMusica} YC`
                    });
                } catch (err) {
                    console.error("❌ Erro ao enviar áudio:", err.message);
                    await client.sendMessage(chatId, "❌ Erro ao enviar o áudio.");
                } finally {
                    limparTemp();
                }
            });

        } catch (e) {
            console.error("❌ Erro no Play:", e.message);
            limparTemp();
            await client.sendMessage(chatId, `❌ Falha: ${e.message}`);
        }
    }
};