const sessoesQuiz = require('./quiz_sessoes');

module.exports = {
    name: 'resp',
    async execute(client, msg, { chatId, senderRaw, args, User, groq }) {
        try {
            const autorId = String(senderRaw).trim();
            const resposta = args.join(' ').toLowerCase().trim();

            if (!resposta) {
                return await client.sendMessage(chatId, "❓ Digite sua resposta!\n_Exemplo: /resp Brasil_");
            }

            if (!sessoesQuiz.has(chatId)) {
                return await client.sendMessage(chatId, "⚠️ Não há quiz ativo!\nUse */quiz* para iniciar um.");
            }

            const sessao = sessoesQuiz.get(chatId);
            const respostaCorreta = sessao.resposta;

            // 1. Comparação direta (mais rápido e sem custo de API)
            const acertouDireto = resposta === respostaCorreta ||
                resposta.includes(respostaCorreta) ||
                respostaCorreta.includes(resposta);

            if (acertouDireto) {
                return await acertar(client, chatId, autorId, sessao, User);
            }

            // 2. Validação pela IA (aceita sinônimos, variações, erros de digitação leves)
            try {
                const validacao = await groq.chat.completions.create({
                    messages: [
                        {
                            role: "system",
                            content: `Você é um validador de respostas de quiz. 
Responda APENAS com JSON puro no formato: {"correto": true} ou {"correto": false}
Considere correto se a resposta do usuário for semanticamente equivalente à resposta esperada, mesmo com pequenos erros de digitação ou sinônimos.`
                        },
                        {
                            role: "user",
                            content: `Pergunta: "${sessao.pergunta}"
Resposta esperada: "${respostaCorreta}"
Resposta do usuário: "${resposta}"
Esta resposta está correta?`
                        }
                    ],
                    model: "llama-3.3-70b-versatile",
                    temperature: 0,
                    max_tokens: 20
                });

                const rawValidacao = validacao.choices[0]?.message?.content?.trim();
                const resultado = JSON.parse(rawValidacao.replace(/```json|```/g, '').trim());

                if (resultado.correto === true) {
                    return await acertar(client, chatId, autorId, sessao, User);
                }
            } catch (e) {
                console.error("⚠️ Erro na validação IA:", e.message);
                // Se a IA falhar na validação, cai no "errado" silenciosamente
            }

            // Resposta errada
            return await client.sendMessage(chatId, `❌ @${autorId.split('@')[0]}, resposta errada! Tente novamente.`, { mentions: [autorId] });

        } catch (e) {
            console.error("❌ Erro no /resp:", e);
            await client.sendMessage(chatId, "⚠️ Erro ao processar resposta.");
        }
    }
};

async function acertar(client, chatId, autorId, sessao, User) {
    clearTimeout(sessao.timer);
    sessoesQuiz.delete(chatId);

    await User.updateOne(
        { userId: autorId, groupId: chatId },
        { $inc: { coins: 500 } }
    );

    await client.sendMessage(chatId, `🎉 *CORRETO!*
━━━━━━━━━━━━━━━━━━━━━
✅ @${autorId.split('@')[0]} acertou!
💰 *+500 YC* adicionados!
━━━━━━━━━━━━━━━━━━━━━`, { mentions: [autorId] });
}