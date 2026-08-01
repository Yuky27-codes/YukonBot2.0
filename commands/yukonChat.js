const { MessageMedia } = require('whatsapp-web.js');
const path = require('path');
const fs = require('fs');
const Groq = require('groq-sdk');
const mongoose = require('mongoose');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const CHANCE_RESPOSTA_ALEATORIA = 0.50; // 50% de chance de responder mensagens soltas

module.exports = {
    name: 'yukonChat',
    async execute(client, msg) {
        if (msg.fromMe || msg.body.startsWith('/')) return;

        const chatId = msg.from;
        const ehGrupo = chatId.endsWith('@g.us');
        if (!ehGrupo) return; // Funciona apenas em grupos

        const meuNumero = client.info.wid._serialized;
        const textoLimpo = msg.body.trim().toLowerCase();
        const foiMarcado = msg.mentionedIds && msg.mentionedIds.includes(meuNumero);

        try {
            // 1. SE FOI MARCADO: Responde obrigatoriamente com a IA usando a personalidade do grupo
            if (foiMarcado) {
                const chat = await msg.getChat();
                await chat.sendStateTyping();

                const GroupConfig = mongoose.model('GroupConfig');
                const configGrupo = await GroupConfig.findOne({ groupId: chatId });

                const promptBase = configGrupo?.personalidade || "Você é uma pessoa real participando de um grupo de WhatsApp. Seja natural, informal, digite como gente normal e NUNCA utilize emojis em nenhuma circunstância.";
                const promptSistema = `${promptBase}\n\nIMPORTANTE: Escreva apenas texto puro como um ser humano conversando no chat. Proibido o uso de qualquer emoji.`;

                let textoMensagem = msg.body.replace(new RegExp(`@${meuNumero.split('@')[0]}`, 'g'), '').trim();
                if (!textoMensagem) textoMensagem = "Opa";

                const completion = await groq.chat.completions.create({
                    model: "llama-3.3-70b-versatile",
                    messages: [
                        { role: "system", content: promptSistema },
                        { role: "user", content: textoMensagem }
                    ],
                    temperature: 0.9,
                    max_tokens: 120,
                });

                let respostaIA = completion.choices[0]?.message?.content || "fala mano";
                respostaIA = respostaIA.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '').trim();

                return await msg.reply(respostaIA);
            }

            // 2. REGRAS DE SAUDAÇÃO EXATA (Somente se for mensagem solta e exata)
            if (!msg.hasQuotedMsg) {
                const saudacoes = ['bom dia', 'boa tarde', 'boa noite'];
                if (saudacoes.includes(textoLimpo)) {
                    const contato = await msg.getContact();
                    const respostaSaudacao = `${textoLimpo.charAt(0).toUpperCase() + textoLimpo.slice(1)}, @${contato.id.user}! Tudo bem por aí?`;
                    return await msg.reply(respostaSaudacao, chatId, { mentions: [contato.id._serialized] });
                }
            }

            // 3. CHANCE DE 50% PARA MENSAGENS SOLTAS COMUNS
            const deveResponderAleatorio = Math.random() < CHANCE_RESPOSTA_ALEATORIA;
            if (!deveResponderAleatorio) return;

            const chat = await msg.getChat();
            await chat.sendStateTyping();

            const GroupConfig = mongoose.model('GroupConfig');
            const configGrupo = await GroupConfig.findOne({ groupId: chatId });

            const promptBase = configGrupo?.personalidade || "Você é uma pessoa real participando de um grupo de WhatsApp. Seja natural, informal, digite como gente normal e NUNCA utilize emojis em nenhuma circunstância.";
            const promptSistema = `${promptBase}\n\nIMPORTANTE: Escreva apenas texto puro como um ser humano conversando no chat. Proibido o uso de qualquer emoji.`;

            const completion = await groq.chat.completions.create({
                model: "llama-3.3-70b-versatile",
                messages: [
                    { role: "system", content: promptSistema },
                    { role: "user", content: msg.body }
                ],
                temperature: 0.9,
                max_tokens: 120,
            });

            let respostaIA = completion.choices[0]?.message?.content || "fala mano";
            respostaIA = respostaIA.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '').trim();

            await msg.reply(respostaIA);

        } catch (err) {
            console.error("❌ Erro no yukonChat:", err);
        }
    }
};