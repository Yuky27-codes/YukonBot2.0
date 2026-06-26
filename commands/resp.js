const { sessoesQuiz, sessoesQuemsoueu } = require('./quiz_sessoes_v2'); //

module.exports = {
    name: 'resp',
    async execute(client, msg, { chatId, senderRaw, args, User, groq }) { //
        try {
            const autorId = String(senderRaw).trim(); //[cite: 6]
            const resposta = args.join(' ').toLowerCase().trim(); //[cite: 6]

            if (!resposta) { //[cite: 6]
                return await client.sendMessage(chatId, "❓ Digite sua resposta!\n_Exemplo: /resp Brasil_"); //[cite: 6]
            }

            // --- QUIZ ATIVO ---
            if (sessoesQuiz.has(chatId)) { //[cite: 6]
                const sessao = sessoesQuiz.get(chatId); //[cite: 6]
                const respostaCorreta = sessao.resposta; //[cite: 6]

                // 🔀 TRAVA CIRÚRGICA PARA O MODO EMBARALHADA
                if (sessao.tipo === 'embaralhada') {
                    // No anagrama, exija igualdade 100% exata. Sem aproximações por .includes e sem IA.
                    if (resposta === respostaCorreta) {
                        return await acertarQuiz(client, chatId, autorId, sessao, User); //[cite: 6]
                    }
                    return await client.sendMessage(chatId, `❌ @${autorId.split('@')[0]}, resposta errada! Tente decifrar o anagrama.`, { mentions: [autorId] });
                }

                // --- OUTROS MODOS (Geral, Materias, Frases, Emoji) ---
                const acertouDireto =
                    resposta === respostaCorreta ||
                    resposta.includes(respostaCorreta) ||
                    respostaCorreta.includes(resposta); //[cite: 6]

                if (acertouDireto) return await acertarQuiz(client, chatId, autorId, sessao, User); //[cite: 6]

                // Validação IA para os outros modos[cite: 6]
                try {
                    const validacao = await groq.chat.completions.create({ //[cite: 6]
                        messages: [ //[cite: 6]
                            {
                                role: "system", //[cite: 6]
                                content: `Valide respostas de quiz. Responda APENAS com JSON: {"correto": true} ou {"correto": false}
Aceite sinônimos, variações e pequenos erros de digitação.` //[cite: 6]
                            },
                            {
                                role: "user", //[cite: 6]
                                content: `Contexto do Quiz: ${sessao.tipo}\nPergunta/Pista original: "${sessao.enunciado}"\nResposta Esperada Exata: "${respostaCorreta}"\nO que o usuário respondeu: "${resposta}"\nAnalise se o usuário digitou o sinônimo correto ou a resposta esperada de forma válida. Responda apenas o JSON.`
                            }
                        ],
                        model: "llama-3.3-70b-versatile", //[cite: 6]
                        temperature: 0, //[cite: 6]
                        max_tokens: 20 //[cite: 6]
                    });

                    const raw = validacao.choices[0]?.message?.content?.trim(); //[cite: 6]
                    const resultado = JSON.parse(raw.replace(/```json|```/g, '').trim()); //[cite: 6]
                    if (resultado.correto === true) return await acertarQuiz(client, chatId, autorId, sessao, User); //[cite: 6]
                } catch (e) {
                    console.error("⚠️ Validação IA falhou:", e.message); //[cite: 6]
                }

                return await client.sendMessage(chatId, `❌ @${autorId.split('@')[0]}, resposta errada! Tente novamente.`, { mentions: [autorId] }); //[cite: 6]
            }

            // --- QUEM SOU EU ATIVO ---
            if (sessoesQuemsoueu.has(chatId)) { //[cite: 6]
                return await client.sendMessage(chatId, "🎭 Para o *Quem Sou Eu?* use */adivinhar [nome]*!"); //[cite: 6]
            }

            return await client.sendMessage(chatId, "⚠️ Não há quiz ativo!\nUse */quiz* para iniciar um."); //[cite: 6]

        } catch (e) {
            console.error("❌ Erro no /resp:", e); //[cite: 6]
            await client.sendMessage(chatId, "⚠️ Erro ao processar resposta."); //[cite: 6]
        }
    }
};

async function acertarQuiz(client, chatId, autorId, sessao, User) { //[cite: 6]
    clearTimeout(sessao.timer); //[cite: 6]
    sessoesQuiz.delete(chatId); //[cite: 6]
    await User.updateOne({ userId: autorId, groupId: chatId }, { $inc: { coins: 500 } }); //[cite: 6]
    await client.sendMessage(chatId, `🎉 *CORRETO!*
━━━━━━━━━━━━━━━━━━━━━
✅ @${autorId.split('@')[0]} acertou!
💰 *+500 YC* adicionados!
━━━━━━━━━━━━━━━━━━━━━`, { mentions: [autorId] }); //[cite: 6]
}