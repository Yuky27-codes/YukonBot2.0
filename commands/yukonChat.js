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
            // Busca a configuração e a personalidade salva para este grupo no banco
            const GroupConfig = mongoose.model('GroupConfig');
            const configGrupo = await GroupConfig.findOne({ groupId: chatId });

            // Pega a personalidade customizada ou usa um comportamento padrão 100% humano e informal
            const personalidadeCustom = configGrupo?.personalidade;
            
            const basePersonalidade = (personalidadeCustom && personalidadeCustom !== 'padrao') 
                ? personalidadeCustom 
                : "Você é uma pessoa real participando de um grupo de WhatsApp de amigos e colegas. Seja natural, informal, digite como gente normal, use gírias leves quando couber eaja como um membro comum da turma.";

            // Força a quebra total do modo assistente e proíbe emojis
            const promptSistema = `${basePersonalidade}\n\nREGRAS ABSOLUTAS:\n1. NUNCA utilize emojis em nenhuma circunstância.\n2. NUNCA fale como assistente virtual ou robô.\n3. Responda de forma direta, curta e como um ser humano conversando no chat comum.`;

            // 1. SE FOI MARCADO: Responde obrigatoriamente
            if (foiMarcado) {
                const chat = await msg.getChat();
                await chat.sendStateTyping();

                let textoMensagem = msg.body.replace(new RegExp(`@${meuNumero.split('@')[0]}`, 'g'), '').trim();
                if (!textoMensagem) textoMensagem = "fala";

                const completion = await groq.chat.completions.create({
                    model: "llama-3.3-70b-versatile",
                    messages: [
                        { role: "system", content: promptSistema },
                        { role: "user", content: textoMensagem }
                    ],
                    temperature: 0.9,
                    max_tokens: 100,
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

            const completion = await groq.chat.completions.create({
                model: "llama-3.3-70b-versatile",
                messages: [
                    { role: "system", content: promptSistema },
                    { role: "user", content: msg.body }
                ],
                temperature: 0.9,
                max_tokens: 100,
            });

            let respostaIA = completion.choices[0]?.message?.content || "fala mano";
            respostaIA = respostaIA.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '').trim();

            await msg.reply(respostaIA);

        } catch (err) {
            console.error("❌ Erro no yukonChat:", err);
        }
    }
};