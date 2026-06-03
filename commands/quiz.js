const { sessoesQuiz } = require('./quiz_sessoes_v2');

const MATERIAS = ['historia', 'geografia', 'matematica', 'ciencias', 'portugues', 'ingles', 'fisica', 'quimica', 'biologia', 'artes'];

// Lista de categorias para forçar variedade no emoji
const CATEGORIAS_EMOJI = [
    'filme de animação', 'filme de ação', 'filme de terror', 'filme de comédia',
    'série de TV', 'anime', 'personagem de desenho animado', 'super-herói',
    'vilão famoso', 'personagem de videogame', 'filme de romance',
    'filme clássico dos anos 80', 'filme clássico dos anos 90',
    'série de fantasia', 'série de ficção científica'
];

async function gerarEEnviar(groq, prompt) {
    // Adiciona seed aleatória para evitar cache da IA
    const seed = Math.floor(Math.random() * 999999);
    const completion = await groq.chat.completions.create({
        messages: [
            { role: "system", content: prompt },
            { role: "user", content: `Gere agora. (seed: ${seed})` }
        ],
        model: "llama-3.3-70b-versatile",
        temperature: 1.0,
        max_tokens: 300
    });

    const raw = completion.choices[0]?.message?.content?.trim();
    const dados = JSON.parse(raw.replace(/```json|```/g, '').trim());
    return dados;
}

module.exports = {
    name: 'quiz',
    async execute(client, msg, { chatId, senderRaw, args, groq }) {
        try {
            const subcomando = args[0]?.toLowerCase();
            const parametro = args[1]?.toLowerCase();

            // --- MENU ---
            if (!subcomando) {
                return await client.sendMessage(chatId, `🧠 *CENTRAL DE QUIZ — YUKON*
━━━━━━━━━━━━━━━━━━━━━
🎯 */quiz geral* — Pergunta aleatória
🎬 */quiz emoji* — Adivinhe pelo emoji
📚 */quiz materias [tema]* — Por matéria
🔀 */quiz embaralhada* — Palavra embaralhada
💬 */quiz frases* — Complete a frase

📋 *Matérias disponíveis:*
historia, geografia, matematica, ciencias, portugues, ingles, fisica, quimica, biologia, artes

💰 *Prêmio:* 500 YC por acerto
⏳ *Tempo:* 60 segundos
👉 Responda sempre com: */resp [resposta]*
━━━━━━━━━━━━━━━━━━━━━`);
            }

            if (sessoesQuiz.has(chatId)) {
                const s = sessoesQuiz.get(chatId);
                return await client.sendMessage(chatId, `⚠️ Já há um quiz ativo!\n\n❓ *${s.enunciado}*\n\n👉 Responda com */resp [sua resposta]*`);
            }

            await msg.react('⚙️');

            let enunciado, resposta, mensagem;

            // --- GERAL ---
            if (subcomando === 'geral') {
                // Lista de temas para forçar variedade
                const temas = ['ciência', 'história', 'geografia', 'cultura pop', 'esportes', 'natureza', 'tecnologia', 'arte', 'culinária', 'astronomia'];
                const temaAleatorio = temas[Math.floor(Math.random() * temas.length)];

                const dados = await gerarEEnviar(groq,
                    `Gere UMA pergunta DIFERENTE e CRIATIVA sobre o tema: ${temaAleatorio}.
Evite perguntas muito óbvias ou repetitivas.
Responda APENAS em JSON puro: {"pergunta": "texto?", "resposta": "resposta curta"}
A resposta deve ter no máximo 3 palavras.`);

                enunciado = dados.pergunta;
                resposta = dados.resposta;
                mensagem = `🎯 *QUIZ GERAL*\n━━━━━━━━━━━━━━━━━━━━━\n❓ *${enunciado}*`;
            }

            // --- EMOJI ---
            else if (subcomando === 'emoji') {
                // Escolhe categoria aleatória para forçar variedade
                const categoria = CATEGORIAS_EMOJI[Math.floor(Math.random() * CATEGORIAS_EMOJI.length)];

                const dados = await gerarEEnviar(groq,
                    `Gere um quiz de emoji representando especificamente um(a): ${categoria}.
Escolha algo DIFERENTE e POUCO ÓBVIO. Não use os mesmos exemplos de sempre.
Responda APENAS em JSON puro: {"emojis": "🏰👸🐉", "resposta": "nome exato"}
Use de 2 a 5 emojis criativos que representem bem. Seja original!`);

                enunciado = dados.emojis;
                resposta = dados.resposta;
                mensagem = `🎬 *QUIZ EMOJI*\n━━━━━━━━━━━━━━━━━━━━━\n🤔 Que *${categoria}* esses emojis representam?\n\n*${enunciado}*`;
            }

            // --- MATÉRIAS ---
            else if (subcomando === 'materias') {
                const materia = MATERIAS.includes(parametro) ? parametro : MATERIAS[Math.floor(Math.random() * MATERIAS.length)];
                const materiaNome = materia.charAt(0).toUpperCase() + materia.slice(1);
                const dificuldades = ['fácil', 'médio', 'difícil'];
                const dificuldade = dificuldades[Math.floor(Math.random() * dificuldades.length)];

                const dados = await gerarEEnviar(groq,
                    `Gere UMA pergunta de nível ${dificuldade} sobre ${materiaNome}.
Seja criativo e evite perguntas repetitivas ou muito óbvias.
Responda APENAS em JSON puro: {"pergunta": "texto?", "resposta": "resposta curta"}
A resposta deve ter no máximo 3 palavras.`);

                enunciado = dados.pergunta;
                resposta = dados.resposta;
                mensagem = `📚 *QUIZ — ${materiaNome.toUpperCase()}*\n━━━━━━━━━━━━━━━━━━━━━\n❓ *${enunciado}*`;
            }

            // --- EMBARALHADA ---
            else if (subcomando === 'embaralhada') {
                const categorias = ['animal', 'comida', 'país', 'profissão', 'objeto', 'esporte', 'cor', 'instrumento musical'];
                const cat = categorias[Math.floor(Math.random() * categorias.length)];

                const dados = await gerarEEnviar(groq,
                    `Gere uma palavra da categoria: ${cat}. Embaralhe as letras de forma que fique bem diferente da original.
Responda APENAS em JSON puro: {"palavra": "palavra original", "embaralhada": "LETRAS EMBARALHADAS EM MAIÚSCULO"}
Use palavras de 4 a 8 letras. Garanta que a versão embaralhada seja visivelmente diferente da original.`);

                enunciado = dados.embaralhada;
                resposta = dados.palavra;
                mensagem = `🔀 *PALAVRA EMBARALHADA*\n━━━━━━━━━━━━━━━━━━━━━\n🤔 Que palavra é essa? _(categoria: ${cat})_\n\n*${enunciado}*`;
            }

            // --- COMPLETE A FRASE ---
            else if (subcomando === 'frases') {
                const tipos = ['ditado popular brasileiro', 'provérbio', 'frase famosa de filme', 'letra de música popular brasileira', 'expressão popular'];
                const tipo = tipos[Math.floor(Math.random() * tipos.length)];

                const dados = await gerarEEnviar(groq,
                    `Gere um(a) ${tipo} incompleto(a) para completar. Seja variado e criativo.
Responda APENAS em JSON puro: {"frase": "início da frase...", "resposta": "conclusão da frase"}
A frase deve terminar com reticências. Evite as mais óbvias e repetitivas.`);

                enunciado = dados.frase;
                resposta = dados.resposta;
                mensagem = `💬 *COMPLETE A FRASE*\n━━━━━━━━━━━━━━━━━━━━━\n🤔 Complete _(${tipo})_:\n\n*${enunciado}*`;
            }

            else {
                await msg.react('❌');
                return await client.sendMessage(chatId, "❓ Subcomando inválido!\nUse: *geral*, *emoji*, *materias*, *embaralhada* ou *frases*.");
            }

            const timer = setTimeout(async () => {
                if (sessoesQuiz.has(chatId)) {
                    sessoesQuiz.delete(chatId);
                    await client.sendMessage(chatId, `⏰ *TEMPO ESGOTADO!*\n\nNinguém acertou.\n✅ A resposta era: *${resposta}*`);
                }
            }, 60000);

            sessoesQuiz.set(chatId, {
                enunciado,
                resposta: resposta.toLowerCase().trim(),
                tipo: subcomando,
                timer
            });

            await msg.react('✅');
            await client.sendMessage(chatId, `${mensagem}

⏳ Você tem *60 segundos* para responder!
💰 Prêmio: *500 YC*
👉 */resp [sua resposta]*
━━━━━━━━━━━━━━━━━━━━━`);

        } catch (e) {
            console.error("❌ Erro no /quiz:", e);
            await msg.react('❌');
            await client.sendMessage(chatId, "⚠️ Erro ao gerar quiz. Tente novamente.");
        }
    }
};