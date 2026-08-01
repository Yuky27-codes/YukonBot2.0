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
};const yts = require('yt-search');
const ytdl = require('@distube/ytdl-core');
const { MessageMedia } = require('whatsapp-web.js');
const fs = require('fs-extra');
const path = require('path');

// Caminho do arquivo de cookies exportado de uma conta logada do YouTube.
// Veja instruções de como gerar esse arquivo no final da resposta.
const COOKIES_PATH = path.resolve(__dirname, '..', 'database', 'yt-cookies.json');

let ytdlAgent = null;
try {
    if (fs.existsSync(COOKIES_PATH)) {
        const cookies = JSON.parse(fs.readFileSync(COOKIES_PATH, 'utf8'));
        ytdlAgent = ytdl.createAgent(cookies);
        console.log('✅ [play.js] Cookies do YouTube carregados, autenticando requisições.');
    } else {
        console.warn('⚠️ [play.js] yt-cookies.json não encontrado — requisições ao YouTube sem autenticação têm grande chance de cair no bloqueio "Sign in to confirm you\'re not a bot".');
    }
} catch (e) {
    console.error('❌ [play.js] Falha ao carregar yt-cookies.json:', e.message);
}

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
                highWaterMark: 1 << 25, // Buffer de 32MB para garantir estabilidade
                requestOptions: ytdlAgent ? { agent: ytdlAgent } : undefined
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

            const isBotBlock = /sign in to confirm|not a bot/i.test(e.message || '');
            const mensagem = isBotBlock
                ? `❌ O YouTube bloqueou a requisição por suspeita de bot. ${ytdlAgent ? 'Os cookies configurados podem ter expirado — é necessário gerar um novo yt-cookies.json.' : 'Configure um arquivo de cookies (yt-cookies.json) para autenticar as requisições — veja instruções com o desenvolvedor.'}`
                : `❌ Falha ao processar a música. O YouTube pode estar bloqueando a conexão temporariamente.`;

            await client.sendMessage(chatId, mensagem);
        }
    }
};