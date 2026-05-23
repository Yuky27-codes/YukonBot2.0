const { sessoesQuiz, sessoesQuemsoueu } = require('./quiz_sessoes_v2');

module.exports = {
    name: 'resp',
    async execute(client, msg, { chatId, senderRaw, args, User, groq }) {
        try {
            const autorId = String(senderRaw).trim();
            const resposta = args.join(' ').toLowerCase().trim();

            if (!resposta) {
                return await client.sendMessage(chatId, "❓ Digite sua resposta!\n_Exemplo: /resp Brasil_");
            }

            // --- QUIZ ATIVO ---
            if (sessoesQuiz.has(chatId)) {
                const sessao = sessoesQuiz.get(chatId);
                const respostaCorreta = sessao.resposta;

                const acertouDireto =
                    resposta === respostaCorreta ||
                    resposta.includes(respostaCorreta) ||
                    respostaCorreta.includes(resposta);

                if (acertouDireto) return await acertarQuiz(client, chatId, autorId, sessao, User);

                // Validação IA
                try {
                    const validacao = await groq.chat.completions.create({
                        messages: [
                            {
                                role: "system",
                                content: `Valide respostas de quiz. Responda APENAS com JSON: {"correto": true} ou {"correto": false}
Aceite sinônimos, variações e pequenos erros de digitação.`
                            },
                            {
                                role: "user",
                                content: `Pergunta: "${sessao.enunciado}"\nEsperado: "${respostaCorreta}"\nUsuário: "${resposta}"\nCorreto?`
                            }
                        ],
                        model: "llama-3.3-70b-versatile",
                        temperature: 0,
                        max_tokens: 20
                    });

                    const raw = validacao.choices[0]?.message?.content?.trim();
                    const resultado = JSON.parse(raw.replace(/```json|```/g, '').trim());
                    if (resultado.correto === true) return await acertarQuiz(client, chatId, autorId, sessao, User);
                } catch (e) {
                    console.error("⚠️ Validação IA falhou:", e.message);
                }

                return await client.sendMessage(chatId, `❌ @${autorId.split('@')[0]}, resposta errada! Tente novamente.`, { mentions: [autorId] });
            }

            // --- QUEM SOU EU ATIVO ---
            if (sessoesQuemsoueu.has(chatId)) {
                return await client.sendMessage(chatId, "🎭 Para o *Quem Sou Eu?* use */adivinhar [nome]*!");
            }

            return await client.sendMessage(chatId, "⚠️ Não há quiz ativo!\nUse */quiz* para iniciar um.");

        } catch (e) {
            console.error("❌ Erro no /resp:", e);
            await client.sendMessage(chatId, "⚠️ Erro ao processar resposta.");
        }
    }
};

async function acertarQuiz(client, chatId, autorId, sessao, User) {
    clearTimeout(sessao.timer);
    sessoesQuiz.delete(chatId);
    await User.updateOne({ userId: autorId, groupId: chatId }, { $inc: { coins: 500 } });
    await client.sendMessage(chatId, `🎉 *CORRETO!*
━━━━━━━━━━━━━━━━━━━━━
✅ @${autorId.split('@')[0]} acertou!
💰 *+500 YC* adicionados!
━━━━━━━━━━━━━━━━━━━━━`, { mentions: [autorId] });
}