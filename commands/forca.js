const { sessoesForca } = require('./quiz_sessoes_v2');

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
];

const CATEGORIAS_FORCA = [
    'animal selvagem', 'fruta tropical', 'país da América do Sul', 'profissão',
    'esporte olímpico', 'instrumento musical', 'objeto da cozinha', 'cor',
    'veículo', 'parte do corpo humano', 'planeta ou astro', 'flor',
    'meio de transporte', 'material escolar', 'eletrodoméstico',
    'animal doméstico', 'legume ou verdura', 'país da Europa',
    'peça de roupa', 'objeto de escritório'
];

// ✅ Função robusta para limpar a palavra — remove acentos E qualquer char não-letra
function limparPalavra(str) {
    return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // remove acentos
        .replace(/[^a-zA-Z]/g, '')        // remove tudo que não for letra
        .toLowerCase()
        .trim();
}

module.exports = {
    name: 'forca',
    async execute(client, msg, { chatId, senderRaw, args, groq }) {
        try {
            const tema = args.join(' ').trim() || '';

            if (sessoesForca.has(chatId)) {
                const s = sessoesForca.get(chatId);
                const display = s.palavra.split('').map(l => s.acertos.includes(l) ? l.toUpperCase() : '_').join(' ');
                return await client.sendMessage(chatId, `⚠️ Já há uma forca em andamento!\n\n${DESENHO_FORCA[s.erros]}\n\n📝 *Palavra:* ${display}\n❌ *Erros (${s.erros}/6):* ${s.erradas.join(', ') || 'nenhum'}\n\n👉 */palpite [letra]* ou */adivinhar [palavra]*`);
            }

            await msg.react('⚙️');

            const categoriaAleatoria = CATEGORIAS_FORCA[Math.floor(Math.random() * CATEGORIAS_FORCA.length)];
            const temaFinal = tema || categoriaAleatoria;
            const seed = Math.floor(Math.random() * 999999);

            // Tenta até 3 vezes para garantir uma palavra válida
            let palavra = '';
            let dica = '';
            let tentativas = 0;

            while (tentativas < 3) {
                tentativas++;
                const completion = await groq.chat.completions.create({
                    messages: [
                        {
                            role: "system",
                            content: `Você é um gerador de palavras para o jogo da forca em português brasileiro.
Escolha UMA palavra simples do tema: "${temaFinal}".

REGRAS OBRIGATÓRIAS:
- A palavra deve ter entre 4 e 8 letras
- Use APENAS letras do alfabeto simples (a-z), SEM acento, SEM hífen, SEM espaço
- Exemplos corretos: "gato", "faca", "piano", "martelo", "futebol"
- Exemplos errados: "ação", "pão", "guarda-chuva", "São Paulo"
- A dica deve descrever a palavra sem revelar ela

Responda APENAS em JSON puro sem markdown:
{"palavra": "palavrasimples", "dica": "dica curta sobre ela"}`
                        },
                        { role: "user", content: `Gere agora. Seed: ${seed + tentativas}` }
                    ],
                    model: "llama-3.3-70b-versatile",
                    temperature: 1.0,
                    max_tokens: 150
                });

                const raw = completion.choices[0]?.message?.content?.trim();
                const dados = JSON.parse(raw.replace(/```json|```/g, '').trim());

                // ✅ Limpa a palavra de forma robusta
                const palavraLimpa = limparPalavra(dados.palavra || '');
                const dicaLimpa = (dados.dica || '').trim();

                // ✅ Valida: só aceita se tiver entre 4 e 8 letras e a dica não vazia
                if (palavraLimpa.length >= 4 && palavraLimpa.length <= 8 && dicaLimpa) {
                    palavra = palavraLimpa;
                    dica = dicaLimpa;
                    break;
                }

                console.warn(`⚠️ [FORCA] Tentativa ${tentativas}: palavra inválida "${dados.palavra}" → "${palavraLimpa}"`);
            }

            if (!palavra) {
                await msg.react('❌');
                return await client.sendMessage(chatId, "⚠️ Não consegui gerar uma palavra válida. Tente novamente!");
            }

            sessoesForca.set(chatId, {
                palavra,
                dica,
                tema: temaFinal,
                acertos: [],
                erradas: [],
                erros: 0
            });

            // ✅ Exibe underscores corretos baseado no tamanho real da palavra
            const display = Array(palavra.length).fill('_').join(' ');

            await msg.react('✅');
            await client.sendMessage(chatId, `🪦 *JOGO DA FORCA — YUKON*
━━━━━━━━━━━━━━━━━━━━━
${DESENHO_FORCA[0]}

🎯 *Tema:* ${temaFinal}
💡 *Dica:* ${dica}
📝 *Palavra:* ${display} *(${palavra.length} letras)*
❌ *Erros:* 0/6

👉 */palpite [letra]* — Chuta uma letra
👉 */adivinhar [palavra]* — Tenta adivinhar
━━━━━━━━━━━━━━━━━━━━━`);

        } catch (e) {
            console.error("❌ Erro no /forca:", e);
            await msg.react('❌');
            await client.sendMessage(chatId, "⚠️ Erro ao iniciar a forca. Tente novamente.");
        }
    }
};