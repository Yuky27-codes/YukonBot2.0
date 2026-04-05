module.exports = {
    name: 'f',
    aliases: ['figu'], // Se o seu carregador já suportar aliases, isso aqui resolve ambos!
    async execute(client, msg, { chatId }) {
        try {
            let messageWithMedia = null;

            // 1. Identifica onde está a mídia (na própria mensagem ou na citada)
            if (msg.hasMedia) {
                messageWithMedia = msg;
            } else if (msg.hasQuotedMsg) {
                const quoted = await msg.getQuotedMessage();
                if (quoted.hasMedia) messageWithMedia = quoted;
            }

            if (!messageWithMedia) {
                return await client.sendMessage(chatId, "❗ Envie ou responda uma imagem/vídeo para eu transformar em figurinha.", { sendSeen: false });
            }

            // 2. Download da mídia dos servidores do WhatsApp
            const media = await messageWithMedia.downloadMedia();
            if (!media) return;

            // 3. Envio como Sticker com metadados da Yukon
            await client.sendMessage(chatId, media, {
                sendMediaAsSticker: true,
                stickerName: "YukonBot ❄️",
                stickerAuthor: "yukyDev",
                sendSeen: false,
                unsafe_ignore_parameters: true 
            }).catch(async (err) => {
                console.error("⚠️ Falha na conversão:", err.message);
                await client.sendMessage(chatId, "❄️ *SISTEMA YUKON:* O setor de figurinhas encontrou uma instabilidade. Tente uma imagem diferente ou menor.", { sendSeen: false });
            });

        } catch (e) {
            console.error("❌ Erro Sticker:", e.message);
        }
    }
};