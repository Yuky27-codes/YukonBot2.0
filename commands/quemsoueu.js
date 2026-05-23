const { sessoesQuemsoueu } = require('./quiz_sessoes_v2');

module.exports = {
    name: 'quemsoueu',
    async execute(client, msg, { chatId, senderRaw, groq }) {
        try {
            const autorId = String(senderRaw).trim();

            if (sessoesQuemsoueu.has(chatId)) {
                const s = sessoesQuemsoueu.get(chatId);
                return await client.sendMessage(chatId, `⚠️ Já há um *Quem Sou Eu?* em andamento!\n\nFaça perguntas com */perg [pergunta]*\nOu tente adivinhar com */resp [nome]*`);
            }

            await msg.react('⚙️');

            // IA escolhe um personagem secreto
            const completion = await groq.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: `Escolha um personagem, animal, objeto ou pessoa famosa aleatório para o jogo "Quem Sou Eu?".
Responda APENAS em JSON puro: {"personagem": "nome do personagem", "dica_categoria": "Animal / Pessoa Famosa / Personagem Fictício / Objeto"}
Varie bastante as categorias e personagens.`
                    },
                    { role: "user", content: "Escolha agora." }
                ],
                model: "llama-3.3-70b-versatile",
                temperature: 1,
                max_tokens: 100
            });

            const raw = completion.choices[0]?.message?.content?.trim();
            const dados = JSON.parse(raw.replace(/```json|```/g, '').trim());

            // Timer de 10 minutos
            const timer = setTimeout(async () => {
                if (sessoesQuemsoueu.has(chatId)) {
                    const s = sessoesQuemsoueu.get(chatId);
                    sessoesQuemsoueu.delete(chatId);
                    await client.sendMessage(chatId, `⏰ *TEMPO ESGOTADO!*\n\nNinguém adivinhou.\n✅ O personagem era: *${s.personagem}*`);
                }
            }, 10 * 60 * 1000); // 10 minutos

            sessoesQuemsoueu.set(chatId, {
                personagem: dados.personagem,
                categoria: dados.dica_categoria,
                perguntas: 0,
                timer
            });

            await msg.react('✅');
            await client.sendMessage(chatId, `🎭 *QUEM SOU EU? — YUKON*
━━━━━━━━━━━━━━━━━━━━━
Pensei em um(a) *${dados.dica_categoria}*!

Descubra quem sou eu fazendo perguntas de *sim* ou *não*:
👉 */perg Você é um animal?*
👉 */perg Você é famoso?*

Quando souber, tente adivinhar:
👉 */resp [nome]*

⏳ Você tem *10 minutos!*
💰 Prêmio: *500 YC*
━━━━━━━━━━━━━━━━━━━━━`);

        } catch (e) {
            console.error("❌ Erro no /quemsoueu:", e);
            await msg.react('❌');
            await client.sendMessage(chatId, "⚠️ Erro ao iniciar o jogo. Tente novamente.");
        }
    }
};