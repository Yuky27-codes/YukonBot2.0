const { sessoesQuemsoueu } = require('./quiz_sessoes_v2');

module.exports = {
    name: 'perg',
    async execute(client, msg, { chatId, senderRaw, args, groq }) {
        try {
            const autorId = String(senderRaw).trim();
            const pergunta = args.join(' ').trim();

            if (!pergunta) {
                return await client.sendMessage(chatId, "❓ Digite sua pergunta!\n_Exemplo: /perg Você é um animal?_");
            }

            if (!sessoesQuemsoueu.has(chatId)) {
                return await client.sendMessage(chatId, "⚠️ Não há *Quem Sou Eu?* ativo!\nUse */quemsoueu* para iniciar.");
            }

            const sessao = sessoesQuemsoueu.get(chatId);
            sessao.perguntas++;

            // IA responde sim/não baseado no personagem secreto
            const completion = await groq.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: `Você está jogando "Quem Sou Eu?". O personagem secreto é: "${sessao.personagem}".
Responda a pergunta do usuário APENAS com "✅ Sim!" ou "❌ Não!" baseado no personagem secreto.
Não revele o nome do personagem em hipótese alguma.`
                    },
                    { role: "user", content: pergunta }
                ],
                model: "llama-3.3-70b-versatile",
                temperature: 0,
                max_tokens: 20
            });

            const resposta = completion.choices[0]?.message?.content?.trim();

            await client.sendMessage(chatId, `🎭 *QUEM SOU EU?*
━━━━━━━━━━━━━━━━━━━━━
❓ @${autorId.split('@')[0]}: *${pergunta}*
🤖 ${resposta}

📊 Perguntas feitas: *${sessao.perguntas}*
👉 Tente adivinhar com */resp [nome]*
━━━━━━━━━━━━━━━━━━━━━`, { mentions: [autorId] });

        } catch (e) {
            console.error("❌ Erro no /perg:", e);
            await client.sendMessage(chatId, "⚠️ Erro ao processar pergunta.");
        }
    }
};