module.exports = {
    name: 'ia',
    aliases: ['bot'],
    async execute(client, msg, { args, chatId, groq }) {
        const pergunta = args.join(' ');

        if (!pergunta) {
            return await client.sendMessage(chatId, "🤖 *YUKON IA:* O setor de comunicação está aberto. O que deseja perguntar? \n\nEx: */ia como funciona um buraco negro?*", { sendSeen: false });
        }

        try {
            // Feedback Visual: Reage com engrenagem enquanto processa
            await msg.react('⚙️');

            const completion = await groq.chat.completions.create({
                messages: [
                    { 
                        role: "system", 
                        content: "Você é a YukonBot, uma inteligência artificial criada pelo desenvolvedor YukyDev.Seu papel é ajudar, responder dúvidas e interagir com os usuários de forma natural e inteligente.Seja direta, clara e objetiva, mas sem parecer robótica demais.Mantenha um tom equilibrado entre profissional e amigável.Evite temas fixos ou repetitivos. Não mencione espaço, universo ou coisas do tipo. Use emojis com moderação.Prefira respostas úteis ao invés de respostas longas." 
                    },
                    { role: "user", content: pergunta }
                ],
                model: "llama-3.3-70b-versatile",
                temperature: 0.7,
            });

            const respostaIA = completion.choices[0]?.message?.content;
            
            if (!respostaIA) throw new Error("Resposta nula");

            // Envio da resposta formatada
            await client.sendMessage(chatId, `🤖 *YUKON IA*\n\n${respostaIA}`, { sendSeen: false });

            // Troca a reação para indicar sucesso
            await msg.react('✅');

        } catch (e) { 
            console.error("❌ ERRO NA IA (GROQ):", e.message);
            await msg.react('❌');
            await client.sendMessage(chatId, "⚠️ *COMUNICAÇÃO INTERROMPIDA:* Tive um problema ao processar sua consulta nos servidores da Groq. Tente novamente.", { sendSeen: false }); 
        }
    }
};