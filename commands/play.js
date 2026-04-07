const yts = require('yt-search');
const ytdl = require('@distube/ytdl-core'); // DICA: O @distube/ytdl-core costuma ser mais atualizado que o comum
const { MessageMedia } = require('whatsapp-web.js');
const fs = require('fs-extra');
const path = require('path');

module.exports = {
    name: 'play',
    async execute(client, msg, { chatId, args, User, senderRaw }) {
        if (!args.length) return await msg.reply("❓ *COMO USAR:* `/play nome da música`\nBusque e toque qualquer frequência na Yukon Rádio.");

        const query = args.join(' ');
        const autorId = String(senderRaw).trim();

        // --- ECONOMIA: Cobrar 100 YC por música (Opcional) ---
        const user = await User.findOne({ userId: autorId, groupId: chatId });
        const custoMusica = 100;

        if (!user || user.coins < custoMusica) {
            return await msg.reply(`⚠️ *SALDO INSUFICIENTE:* Sintonizar a rádio custa **${custoMusica} YC**.`);
        }

        const avisando = await msg.reply(`🔍 *YUKON RÁDIO:* Buscando "${query}" nos arquivos estelares...`);

        try {
            // 1. Busca o vídeo no YouTube
            const r = await yts(query);
            const video = r.videos[0];

            if (!video) return await msg.reply("❌ *ERRO:* Nenhuma frequência encontrada.");

            // 2. Trava de segurança para vídeos gigantes (evita travar o bot)
            if (video.seconds > 600) { // Limite de 10 minutos
                return await msg.reply("⏳ *LIMITE:* A Yukon Rádio só transmite faixas de até 10 minutos para economizar energia.");
            }

            const { title, timestamp, url, thumbnail } = video;
            const tempFile = path.resolve(__dirname, '..', 'temp', `${Date.now()}.mp3`);

            // Garante pasta temp
            if (!fs.existsSync(path.resolve(__dirname, '..', 'temp'))) {
                fs.mkdirSync(path.resolve(__dirname, '..', 'temp'));
            }

            // 3. Download do Áudio com Cookies/User-Agent (Evita bloqueios)
            const stream = ytdl(url, { 
                filter: 'audioonly', 
                quality: 'highestaudio',
                highWaterMark: 1 << 25 // Buffer de 32MB para download liso
            });

            const fileStream = fs.createWriteStream(tempFile);
            stream.pipe(fileStream);

            fileStream.on('finish', async () => {
                try {
                    const media = MessageMedia.fromFilePath(tempFile);
                    
                    // Cobra as moedas apenas se o download deu certo
                    await User.updateOne({ userId: autorId, groupId: chatId }, { $inc: { coins: -custoMusica } });

                    await client.sendMessage(chatId, media, {
                        sendAudioAsVoice: true,
                        caption: `🎵 *TOCANDO AGORA:* ${title}\n⏱️ *DURAÇÃO:* ${timestamp}\n💰 *CUSTO:* ${custoMusica} YC\n\n📡 *SINTONIA YUKON STATION*`
                    });

                    // Limpeza
                    if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
                } catch (err) {
                    console.error("Erro ao enviar:", err);
                    await msg.reply("❌ Erro ao converter a transmissão.");
                }
            });

            // Tratamento de erro no download
            stream.on('error', async (err) => {
                console.error("Erro no Stream:", err);
                await msg.reply("❌ A frequência do YouTube está instável. Tente novamente.");
                if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
            });

        } catch (e) {
            console.error("Erro no Play:", e);
            await msg.reply("❌ Falha na conexão com o satélite de áudio.");
        }
    }
};