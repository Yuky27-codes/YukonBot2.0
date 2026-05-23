const { sessoesQuiz } = require('./quiz_sessoes_v2');

const MATERIAS = ['historia', 'geografia', 'matematica', 'ciencias', 'portugues', 'ingles', 'fisica', 'quimica', 'biologia', 'artes'];

async function gerarEEnviar(client, chatId, groq, prompt, tipo) {
    const completion = await groq.chat.completions.create({
        messages: [
            { role: "system", content: prompt },
            { role: "user", content: "Gere agora." }
        ],
        model: "llama-3.3-70b-versatile",
        temperature: 0.9,
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
            const autorId = String(senderRaw).trim();
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

            // Verifica se já tem quiz ativo
            if (sessoesQuiz.has(chatId)) {
                const s = sessoesQuiz.get(chatId);
                return await client.sendMessage(chatId, `⚠️ Já há um quiz ativo!\n\n❓ *${s.enunciado}*\n\n👉 Responda com */resp [sua resposta]*`);
            }

            await msg.react('⚙️');

            let enunciado, resposta, mensagem;

            // --- GERAL ---
            if (subcomando === 'geral') {
                const dados = await gerarEEnviar(client, chatId, groq,
                    `Gere UMA pergunta de conhecimentos gerais interessante e variada.
Responda APENAS em JSON puro: {"pergunta": "texto?", "resposta": "resposta curta"}
A resposta deve ter no máximo 3 palavras.`, 'geral');

                enunciado = dados.pergunta;
                resposta = dados.resposta;
                mensagem = `🎯 *QUIZ GERAL*\n━━━━━━━━━━━━━━━━━━━━━\n❓ *${enunciado}*`;
            }

            // --- EMOJI ---
            else if (subcomando === 'emoji') {
                const dados = await gerarEEnviar(client, chatId, groq,
                    `Gere um quiz de emoji onde os emojis representam um filme, série ou personagem famoso.
Responda APENAS em JSON puro: {"emojis": "🏰👸🐉", "resposta": "nome do filme/série/personagem"}
Use de 2 a 4 emojis que representem bem o tema.`, 'emoji');

                enunciado = dados.emojis;
                resposta = dados.resposta;
                mensagem = `🎬 *QUIZ EMOJI*\n━━━━━━━━━━━━━━━━━━━━━\n🤔 Que filme/série/personagem esses emojis representam?\n\n*${enunciado}*`;
            }

            // --- MATÉRIAS ---
            else if (subcomando === 'materias') {
                const materia = MATERIAS.includes(parametro) ? parametro : MATERIAS[Math.floor(Math.random() * MATERIAS.length)];
                const materiaNome = materia.charAt(0).toUpperCase() + materia.slice(1);

                const dados = await gerarEEnviar(client, chatId, groq,
                    `Gere UMA pergunta de ${materiaNome} para estudantes do ensino médio/fundamental.
Responda APENAS em JSON puro: {"pergunta": "texto?", "resposta": "resposta curta"}
A resposta deve ter no máximo 3 palavras.`, 'materias');

                enunciado = dados.pergunta;
                resposta = dados.resposta;
                mensagem = `📚 *QUIZ — ${materiaNome.toUpperCase()}*\n━━━━━━━━━━━━━━━━━━━━━\n❓ *${enunciado}*`;
            }

            // --- EMBARALHADA ---
            else if (subcomando === 'embaralhada') {
                const dados = await gerarEEnviar(client, chatId, groq,
                    `Gere uma palavra em português e embaralhe as letras dela.
Responda APENAS em JSON puro: {"palavra": "palavra original", "embaralhada": "LETRAS EMBARALHADAS EM MAIÚSCULO"}
Use palavras de 4 a 8 letras. A versão embaralhada deve estar visivelmente diferente da original.`, 'embaralhada');

                enunciado = dados.embaralhada;
                resposta = dados.palavra;
                mensagem = `🔀 *PALAVRA EMBARALHADA*\n━━━━━━━━━━━━━━━━━━━━━\n🤔 Que palavra é essa?\n\n*${enunciado}*`;
            }

            // --- COMPLETE A FRASE ---
            else if (subcomando === 'frases') {
                const dados = await gerarEEnviar(client, chatId, groq,
                    `Gere uma frase conhecida, ditado popular ou provérbio brasileiro incompleto para completar.
Responda APENAS em JSON puro: {"frase": "Filho de peixe...", "resposta": "peixinho é"}
A frase deve terminar com reticências indicando onde completar.`, 'frases');

                enunciado = dados.frase;
                resposta = dados.resposta;
                mensagem = `💬 *COMPLETE A FRASE*\n━━━━━━━━━━━━━━━━━━━━━\n🤔 Complete:\n\n*${enunciado}*`;
            }

            else {
                await msg.react('❌');
                return await client.sendMessage(chatId, "❓ Subcomando inválido!\nUse: *geral*, *emoji*, *materias*, *embaralhada* ou *frases*.");
            }

            // Registra sessão com timer de 60s
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