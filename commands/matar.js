const path = require('path');
const fs = require('fs');

module.exports = {
    name: 'matar',
    async execute(client, msg, { chatId, senderRaw, MessageMedia }) {
        try {
            const mencoes = msg.mentionedIds;
            const autorId = String(senderRaw).trim();
            const alvoRaw = mencoes.length > 0 ? (mencoes[0]._serialized || mencoes[0]) : null;

            if (!alvoRaw) return await client.sendMessage(chatId, "👤 *SISTEMA:* Mencione quem você quer eliminar!");

            const alvoId = String(alvoRaw).trim();
            if (alvoId === autorId) return await client.sendMessage(chatId, "❓ Você não pode se matar... isso seria dramático demais.");

            const texto = `💀 | @${autorId.split('@')[0]} acabou de dar um golpe fatal em @${alvoId.split('@')[0]}!`;
            const caminho = path.resolve(__dirname, '..', 'assets', 'matar.mp4');

            if (fs.existsSync(caminho)) {
                const media = MessageMedia.fromFilePath(caminho);
                await client.sendMessage(chatId, media, {
                    caption: texto,
                    mentions: [autorId, alvoId],
                    sendVideoAsGif: true
                });
            } else {
                await client.sendMessage(chatId, texto, { mentions: [autorId, alvoId] });
            }
        } catch (e) {
            console.error("❌ Erro no /matar:", e);
        }
    }
};