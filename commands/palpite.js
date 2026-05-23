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

module.exports = {
    name: 'palpite',
    async execute(client, msg, { chatId, senderRaw, args, User }) {
        try {
            const autorId = String(senderRaw).trim();

            if (!sessoesForca.has(chatId)) {
                return await client.sendMessage(chatId, "⚠️ Não há forca ativa!\nUse */forca [tema]* para iniciar.");
            }

            const letra = args[0]?.toLowerCase().replace(/[^a-z]/g, '');
            if (!letra || letra.length !== 1) {
                return await client.sendMessage(chatId, "❌ Digite apenas UMA letra!\n_Exemplo: /palpite A_");
            }

            const s = sessoesForca.get(chatId);

            // Letra já tentada
            if (s.acertos.includes(letra) || s.erradas.includes(letra)) {
                return await client.sendMessage(chatId, `⚠️ A letra *${letra.toUpperCase()}* já foi tentada!`);
            }

            const display = (acertos) => s.palavra.split('').map(l => acertos.includes(l) ? l.toUpperCase() : '_').join(' ');

            if (s.palavra.includes(letra)) {
                s.acertos.push(letra);

                // Verifica vitória
                const ganhou = s.palavra.split('').every(l => s.acertos.includes(l));

                if (ganhou) {
                    sessoesForca.delete(chatId);
                    await User.updateOne({ userId: autorId, groupId: chatId }, { $inc: { coins: 500 } });
                    return await client.sendMessage(chatId, `🎉 *@${autorId.split('@')[0]} completou a palavra!*
━━━━━━━━━━━━━━━━━━━━━
✅ *${s.palavra.toUpperCase()}*
💰 *+500 YC* adicionados!
━━━━━━━━━━━━━━━━━━━━━
Use */forca [tema]* para jogar novamente!`, { mentions: [autorId] });
                }

                await client.sendMessage(chatId, `✅ *Letra ${letra.toUpperCase()} está na palavra!*
${DESENHO_FORCA[s.erros]}

📝 *Palavra:* ${display(s.acertos)}
❌ *Erros (${s.erros}/6):* ${s.erradas.join(', ') || 'nenhum'}

👉 */palpite [letra]* ou */adivinhar [palavra]*`);

            } else {
                s.erradas.push(letra);
                s.erros++;

                if (s.erros >= 6) {
                    sessoesForca.delete(chatId);
                    return await client.sendMessage(chatId, `💀 *GAME OVER!*
${DESENHO_FORCA[6]}

😢 @${autorId.split('@')[0]} errou e o boneco morreu!
✅ A palavra era: *${s.palavra.toUpperCase()}*

Use */forca [tema]* para tentar novamente!`, { mentions: [autorId] });
                }

                await client.sendMessage(chatId, `❌ *Letra ${letra.toUpperCase()} não está na palavra!*
${DESENHO_FORCA[s.erros]}

📝 *Palavra:* ${display(s.acertos)}
❌ *Erros (${s.erros}/6):* ${s.erradas.join(', ')}

👉 */palpite [letra]* ou */adivinhar [palavra]*`);
            }

        } catch (e) {
            console.error("❌ Erro no /palpite:", e);
            await client.sendMessage(chatId, "⚠️ Erro ao processar a jogada.");
        }
    }
};