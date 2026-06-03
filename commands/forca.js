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

// Categorias para forçar variedade
const CATEGORIAS_FORCA = [
    'animal selvagem', 'fruta tropical', 'país da América do Sul', 'profissão',
    'esporte olímpico', 'instrumento musical', 'objeto da cozinha', 'cor',
    'veículo', 'parte do corpo humano', 'planeta ou astro', 'flor',
    'meio de transporte', 'material escolar', 'eletrodoméstico'
];

module.exports = {
    name: 'forca',
    async execute(client, msg, { chatId, senderRaw, args, groq }) {
        try {
            const autorId = String(senderRaw).trim();
            const tema = args.join(' ').trim() || '';

            if (sessoesForca.has(chatId)) {
                const s = sessoesForca.get(chatId);
                const display = s.palavra.split('').map(l => s.acertos.includes(l) ? l.toUpperCase() : '_').join(' ');
                return await client.sendMessage(chatId, `⚠️ Já há uma forca em andamento!\n\n${DESENHO_FORCA[s.erros]}\n\n📝 *Palavra:* ${display}\n❌ *Erros (${s.erros}/6):* ${s.erradas.join(', ') || 'nenhum'}\n\n👉 */palpite [letra]* ou */adivinhar [palavra]*`);
            }

            await msg.react('⚙️');

            // Se o usuário não passou tema, escolhe categoria aleatória para forçar variedade
            const categoriaAleatoria = CATEGORIAS_FORCA[Math.floor(Math.random() * CATEGORIAS_FORCA.length)];
            const temaFinal = tema || categoriaAleatoria;
            const seed = Math.floor(Math.random() * 999999);

            const completion = await groq.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: `Escolha UMA palavra DIFERENTE e ALEATÓRIA em português para o jogo da forca com tema: "${temaFinal}".
Seja criativo e evite sempre as mesmas palavras óbvias.
Responda APENAS em JSON puro: {"palavra": "palavra", "dica": "dica curta e específica sobre essa palavra"}
A palavra deve ter entre 4 e 10 letras, sem acento, sem hífen, apenas letras de a-z.
A dica deve ser específica para a palavra escolhida, não apenas o tema.`
                    },
                    { role: "user", content: `Escolha agora. (seed: ${seed})` }
                ],
                model: "llama-3.3-70b-versatile",
                temperature: 1.0,
                max_tokens: 100
            });

            const raw = completion.choices[0]?.message?.content?.trim();
            const dados = JSON.parse(raw.replace(/```json|```/g, '').trim());
            const palavra = dados.palavra.toLowerCase().replace(/[^a-z]/g, '');

            if (!palavra || palavra.length < 3) {
                throw new Error("Palavra inválida gerada pela IA");
            }

            sessoesForca.set(chatId, {
                palavra,
                dica: dados.dica,
                tema: temaFinal,
                acertos: [],
                erradas: [],
                erros: 0
            });

            const display = Array(palavra.length).fill('_').join(' ');

            await msg.react('✅');
            await client.sendMessage(chatId, `🪦 *JOGO DA FORCA — YUKON*
━━━━━━━━━━━━━━━━━━━━━
${DESENHO_FORCA[0]}

🎯 *Tema:* ${temaFinal}
💡 *Dica:* ${dados.dica}
📝 *Palavra:* ${display} (${palavra.length} letras)
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