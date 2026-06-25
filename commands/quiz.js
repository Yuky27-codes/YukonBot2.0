const { sessoesQuiz } = require('./quiz_sessoes_v2'); //

const MATERIAS = ['historia', 'geografia', 'matematica', 'ciencias', 'portugues', 'ingles', 'fisica', 'quimica', 'biologia', 'artes']; //

const CATEGORIAS_EMOJI = [
    'filme de animação', 'filme de ação', 'filme de terror', 'filme de comédia',
    'série de TV', 'anime', 'personagem de desenho animado', 'super-herói',
    'vilão famoso', 'personagem de videogame', 'filme de romance',
    'filme clássico dos anos 80', 'filme clássico dos anos 90',
    'série de fantasia', 'série de ficção científica'
]; //[cite: 5]

async function gerarEEnviar(groq, prompt) { //[cite: 5]
    const seed = Math.floor(Math.random() * 999999); //[cite: 5]
    const completion = await groq.chat.completions.create({ //[cite: 5]
        messages: [
            { role: "system", content: prompt }, //[cite: 5]
            { role: "user", content: `Gere agora. (seed: ${seed})` } //[cite: 5]
        ],
        model: "llama-3.3-70b-versatile", //[cite: 5]
        temperature: 0.9, // Reduzido levemente de 1.0 para manter criativo mas sem quebrar JSON[cite: 5]
        max_tokens: 300 //[cite: 5]
    });

    const raw = completion.choices[0]?.message?.content?.trim(); //[cite: 5]
    const dados = JSON.parse(raw.replace(/```json|```/g, '').trim()); //[cite: 5]
    return dados; //[cite: 5]
}

module.exports = {
    name: 'quiz',
    async execute(client, msg, { chatId, senderRaw, args, groq }) { //[cite: 5]
        try {
            const subcomando = args[0]?.toLowerCase(); //[cite: 5]
            const parametro = args[1]?.toLowerCase(); //[cite: 5]

            // --- MENU ---
            if (!subcomando) { //[cite: 5]
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
━━━━━━━━━━━━━━━━━━━━━`); //[cite: 5]
            }

            if (sessoesQuiz.has(chatId)) { //[cite: 5]
                const s = sessoesQuiz.get(chatId); //[cite: 5]
                return await client.sendMessage(chatId, `⚠️ Já há um quiz ativo!\n\n❓ *${s.enunciado}*\n\n👉 Responda com */resp [sua resposta]*`); //[cite: 5]
            }

            await msg.react('⚙️'); //[cite: 5]

            let enunciado, resposta, mensagem; //[cite: 5]

            // --- GERAL ---
            if (subcomando === 'geral') { //[cite: 5]
                const temas = ['ciência', 'história', 'geografia', 'cultura pop', 'esportes', 'natureza', 'tecnologia', 'arte', 'culinária', 'astronomia']; //[cite: 5]
                const temaAleatorio = temas[Math.floor(Math.random() * temas.length)]; //[cite: 5]

                const dados = await gerarEEnviar(groq,
                    `Gere UMA pergunta DIFERENTE e CRIATIVA sobre o tema: ${temaAleatorio}.[cite: 5]
Responda APENAS em JSON puro: {"pergunta": "texto?", "resposta": "resposta curta"}[cite: 5]
A 'resposta' deve ser o nome real e correto do objeto/fato, com no máximo 3 palavras.`);

                enunciado = dados.pergunta; //[cite: 5]
                resposta = dados.resposta; //[cite: 5]
                mensagem = `🎯 *QUIZ GERAL*\n━━━━━━━━━━━━━━━━━━━━━\n❓ *${enunciado}*`; //[cite: 5]
            }

            // --- EMOJI ---
            else if (subcomando === 'emoji') { //[cite: 5]
                const categoria = CATEGORIAS_EMOJI[Math.floor(Math.random() * CATEGORIAS_EMOJI.length)]; //[cite: 5]

                const dados = await gerarEEnviar(groq,
                    `Gere um quiz de emoji representando especificamente um(a): ${categoria}.[cite: 5]
Responda APENAS em JSON puro: {"emojis": "🏰👸🐉", "resposta": "nome exato"}[cite: 5]
A 'resposta' DEVE ser o nome real por extenso e em letras normais. Não coloque emojis no campo 'resposta'.`);

                enunciado = dados.emojis; //[cite: 5]
                resposta = dados.resposta; //[cite: 5]
                mensagem = `🎬 *QUIZ EMOJI*\n━━━━━━━━━━━━━━━━━━━━━\n🤔 Que *${categoria}* esses emojis representam?\n\n*${enunciado}*`; //[cite: 5]
            }

            // --- MATÉRIAS ---
            else if (subcomando === 'materias') { //[cite: 5]
                const materia = MATERIAS.includes(parametro) ? parametro : MATERIAS[Math.floor(Math.random() * MATERIAS.length)]; //[cite: 5]
                const materiaNome = materia.charAt(0).toUpperCase() + materia.slice(1); //[cite: 5]
                const dificuldades = ['fácil', 'médio', 'difícil']; //[cite: 5]
                const dificuldade = dificuldades[Math.floor(Math.random() * dificuldades.length)]; //[cite: 5]

                const dados = await gerarEEnviar(groq,
                    `Gere UMA pergunta de nível ${dificuldade} sobre ${materiaNome}.[cite: 5]
Responda APENAS em JSON puro: {"pergunta": "texto?", "resposta": "resposta curta"}[cite: 5]
A 'resposta' deve ser a resposta real por extenso com no máximo 3 palavras.`);

                enunciado = dados.pergunta; //[cite: 5]
                resposta = dados.resposta; //[cite: 5]
                mensagem = `📚 *QUIZ — ${materiaNome.toUpperCase()}*\n━━━━━━━━━━━━━━━━━━━━━\n❓ *${enunciado}*`; //[cite: 5]
            }

            // --- EMBARALHADA (CORRIGIDA) ---
            else if (subcomando === 'embaralhada') { //[cite: 5]
                const categorias = ['animal', 'comida', 'país', 'profissão', 'objeto', 'esporte', 'cor', 'instrumento musical']; //[cite: 5]
                const cat = categorias[Math.floor(Math.random() * categorias.length)]; //[cite: 5]

                const dados = await gerarEEnviar(groq,
                    `Gere uma palavra em português da categoria: ${cat}. Embaralhe completamente as letras dela.[cite: 5]
ATENÇÃO CRÍTICA: 
No campo "palavra", coloque a resposta correta decifrada (ex: "geladeira"). 
No campo "embaralhada", coloque APENAS as letras misturadas em MAIÚSCULAS (ex: "DIRALAGEE").
Responda APENAS em JSON puro: {"palavra": "palavra original", "embaralhada": "LETRAS MISTURADAS"}`); //[cite: 5]

                // Forçamos a separação cirúrgica das variáveis
                enunciado = String(dados.embaralhada).toUpperCase().trim(); // Exibição: Letras embaralhadas[cite: 5]
                resposta = String(dados.palavra).toLowerCase().trim();     // Resposta real interna[cite: 5]
                mensagem = `🔀 *PALAVRA EMBARALHADA*\n━━━━━━━━━━━━━━━━━━━━━\n🤔 Que palavra é essa? _(categoria: ${cat})_\n\n*${enunciado}*`; //[cite: 5]
            }

            // --- COMPLETE A FRASE ---
            else if (subcomando === 'frases') { //[cite: 5]
                const tipos = ['ditado popular brasileiro', 'provérbio', 'frase famosa de filme', 'letra de música popular brasileira', 'expressão popular']; //[cite: 5]
                const tipo = tipos[Math.floor(Math.random() * tipos.length)]; //[cite: 5]

                const dados = await gerarEEnviar(groq,
                    `Gere um(a) ${tipo} incompleto(a) para completar.[cite: 5]
Responda APENAS em JSON puro: {"frase": "início da frase...", "resposta": "conclusão da frase"}[cite: 5]
O campo 'resposta' deve conter estritamente apenas a palavra ou o final que completa o texto.`);

                enunciado = dados.frase; //[cite: 5]
                resposta = dados.resposta; //[cite: 5]
                mensagem = `💬 *COMPLETE A FRASE*\n━━━━━━━━━━━━━━━━━━━━━\n🤔 Complete _(${tipo})_:\n\n*${enunciado}*`; //[cite: 5]
            }

            else {
                await msg.react('❌'); //[cite: 5]
                return await client.sendMessage(chatId, "❓ Subcomando inválido!\nUse: *geral*, *emoji*, *materias*, *embaralhada* ou *frases*."); //[cite: 5]
            }

            // Garante cópia local limpa da resposta para o setTimeout
            const respostaFinalDoQuiz = resposta.toLowerCase().trim(); //[cite: 5]

            const timer = setTimeout(async () => {
                if (sessoesQuiz.has(chatId)) { //[cite: 5]
                    sessoesQuiz.delete(chatId); //[cite: 5]
                    await client.sendMessage(chatId, `⏰ *TEMPO ESGOTADO!*\n\nNinguém acertou.\n✅ A resposta era: *${respostaFinalDoQuiz}*`); //[cite: 5]
                }
            }, 60000); //[cite: 5]

            // SALVA NA SESSÃO DE FORMA ULTRA BLINDADA
            sessoesQuiz.set(chatId, {
                enunciado, //[cite: 5]
                resposta: respostaFinalDoQuiz, // Resposta exata salva para conferência[cite: 5]
                tipo: subcomando, //[cite: 5]
                timer //[cite: 5]
            });

            await msg.react('✅'); //[cite: 5]
            await client.sendMessage(chatId, `${mensagem}

⏳ Você tem *60 segundos* para responder!
💰 Prêmio: *500 YC*
👉 */resp [sua resposta]*
━━━━━━━━━━━━━━━━━━━━━`); //[cite: 5]

        } catch (e) {
            console.error("❌ Erro no /quiz:", e); //[cite: 5]
            await msg.react('❌'); //[cite: 5]
            await client.sendMessage(chatId, "⚠️ Erro ao gerar quiz. Tente novamente."); //[cite: 5]
        }
    }
};