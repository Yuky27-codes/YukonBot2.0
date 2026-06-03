const { sessoesForca } = require('./quiz_sessoes_v2');

const DESENHO_FORCA = [
    // 0 erros
    `\`\`\`
  +---+
  |   |
      |
      |
      |
      |
=========\`\`\``,
    // 1 erro
    `\`\`\`
  +---+
  |   |
  O   |
      |
      |
      |
=========\`\`\``,
    // 2 erros
    `\`\`\`
  +---+
  |   |
  O   |
  |   |
      |
      |
=========\`\`\``,
    // 3 erros
    `\`\`\`
  +---+
  |   |
  O   |
 /|   |
      |
      |
=========\`\`\``,
    // 4 erros
    `\`\`\`
  +---+
  |   |
  O   |
 /|\\  |
      |
      |
=========\`\`\``,
    // 5 erros
    `\`\`\`
  +---+
  |   |
  O   |
 /|\\  |
 /    |
      |
=========\`\`\``,
    // 6 erros — morreu
    `\`\`\`
  +---+
  |   |
  O   |
 /|\\  |
 / \\  |
      |
=========\`\`\``
];

module.exports = {
    name: 'forca',
    async execute(client, msg, { chatId, senderRaw, args, groq }) {
        try {
            const autorId = String(senderRaw).trim();
            const tema = args.join(' ').trim() || 'geral';

            if (sessoesForca.has(chatId)) {
                const s = sessoesForca.get(chatId);
                const display = s.palavra.split('').map(l => s.acertos.includes(l) ? l.toUpperCase() : '_').join(' ');
                return await client.sendMessage(chatId, `⚠️ Já há uma forca em andamento!\n\n${DESENHO_FORCA[s.erros]}\n\n📝 *Palavra:* ${display}\n❌ *Erros (${s.erros}/6):* ${s.erradas.join(', ') || 'nenhum'}\n\n👉 */palpite [letra]* ou */adivinhar [palavra]*`);
            }

            await msg.react('⚙️');

            // IA escolhe a palavra
            const completion = await groq.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: `Escolha UMA palavra em português para o jogo da forca com tema: "${tema}".
Responda APENAS em JSON puro: {"palavra": "palavra", "dica": "dica curta sobre a categoria"}
A palavra deve ter entre 4 e 10 letras, sem acento, sem hífen, apenas letras simples, sem apresentar a mesma dica que foi passada anteriormente.`
                    },
                    { role: "user", content: "Escolha agora." }
                ],
                model: "llama-3.3-70b-versatile",
                temperature: 0.9,
                max_tokens: 100
            });

            const raw = completion.choices[0]?.message?.content?.trim();
            const dados = JSON.parse(raw.replace(/```json|```/g, '').trim());
            const palavra = dados.palavra.toLowerCase().replace(/[^a-z]/g, '');

            sessoesForca.set(chatId, {
                palavra,
                dica: dados.dica,
                tema,
                acertos: [],
                erradas: [],
                erros: 0
            });

            const display = '_ '.repeat(palavra.length).trim();

            await msg.react('✅');
            await client.sendMessage(chatId, `🪦 *JOGO DA FORCA — YUKON*
━━━━━━━━━━━━━━━━━━━━━
${DESENHO_FORCA[0]}

🎯 *Tema:* ${tema}
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