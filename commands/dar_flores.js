const { MessageMedia } = require('whatsapp-web.js');
const path = require('path');
const fs = require('fs-extra');

module.exports = {
    name: 'dar_flores',
    async execute(client, msg, { chatId, senderRaw }) {
        try {
            const mencoes = msg.mentionedIds;
            const autorId = String(senderRaw).trim();

            if (mencoes.length === 0) {
                return await msg.reply("❓ *COMO USAR:* `/dar_flores @tripulante`\nEnvie um buquê das estufas de Yukon.");
            }

            const alvoId = String(mencoes[0]._serialized || mencoes[0]).trim();

            // Caminho exato para o seu arquivo mp4
            const caminhoVideo = path.resolve(__dirname, '..', 'assets', 'flores.mp4');

            const textoFlores = `
🌹 *GESTO DE CARINHO — YUKON* 🌹
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@${autorId.split('@')[0]} acaba de presentear @${alvoId.split('@')[0]} com um lindo buquê de flores colhidas nas estufas da estação!

✨ *"Um pouco de cor no vácuo do espaço."*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`.trim();

            if (fs.existsSync(caminhoVideo)) {
                const media = MessageMedia.fromFilePath(caminhoVideo);
                
                // Enviando como GIF (loop automático)
                await client.sendMessage(chatId, media, {
                    caption: textoFlores,
                    mentions: [autorId, alvoId],
                    sendVideoAsGif: true // Transforma o MP4 em um GIF animado no Zap
                });
            } else {
                // Caso o arquivo suma da pasta por algum motivo
                await client.sendMessage(chatId, textoFlores, { mentions: [autorId, alvoId] });
                console.error("⚠️ ERRO: assets/flores.mp4 não encontrado no diretório.");
            }

        } catch (e) {
            console.error("❌ Erro no comando dar_flores:", e.message);
            await msg.reply("❌ Falha ao colher as flores no jardim botânico.");
        }
    }
};