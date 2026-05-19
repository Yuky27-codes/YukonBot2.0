const yts = require('yt-search');
const ytdl = require('@distube/ytdl-core');
const { MessageMedia } = require('whatsapp-web.js');
const fs = require('fs-extra');
const path = require('path');

module.exports = {
    name: 'play',
    async execute(client, msg, { chatId, args, User, senderRaw }) {
        if (!args.length) return await msg.reply("❓ *COMO USAR:* `/play nome da música`\nBusque e toque qualquer frequência na Yukon Rádio.");

        const query = args.join(' ');
        const autorId = String(senderRaw).trim();

        const user = await User.findOne({ userId: autorId, groupId: chatId });
        const custoMusica = 100;

        if (!user || user.coins < custoMusica) {
            return await msg.reply(`⚠️ *SALDO INSUFICIENTE:* Sintonizar a rádio custa *${custoMusica} YC*.`);
        }

        await msg.reply(`🔍 *YUKON RÁDIO:* Buscando "${query}" nos arquivos estelares...`);

        const tempDir = path.resolve(__dirname, '..', 'temp');
        const tempFile = path.resolve(tempDir, `${Date.now()}.mp3`);

        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

        const limparTemp = () => {
            try { if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile); } catch {}
        };

        try {
            const r = await yts(query);
            const video = r.videos[0];

            if (!video) return await msg.reply("❌ *ERRO:* Nenhuma frequência encontrada.");

            if (video.seconds > 600) {
                return await msg.reply("⏳ *LIMITE:* A Yukon Rádio só transmite faixas de até 10 minutos.");
            }

            const { title, timestamp, url } = video;

            // Lê cookies.txt no novo formato aceito pelo @distube/ytdl-core
            // O arquivo deve estar na raiz do projeto (junto do index.js)
            const cookiePath = path.resolve(__dirname, '..', 'cookies.txt');
            const ytdlOptions = {
                filter: 'audioonly',
                quality: 'lowestaudio',
                highWaterMark: 1 << 25,
                agent: undefined
            };

            // Novo formato de cookies exigido pelo @distube/ytdl-core
            if (fs.existsSync(cookiePath)) {
                try {
                    const linhas = fs.readFileSync(cookiePath, 'utf8').split('\n');
                    const cookies = linhas
                        .filter(l => !l.startsWith('#') && l.trim().length > 0)
                        .map(l => {
                            const p = l.split('\t');
                            if (p.length >= 7) {
                                return { name: p[5].trim(), value: p[6].trim() };
                            }
                            return null;
                        })
                        .filter(Boolean);

                    if (cookies.length > 0) {
                        ytdlOptions.agent = ytdl.createAgent(cookies);
                    }
                } catch (e) {
                    console.error("Erro ao ler cookies.txt:", e.message);
                }
            }

            const stream = ytdl(url, ytdlOptions);
            const fileStream = fs.createWriteStream(tempFile);
            stream.pipe(fileStream);

            stream.on('error', async (err) => {
                console.error("Erro no Stream:", err);
                limparTemp();
                await msg.reply("❌ A frequência do YouTube está instável. Tente novamente.");
            });

            fileStream.on('finish', async () => {
                try {
                    const media = MessageMedia.fromFilePath(tempFile);
                    await User.updateOne({ userId: autorId, groupId: chatId }, { $inc: { coins: -custoMusica } });
                    await client.sendMessage(chatId, media, {
                        sendAudioAsVoice: true,
                        caption: `🎵 *TOCANDO AGORA:* ${title}\n⏱️ *DURAÇÃO:* ${timestamp}\n💰 *CUSTO:* ${custoMusica} YC\n\n📡 *SINTONIA YUKON STATION*`
                    });
                } catch (err) {
                    console.error("Erro ao enviar:", err);
                    await msg.reply("❌ Erro ao converter a transmissão.");
                } finally {
                    limparTemp();
                }
            });

        } catch (e) {
            console.error("Erro no Play:", e);
            limparTemp();
            await msg.reply("❌ Falha na conexão com o satélite de áudio.");
        }
    }
};