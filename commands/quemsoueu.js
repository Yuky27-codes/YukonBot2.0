const { sessoesQuemsoueu } = require('./quiz_sessoes_v2');

// Listas para forçar variedade real
const CATEGORIAS = [
    { tipo: 'Personagem de Anime', exemplos: 'Naruto, Goku, Luffy, Eren, Edward Elric' },
    { tipo: 'Personagem de Filme de Animação', exemplos: 'Simba, Woody, Elsa, Moana, Shrek' },
    { tipo: 'Super-Herói ou Vilão', exemplos: 'Homem-Aranha, Coringa, Thanos, Mulher-Maravilha' },
    { tipo: 'Atleta Famoso', exemplos: 'Neymar, Serena Williams, Usain Bolt, Messi' },
    { tipo: 'Cantor ou Banda Famosa', exemplos: 'Michael Jackson, Lady Gaga, Beatles, Madonna' },
    { tipo: 'Personagem de Série de TV', exemplos: 'Walter White, Jon Snow, Eleven, Sheldon Cooper' },
    { tipo: 'Animal Exótico', exemplos: 'ornitorrinco, axolote, tarsier, quetzal' },
    { tipo: 'Cientista ou Inventor Histórico', exemplos: 'Marie Curie, Nikola Tesla, Isaac Newton' },
    { tipo: 'Personagem de Videogame', exemplos: 'Mario, Link, Master Chief, Lara Croft' },
    { tipo: 'Político ou Líder Histórico', exemplos: 'Napoleão, Cleópatra, Mandela, Churchill' },
    { tipo: 'Personagem de Livro Famoso', exemplos: 'Harry Potter, Sherlock Holmes, Dom Quixote' },
    { tipo: 'Objeto do Cotidiano', exemplos: 'geladeira, boomerang, telescópio, violino' },
    { tipo: 'Ator ou Atriz Famoso', exemplos: 'Tom Hanks, Meryl Streep, Leonardo DiCaprio' },
    { tipo: 'Personagem de HQ ou Mangá', exemplos: 'Batman, Homem de Ferro, Dragon Ball' },
    { tipo: 'Animal Marinho', exemplos: 'manta, beluga, polvo, dugongo, nautilus' }
];

module.exports = {
    name: 'quemsoueu',
    async execute(client, msg, { chatId, senderRaw, groq }) {
        try {
            if (sessoesQuemsoueu.has(chatId)) {
                const s = sessoesQuemsoueu.get(chatId);
                return await client.sendMessage(chatId, `⚠️ Já há um *Quem Sou Eu?* em andamento!\n\nCategoria: *${s.categoria}*\nFaça perguntas com */perg [pergunta]*\nOu tente adivinhar com */adivinhar [nome]*`);
            }

            await msg.react('⚙️');

            // Escolhe categoria aleatória com exemplos para guiar a IA
            const catEscolhida = CATEGORIAS[Math.floor(Math.random() * CATEGORIAS.length)];
            const seed = Math.floor(Math.random() * 999999);

            const completion = await groq.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: `Você é um gerador de personagens para o jogo "Quem Sou Eu?".
Categoria obrigatória: *${catEscolhida.tipo}*
Exemplos dessa categoria (NÃO use esses, use outros): ${catEscolhida.exemplos}

REGRAS:
- Escolha um(a) ${catEscolhida.tipo} DIFERENTE dos exemplos acima
- Deve ser razoavelmente conhecido pelo público brasileiro
- NÃO escolha sempre os mais famosos/óbvios
- Seja variado e surpreendente

Responda APENAS em JSON puro sem markdown:
{"personagem": "nome exato", "dica_categoria": "${catEscolhida.tipo}"}`
                    },
                    { role: "user", content: `Escolha agora. Seed: ${seed}` }
                ],
                model: "llama-3.3-70b-versatile",
                temperature: 1.0,
                max_tokens: 100
            });

            const raw = completion.choices[0]?.message?.content?.trim();
            const dados = JSON.parse(raw.replace(/```json|```/g, '').trim());

            if (!dados.personagem) throw new Error("Personagem não gerado");

            const timer = setTimeout(async () => {
                if (sessoesQuemsoueu.has(chatId)) {
                    const s = sessoesQuemsoueu.get(chatId);
                    sessoesQuemsoueu.delete(chatId);
                    await client.sendMessage(chatId, `⏰ *TEMPO ESGOTADO!*\n\nNinguém adivinhou.\n✅ Era: *${s.personagem}*`);
                }
            }, 10 * 60 * 1000);

            sessoesQuemsoueu.set(chatId, {
                personagem: dados.personagem,
                categoria: catEscolhida.tipo,
                perguntas: 0,
                timer
            });

            await msg.react('✅');
            await client.sendMessage(chatId, `🎭 *QUEM SOU EU? — YUKON*
━━━━━━━━━━━━━━━━━━━━━
Pensei em um(a) *${catEscolhida.tipo}*!

Descubra quem sou eu fazendo perguntas de *sim* ou *não*:
👉 */perg Você é real?*
👉 */perg Você é brasileiro(a)?*
👉 */perg Você ainda está vivo(a)?*

Quando souber, tente adivinhar:
👉 */adivinhar [nome]*

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