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

        // ✅ CORRIGIDO: removida variável 'avisando' que nunca era usada
        await msg.reply(`🔍 *YUKON RÁDIO:* Buscando "${query}" nos arquivos estelares...`);

        const tempDir = path.resolve(__dirname, '..', 'temp');
        const tempFile = path.resolve(tempDir, `${Date.now()}.mp3`);

        // Garante pasta temp
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

        // Função auxiliar para limpar o arquivo temp com segurança
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

            const stream = ytdl(url, {
                filter: 'audioonly',
                quality: 'lowestaudio',
                highWaterMark: 1 << 25
            });

            const fileStream = fs.createWriteStream(tempFile);
            stream.pipe(fileStream);

            // ✅ CORRIGIDO: limparTemp() chamado em TODOS os caminhos de erro
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
                    // ✅ CORRIGIDO: limpa o temp mesmo se o envio falhar
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