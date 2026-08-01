const { MessageMedia } = require('whatsapp-web.js');
const path = require('path');
const fs = require('fs');
const Groq = require('groq-sdk');
const mongoose = require('mongoose');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const CHANCE_RESPOSTA_ALEATORIA = 0.05; 

module.exports = {
    name: 'yukonChat',
    async execute(client, msg) {
        if (msg.fromMe || msg.body.startsWith('/')) return;

        const chatId = msg.from;
        const ehGrupo = chatId.endsWith('@g.us');
        if (!ehGrupo) return; // Responde apenas em grupos por essa rota

        const meuNumero = client.info.wid._serialized;
        const foiMarcado = msg.mentionedIds && msg.mentionedIds.includes(meuNumero);
        const deveResponderAleatorio = Math.random() < CHANCE_RESPOSTA_ALEATORIA;

        if (!foiMarcado && !deveResponderAleatorio) return;

        try {
            const chat = await msg.getChat();
            await chat.sendStateTyping();

            // 🔍 BUSCA A PERSONALIDADE CONFIGURADA PARA ESTE GRUPO ESPECÍFICO
            const GroupConfig = mongoose.model('AuthorizedGroup'); // Use o model correto do seu projeto
            const configGrupo = await GroupConfig.findOne({ groupId: chatId });

            // Prompt padrão caso o grupo não tenha configurado nada ainda
            const promptSistema = configGrupo?.personalidade || "Você é a Yukon, uma inteligência artificial espacial, amigável e descolada que participa de um grupo de WhatsApp como membra.";

            let textoMensagem = msg.body.replace(new RegExp(`@${meuNumero.split('@')[0]}`, 'g'), '').trim();
            if (!textoMensagem) textoMensagem = "Opa!";

            const completion = await groq.chat.completions.create({
                model: "llama-3.3-70b-versatile",
                messages: [
                    { role: "system", content: promptSistema },
                    { role: "user", content: textoMensagem }
                ],
                temperature: 0.85,
                max_tokens: 150,
            });

            const respostaIA = completion.choices[0]?.message?.content || "Sinal instável por aqui... 🛰️";
            await msg.reply(respostaIA);

            // Envio opcional de figurinha do pack
            if (Math.random() < 0.4) {
                const pastaStickers = path.resolve(__dirname, '..', 'stickers');
                if (fs.existsSync(pastaStickers)) {
                    const figurinhas = fs.readdirSync(pastaStickers).filter(file => file.endsWith('.webp') || file.endsWith('.png'));
                    if (figurinhas.length > 0) {
                        const figAleatoria = figurinhas[Math.floor(Math.random() * figurinhas.length)];
                        const mediaSticker = MessageMedia.fromFilePath(path.resolve(pastaStickers, figAleatoria));
                        setTimeout(async () => {
                            await client.sendMessage(chatId, mediaSticker, { sendMediaAsSticker: true });
                        }, 1500);
                    }
                }
            }

        } catch (err) {
            console.error("❌ Erro no yukonChat:", err);
        }
    }
};