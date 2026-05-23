const { sessoesForca, sessoesQuemsoueu } = require('./quiz_sessoes_v2');

module.exports = {
    name: 'adivinhar',
    async execute(client, msg, { chatId, senderRaw, args, User, groq }) {
        try {
            const autorId = String(senderRaw).trim();
            const tentativa = args.join(' ').toLowerCase().trim();

            if (!tentativa) {
                return await client.sendMessage(chatId, "❓ Digite sua tentativa!\n_Exemplo: /adivinhar Uva_");
            }

            // --- FORCA ---
            if (sessoesForca.has(chatId)) {
                const s = sessoesForca.get(chatId);

                if (tentativa === s.palavra) {
                    sessoesForca.delete(chatId);
                    await User.updateOne({ userId: autorId, groupId: chatId }, { $inc: { coins: 500 } });
                    return await client.sendMessage(chatId, `🎉 *@${autorId.split('@')[0]} adivinhou a palavra!*
━━━━━━━━━━━━━━━━━━━━━
✅ *${s.palavra.toUpperCase()}*
💰 *+500 YC* adicionados!
━━━━━━━━━━━━━━━━━━━━━
Use */forca [tema]* para jogar novamente!`, { mentions: [autorId] });
                }

                // Errou — conta como erro
                s.erros++;
                s.erradas.push(`❌${tentativa}`);

                const display = s.palavra.split('').map(l => s.acertos.includes(l) ? l.toUpperCase() : '_').join(' ');

                if (s.erros >= 6) {
                    sessoesForca.delete(chatId);
                    return await client.sendMessage(chatId, `💀 *GAME OVER!*\n\n😢 @${autorId.split('@')[0]} errou!\n✅ A palavra era: *${s.palavra.toUpperCase()}*\n\nUse */forca [tema]* para tentar novamente!`, { mentions: [autorId] });
                }

                return await client.sendMessage(chatId, `❌ *"${tentativa}" não é a palavra certa!*

📝 *Palavra:* ${display}
❌ *Erros (${s.erros}/6)*

👉 */chutar [letra]* ou tente adivinhar novamente!`);
            }

            // --- QUEM SOU EU ---
            if (sessoesQuemsoueu.has(chatId)) {
                const s = sessoesQuemsoueu.get(chatId);

                // Validação pela IA
                const validacao = await groq.chat.completions.create({
                    messages: [
                        {
                            role: "system",
                            content: `Você valida respostas do jogo "Quem Sou Eu?". O personagem secreto é: "${s.personagem}".
Responda APENAS com JSON puro: {"correto": true} ou {"correto": false}
Considere correto se o usuário acertou o personagem, mesmo com variações de nome ou pequenos erros.`
                        },
                        { role: "user", content: `O usuário disse: "${tentativa}". Está correto?` }
                    ],
                    model: "llama-3.3-70b-versatile",
                    temperature: 0,
                    max_tokens: 20
                });

                const raw = validacao.choices[0]?.message?.content?.trim();
                const resultado = JSON.parse(raw.replace(/```json|```/g, '').trim());

                if (resultado.correto) {
                    clearTimeout(s.timer);
                    sessoesQuemsoueu.delete(chatId);
                    await User.updateOne({ userId: autorId, groupId: chatId }, { $inc: { coins: 500 } });
                    return await client.sendMessage(chatId, `🎉 *@${autorId.split('@')[0]} adivinhou!*
━━━━━━━━━━━━━━━━━━━━━
✅ Era mesmo *${s.personagem}*!
💰 *+500 YC* adicionados!
📊 Perguntas feitas: *${s.perguntas}*
━━━━━━━━━━━━━━━━━━━━━`, { mentions: [autorId] });
                }

                return await client.sendMessage(chatId, `❌ @${autorId.split('@')[0]}, não sou *${tentativa}*! Continue fazendo perguntas com */perg*`, { mentions: [autorId] });
            }

            return await client.sendMessage(chatId, "⚠️ Não há jogo ativo!\nUse */forca* ou */quemsoueu* para iniciar.");

        } catch (e) {
            console.error("❌ Erro no /adivinhar:", e);
            await client.sendMessage(chatId, "⚠️ Erro ao processar tentativa.");
        }
    }
};