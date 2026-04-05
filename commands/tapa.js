const path = require('path');
const fs = require('fs');

module.exports = {
    name: 'tapa',
    async execute(client, msg, { chatId, senderRaw, MessageMedia }) {
        try {
            const mencoes = msg.mentionedIds;
            const alvoRaw = mencoes.length > 0 ? (mencoes[0]._serialized || mencoes[0]) : null;

            if (!alvoRaw) return await client.sendMessage(chatId, "👤 *SISTEMA:* Mencione quem vai levar o tapa!");
            
            const autorId = String(senderRaw).trim();
            const alvoId = String(alvoRaw).trim();

            const texto = `🖐️ | @${autorId.split('@')[0]} deu um tapa em @${alvoId.split('@')[0]}!`;
            const caminho = path.resolve(__dirname, '..', 'assets', 'tapa.mp4');

            if (fs.existsSync(caminho)) {
                await client.sendMessage(chatId, MessageMedia.fromFilePath(caminho), {
                    caption: texto,
                    mentions: [autorId, alvoId],
                    sendVideoAsGif: true
                });
            } else {
                await client.sendMessage(chatId, texto, { mentions: [autorId, alvoId] });
            }
        } catch (e) { console.error(e); }
    }
};