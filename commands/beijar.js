const path = require('path');
const fs = require('fs');

module.exports = {
    name: 'beijar',
    async execute(client, msg, { chatId, senderRaw, User, MessageMedia }) {
        try {
            const mencoes = msg.mentionedIds;
            
            // 1. Identificação do Alvo
            const alvoRaw = mencoes.length > 0 ? (mencoes[0]._serialized || mencoes[0]) : null;

            if (!alvoRaw) {
                return await client.sendMessage(chatId, "👤 *SISTEMA:* Você precisa mencionar alguém para beijar!", { sendSeen: false });
            }
            
            const autorId = String(senderRaw).trim();
            const alvoId = String(alvoRaw).trim();

            if (alvoId === autorId) {
                return await client.sendMessage(chatId, "❓ *SISTEMA:* Beijar a si mesmo? A Yukon acha que você precisa de companhia...", { sendSeen: false });
            }

            // 2. Busca de dados (Performance com lean)
            const userAutor = await User.findOne({ userId: autorId, groupId: chatId }).lean();
            const userAlvo = await User.findOne({ userId: alvoId, groupId: chatId }).lean();

            const conjugeAutor = userAutor?.marriedWith || null; 
            const conjugeAlvo = userAlvo?.marriedWith || null;

            // 3. REGRA: Traição (Autor casado beijando outro que não seja seu cônjuge)
            if (conjugeAutor && String(conjugeAutor) !== alvoId) {
                const msgTraicao = `🚫 *TRAIÇÃO DETECTADA!* 🚫\n\nA Yukon não apoia traição, @${autorId.split('@')[0]}. Você é casado(a) com @${String(conjugeAutor).split('@')[0]}!`;
                return await client.sendMessage(chatId, msgTraicao, {
                    mentions: [String(autorId), String(conjugeAutor)],
                    sendSeen: false
                });
            }

            // 4. REGRA: Respeito (Alvo casado com outra pessoa)
            if (!conjugeAutor && conjugeAlvo) {
                const msgRespeito = `⚠️ Opa! @${alvoId.split('@')[0]} já tem um compromisso sério com @${String(conjugeAlvo).split('@')[0]}. Respeite o casal!`;
                return await client.sendMessage(chatId, msgRespeito, {
                    mentions: [String(alvoId), String(conjugeAlvo)],
                    sendSeen: false
                });
            }

            // 5. DEFINIÇÃO DO TEXTO (Casal vs Amigos)
            let textoBeijo = `💋 | @${autorId.split('@')[0]} deu um beijão em @${alvoId.split('@')[0]}!`;
            
            if (String(conjugeAutor) === alvoId) {
                textoBeijo = `❤️ | O casal nota 10 @${autorId.split('@')[0]} e @${alvoId.split('@')[0]} se deu um beijão apaixonado!`;
            }

            // 6. ENVIO DA MÍDIA
            // Ajuste o caminho se o arquivo estiver em uma subpasta
            const caminhoBeijo = path.join(__dirname, '..', 'beijos.mp4');

            if (fs.existsSync(caminhoBeijo)) {
                const media = MessageMedia.fromFilePath(caminhoBeijo);
                await client.sendMessage(chatId, media, {
                    caption: textoBeijo,
                    mentions: [String(autorId), String(alvoId)],
                    sendVideoAsGif: true 
                });
            } else {
                // Fallback para texto se o vídeo sumir
                await client.sendMessage(chatId, textoBeijo, { 
                    mentions: [String(autorId), String(alvoId)],
                    sendSeen: false 
                });
            }

        } catch (e) {
            console.error("❌ ERRO NO BEIJO:", e.message);
            await client.sendMessage(chatId, "⚠️ O clima esfriou... erro ao processar o beijo nos sistemas da Yukon.", { sendSeen: false });
        }
    }
};