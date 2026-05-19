// ✅ CORRIGIDO: Map agora armazena o alvoId + timestamp para expirar em 5 minutos
const aguardandoParentesco = new Map();
const TIMEOUT_MS = 5 * 60 * 1000; // 5 minutos

module.exports = {
    name: 'parentesco',
    async execute(client, msg, { chatId, senderRaw, User, args }) {
        try {
            const autorId = String(senderRaw).trim();
            const mencoes = msg.mentionedIds;

            // --- ETAPA 2: Escolha do número (Ex: /parentesco 1) ---
            if (args.length === 1 && !isNaN(args[0]) && !msg.body.includes('@')) {
                const sessao = aguardandoParentesco.get(autorId);

                // ✅ CORRIGIDO: verifica se a sessão existe E se não expirou
                if (!sessao) {
                    return await client.sendMessage(chatId, "❌ *ERRO:* Use `/parentesco @alvo` primeiro para selecionar a pessoa.");
                }

                if (Date.now() - sessao.timestamp > TIMEOUT_MS) {
                    aguardandoParentesco.delete(autorId);
                    return await client.sendMessage(chatId, "⏳ *SESSÃO EXPIRADA:* O tempo para escolher o parentesco acabou. Use `/parentesco @alvo` novamente.");
                }

                const escolha = parseInt(args[0]);
                const graus = {
                    1: 'Tio/Tia',
                    2: 'Irmão/Irmã',
                    3: 'Primo/Prima',
                    4: 'Avô/Avó'
                };

                const grauNome = graus[escolha];
                if (!grauNome) return await msg.reply("❌ Opção inválida! Escolha de 1 a 4.");

                const alvoIdFinal = String(sessao.alvoId).trim();

                const autorData = await User.findOne({ userId: autorId, groupId: chatId });
                const alvosParaAtualizar = [autorId];

                if (autorData && autorData.marriedWith) {
                    alvosParaAtualizar.push(autorData.marriedWith);
                }

                await User.updateMany(
                    { userId: { $in: alvosParaAtualizar }, groupId: chatId },
                    { $push: { family: { userId: alvoIdFinal, role: grauNome } } }
                );

                // ✅ CORRIGIDO: sessão sempre removida após conclusão
                aguardandoParentesco.delete(autorId);

                return await client.sendMessage(chatId, `✅ O(a) *${grauNome}* @${alvoIdFinal.split('@')[0]} entrou para a família!`, {
                    mentions: [alvoIdFinal]
                });
            }

            // --- ETAPA 1: Mencionar a pessoa (Ex: /parentesco @pessoa) ---
            if (mencoes.length === 0) {
                return await msg.reply("❓ *COMO USAR:*\n1º: `/parentesco @tripulante`\n2º: Escolha o número de 1 a 4.");
            }

            const alvoRaw = mencoes[0]._serialized || mencoes[0];
            const alvoId = String(alvoRaw).trim();

            if (alvoId === autorId) return await msg.reply("❌ Você não pode ser seu próprio parente.");

            // ✅ CORRIGIDO: salva timestamp junto com o alvoId
            aguardandoParentesco.set(autorId, { alvoId, timestamp: Date.now() });

            const menuParentesco = `
🧬 *REGISTRO DE PARENTESCO*
Escolha o nível para @${alvoId.split('@')[0]}:

1️⃣ Tio/Tia
2️⃣ Irmão/Irmã
3️⃣ Primo/Prima
4️⃣ Avô/Avó

👉 Digite: */parentesco [número]*
_⏳ Você tem 5 minutos para escolher._`.trim();

            await client.sendMessage(chatId, menuParentesco, {
                mentions: [alvoId]
            });

        } catch (e) {
            console.error("❌ Erro no comando parentesco:", e);
            await msg.reply("❌ Ocorreu um erro no sistema de DNA da Yukon.");
        }
    }
};