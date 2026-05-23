const sessoesQuiz = require('./quiz_sessoes');

module.exports = {
    name: 'quiz',
    async execute(client, msg, { chatId, senderRaw, groq }) {
        try {
            const autorId = String(senderRaw).trim();

            if (sessoesQuiz.has(chatId)) {
                const sessao = sessoesQuiz.get(chatId);
                return await client.sendMessage(chatId, `⚠️ Já há um quiz em andamento!\n\n❓ *${sessao.pergunta}*\n\n👉 Responda com */resp [sua resposta]*`);
            }

            await msg.react('⚙️');

            const completion = await groq.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: `Você é um gerador de perguntas de quiz para um bot do WhatsApp chamado YukonBot.
Gere UMA pergunta de conhecimentos gerais interessante e variada (pode ser sobre ciência, história, geografia, cultura pop, esportes, etc).
Responda APENAS em JSON puro, sem markdown, sem explicações, no formato:
{"pergunta": "texto da pergunta aqui?", "resposta": "resposta correta aqui"}
A resposta deve ser curta (1 a 3 palavras quando possível).`
                    },
                    {
                        role: "user",
                        content: "Gere uma pergunta de quiz aleatória agora."
                    }
                ],
                model: "llama-3.3-70b-versatile",
                temperature: 0.9,
                max_tokens: 200
            });

            const raw = completion.choices[0]?.message?.content?.trim();
            if (!raw) throw new Error("Resposta vazia da IA");

            let dados;
            try {
                dados = JSON.parse(raw.replace(/```json|```/g, '').trim());
            } catch {
                throw new Error("IA retornou formato inválido");
            }

            const { pergunta, resposta } = dados;
            if (!pergunta || !resposta) throw new Error("Campos ausentes no JSON");

            // Timer de 60 segundos
            const timer = setTimeout(async () => {
                if (sessoesQuiz.has(chatId)) {
                    sessoesQuiz.delete(chatId);
                    await client.sendMessage(chatId, `⏰ *TEMPO ESGOTADO!*\n\nNinguém acertou.\n✅ A resposta era: *${resposta}*`);
                }
            }, 60000);

            sessoesQuiz.set(chatId, {
                pergunta,
                resposta: resposta.toLowerCase().trim(),
                timer
            });

            await msg.react('✅');
            await client.sendMessage(chatId, `🧠 *QUIZ YUKON*
━━━━━━━━━━━━━━━━━━━━━
❓ *${pergunta}*

⏳ Você tem *60 segundos* para responder!
💰 Prêmio: *500 YC*

👉 Responda com: */resp [sua resposta]*
━━━━━━━━━━━━━━━━━━━━━`);

        } catch (e) {
            console.error("❌ Erro no /quiz:", e);
            await msg.react('❌');
            await client.sendMessage(chatId, "⚠️ Erro ao gerar pergunta. Tente novamente.");
        }
    }
};