const { sessoesForca } = require('./quiz_sessoes_v2'); //[cite: 8]

const DESENHO_FORCA = [
    `\`\`\`
  +---+
  |   |
      |
      |
      |
      |
=========\`\`\``,
    `\`\`\`
  +---+
  |   |
  O   |
      |
      |
      |
=========\`\`\``,
    `\`\`\`
  +---+
  |   |
  O   |
  |   |
      |
      |
=========\`\`\``,
    `\`\`\`
  +---+
  |   |
  O   |
 /|   |
      |
      |
=========\`\`\``,
    `\`\`\`
  +---+
  |   |
  O   |
 /|\\  |
      |
      |
=========\`\`\``,
    `\`\`\`
  +---+
  |   |
  O   |
 /|\\  |
 /    |
      |
=========\`\`\``,
    `\`\`\`
  +---+
  |   |
  O   |
 /|\\  |
 / \\  |
      |
=========\`\`\``
]; //[cite: 8]

const CATEGORIAS_FORCA = [
    'animal selvagem', 'fruta tropical', 'país da América do Sul', 'profissão',
    'esporte olímpico', 'instrumento musical', 'objeto da cozinha', 'cor',
    'veículo', 'parte do corpo humano', 'planeta ou astro', 'flor',
    'meio de transporte', 'material escolar', 'eletrodoméstico',
    'animal doméstico', 'legume ou verdura', 'país da Europa',
    'peça de roupa', 'objeto de escritório'
]; //[cite: 8]

// ✅ FUNÇÃO CORRIGIDA: Agora converte Ç para C e remove acentos sem sumir com as letras!
function limparPalavra(str) {
    return str
        .toLowerCase()
        .replace(/ç/g, 'c') // Salva a letra 'ç' transformando em 'c' antes que a regex apague!
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove todos os acentos (~, ^, ´, `)
        .replace(/[^a-z]/g, '')        // Remove estritamente o que não for letra A-Z (hifens, espaços)
        .trim();
}

module.exports = {
    name: 'forca',
    async execute(client, msg, { chatId, senderRaw, args, groq }) { //[cite: 8]
        try {
            const tema = args.join(' ').trim() || ''; //[cite: 8]

            if (sessoesForca.has(chatId)) { //[cite: 8]
                const s = sessoesForca.get(chatId); //[cite: 8]
                const display = s.palavra.split('').map(l => s.acertos.includes(l) ? l.toUpperCase() : '_').join(' '); //[cite: 8]
                return await client.sendMessage(chatId, `⚠️ Já há uma forca em andamento!\n\n${DESENHO_FORCA[s.erros]}\n\n📝 *Palavra:* ${display}\n❌ *Erros (${s.erros}/6):* ${s.erradas.join(', ') || 'nenhum'}\n\n👉 */palpite [letra]* ou */adivinhar [palavra]*`); //[cite: 8]
            }

            try { await msg.react('⚙️'); } catch {} // Blindagem contra erros de reação do Puppeteer[cite: 5, 8]

            const categoriaAleatoria = CATEGORIAS_FORCA[Math.floor(Math.random() * CATEGORIAS_FORCA.length)]; //[cite: 8]
            const temaFinal = tema || categoriaAleatoria; //[cite: 8]
            const seed = Math.floor(Math.random() * 999999); //[cite: 8]

            let palavra = ''; //[cite: 8]
            let dica = ''; //[cite: 8]
            let tentativas = 0; //[cite: 8]

            while (tentativas < 3) { //[cite: 8]
                tentativas++; //[cite: 8]
                const completion = await groq.chat.completions.create({ //[cite: 8]
                    messages: [ //[cite: 8]
                        {
                            role: "system", //[cite: 8]
                            content: `Você é o gerador de palavras da Yukon Station para o jogo da forca.
Escolha UMA única palavra simples sobre o tema: "${temaFinal}".

REGRAS SEVERAS DE HIGIENIZAÇÃO:
- A palavra deve ter entre 4 e 8 letras.
- Deve ser uma palavra ÚNICA. Proibido termos compostos, hífens ou espaços.
- Se a palavra originalmente tiver acento ou 'Ç', envie ela normalmente, nós vamos tratar. Mas evite se puder.

EXEMPLOS DE RETORNO CORRETO:
{"palavra": "computador", "dica": "equipamento eletrônico usado para programar"}
{"palavra": "macaco", "dica": "primata que gosta de comer banana"}

Responda APENAS em JSON puro sem blocos de código markdown:`
                        },
                        { role: "user", content: `Gere agora uma palavra única do tema. Seed: ${seed + tentativas}` } //[cite: 8]
                    ],
                    model: "llama-3.3-70b-versatile", //[cite: 8]
                    temperature: 0.8, // Reduzido levemente para obedecer mais as regras estruturais[cite: 8]
                    max_tokens: 150 //[cite: 8]
                });

                const raw = completion.choices[0]?.message?.content?.trim(); //[cite: 8]
                const dados = JSON.parse(raw.replace(/```json|```/g, '').trim()); //[cite: 8]

                const palavraLimpa = limparPalavra(dados.palavra || ''); //[cite: 8]
                const dicaLimpa = (dados.dica || '').trim(); //[cite: 8]

                if (palavraLimpa.length >= 4 && palavraLimpa.length <= 8 && dicaLimpa) { //[cite: 8]
                    palavra = palavraLimpa; //[cite: 8]
                    dica = dicaLimpa; //[cite: 8]
                    break; //[cite: 8]
                }

                console.warn(`⚠️ [FORCA] Tentativa ${tentativas}: palavra inválida "${dados.palavra}" → "${palavraLimpa}"`); //[cite: 8]
            }

            if (!palavra) { //[cite: 8]
                try { await msg.react('❌'); } catch {} //[cite: 8]
                return await client.sendMessage(chatId, "⚠️ Não consegui gerar uma palavra válida. Tente novamente!"); //[cite: 8]
            }

            sessoesForca.set(chatId, { //[cite: 8]
                palavra, //[cite: 8]
                dica, //[cite: 8]
                tema: temaFinal, //[cite: 8]
                acertos: [], //[cite: 8]
                erradas: [], //[cite: 8]
                erros: 0 //[cite: 8]
            });

            const display = Array(palavra.length).fill('_').join(' '); //[cite: 8]

            try { await msg.react('✅'); } catch {} //[cite: 8]
            await client.sendMessage(chatId, `🪦 *JOGO DA FORCA — YUKON*
━━━━━━━━━━━━━━━━━━━━━
${DESENHO_FORCA[0]}

🎯 *Tema:* ${temaFinal}
💡 *Dica:* ${dica}
📝 *Palavra:* ${display} *(${palavra.length} letras)*
❌ *Erros:* 0/6

👉 */palpite [letra]* — Chuta uma letra
👉 */adivinhar [palavra]* — Tenta adivinhar
━━━━━━━━━━━━━━━━━━━━━`); //[cite: 8]

        } catch (e) {
            console.error("❌ Erro no /forca:", e); //[cite: 8]
            try { await msg.react('❌'); } catch {} //[cite: 8]
            await client.sendMessage(chatId, "⚠️ Erro ao iniciar a forca. Tente novamente."); //[cite: 8]
        }
    }
};