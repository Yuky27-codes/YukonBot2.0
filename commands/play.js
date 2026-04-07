const yts = require('yt-search');
const ytdl = require('ytdl-core');
const { MessageMedia } = require('whatsapp-web.js');
const fs = require('fs-extra');
const path = require('path');

module.exports = {
    name: 'play',
    async execute(client, msg, { chatId, args }) {
        if (!args.length) return await msg.reply("❓ *COMO USAR:* `/play nome da música`\nBusque e toque qualquer frequência na Yukon Rádio.");

        const query = args.join(' ');
        const avisando = await msg.reply(`🔍 *YUKON RÁDIO:* Buscando "${query}" nos arquivos estelares...`);

        try {
            // 1. Busca o vídeo no YouTube
            const r = await yts(query);
            const video = r.videos[0];

            if (!video) return await msg.reply("❌ *ERRO:* Nenhuma frequência encontrada para esse nome.");

            // Informações do vídeo para o log/chat
            const { title, timestamp, url, author } = video;
            
            // 2. Define o caminho temporário do arquivo
            const tempFile = path.resolve(__dirname, '..', 'temp', `${Date.now()}.mp3`);
            
            // Garante que a pasta temp existe
            if (!fs.existsSync(path.resolve(__dirname, '..', 'temp'))) {
                fs.mkdirSync(path.resolve(__dirname, '..', 'temp'));
            }

            // 3. Baixa o áudio do YouTube
            const stream = ytdl(url, { filter: 'audioonly', quality: 'highestaudio' });
            const fileStream = fs.createWriteStream(tempFile);

            stream.pipe(fileStream);

            fileStream.on('finish', async () => {
                try {
                    // 4. Converte para Media e envia
                    const media = MessageMedia.fromFilePath(tempFile);
                    
                    await client.sendMessage(chatId, media, {
                        sendAudioAsVoice: true, // Se quiser que vá como "gravado na hora"
                        caption: `🎵 *TOCANDO AGORA:* ${title}\n⏱️ *DURAÇÃO:* ${timestamp}\n📡 *FONTE:* YouTube`
                    });

                    // 5. Apaga o arquivo temporário para não encher o seu disco
                    fs.unlinkSync(tempFile);
                } catch (err) {
                    console.error("Erro ao enviar áudio:", err);
                    await msg.reply("❌ Erro ao converter a transmissão para MP3.");
                }
            });

        } catch (e) {
            console.error("Erro no Play:", e);
            await msg.reply("❌ Falha na conexão com os servidores de áudio.");
        }
    }
};