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

            // Pega a personalidade customizada ou define um fallback padrão feminino e informal
            const personalidadeCustom = configGrupo?.personalidade;
            
            const basePersonalidade = (personalidadeCustom && personalidadeCustom !== 'padrao') 
                ? personalidadeCustom 
                : "Você é a Yukon, uma garota participando de um grupo de WhatsApp de amigos. Você digita igual uma pessoa real no celular, usando abreviações (vc, tbm, pq, pra), gírias atuais e tom totalmente informal.";

            // Força diretrizes absolutas para cortar qualquer tom de robô/atendente
            const promptSistema = `${basePersonalidade}\n\nDIRETRIZES OBRIGATÓRIAS:\n1. Você é uma MULHER/GAROTA (use concordância feminina se referindo a si mesma se necessário).\n2. Escreva casualmente com abreviações de internet e gírias atuais.\n3. NUNCA use frases de assistente ou robô (como 'como posso ajudar?', 'tá tudo bem por aí?', 'estou aqui para o que precisar'). Responda igual a um membro comum conversando na resenha.`;

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
                    temperature: 0.95,
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
                    const respostaSaudacao = `salve @${contato.id.user}, blz?`;
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
                temperature: 0.95,
                max_tokens: 100,
            });

            let respostaIA = completion.choices[0]?.message?.content || "vixi";
            respostaIA = respostaIA.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '').trim();

            await msg.reply(respostaIA);

        } catch (err) {
            console.error("❌ Erro no yukonChat:", err);
        }
    }
};