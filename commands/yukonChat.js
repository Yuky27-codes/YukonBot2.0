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

        // 1. REGRAS DE SAUDAÇÃO EXATA (Somente se não estiver respondendo ninguém)
        if (!msg.hasQuotedMsg && !foiMarcado) {
            const saudacoes = ['bom dia', 'boa tarde', 'boa noite'];
            if (saudacoes.includes(textoLimpo)) {
                const contato = await msg.getContact();
                const nomeUser = contato.pushname || "recruta";
                
                // Formata a saudação natural sem emojis
                const respostaSaudacao = `${textoLimpo.charAt(0).toUpperCase() + textoLimpo.slice(1)}, @${contato.id.user}! Tudo bem por aí?`;
                return await msg.reply(respostaSaudacao, chatId, { mentions: [contato.id._serialized] });
            }
        }

        // 2. FILTRAGEM DE CHANCE (50%) OU MENÇÃO DIRETA
        const deveResponderAleatorio = Math.random() < CHANCE_RESPOSTA_ALEATORIA;
        if (!foiMarcado && !deveResponderAleatorio) return;

        try {
            const chat = await msg.getChat();
            await chat.sendStateTyping();

            // Busca a personalidade configurada para este grupo específico
            const GroupConfig = mongoose.model('AuthorizedGroup');
            const configGrupo = await GroupConfig.findOne({ groupId: chatId });

            // Base de prompt proibindo estritamente emojis e forçando tom humano real
            const promptBase = configGrupo?.personalidade || "Você é uma pessoa real participando de um grupo de WhatsApp. Seja natural, informal, digite como gente normal e **NUNCA utilize emojis** em nenhuma circunstância.";
            
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
            
            // Garantia de segurança final contra emojis caso a IA ouse mandar
            respostaIA = respostaIA.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '').trim();

            await msg.reply(respostaIA);

        } catch (err) {
            console.error("❌ Erro no yukonChat:", err);
        }
    }
};