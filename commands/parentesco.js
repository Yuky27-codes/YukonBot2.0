// Variável temporária na memória (fora do module.exports)
const aguardandoParentesco = new Map();

module.exports = {
    name: 'parentesco',
    async execute(client, msg, { chatId, senderRaw, User, args }) {
        try {
            const autorId = String(senderRaw).trim();
            const mencoes = msg.mentionedIds;

            // --- ETAPA 2: Escolha do número (Ex: /parentesco 1) ---
            if (args.length === 1 && !isNaN(args[0]) && !msg.body.includes('@')) {
                const sessao = aguardandoParentesco.get(autorId);
                
                if (!sessao) {
                    return await client.sendMessage(chatId, "❌ *ERRO:* Use `/parentesco @alvo` primeiro para selecionar a pessoa.");
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

                // --- LOGICA DE SINCRONIZAÇÃO ---
                const autorData = await User.findOne({ userId: autorId, groupId: chatId });
                const alvosParaAtualizar = [autorId];

                // Se o autor estiver casado, o parente entra para o cônjuge também
                if (autorData && autorData.marriedWith) {
                    alvosParaAtualizar.push(autorData.marriedWith);
                }

                // Salva no banco para ambos
                await User.updateMany(
                    { userId: { $in: alvosParaAtualizar }, groupId: chatId },
                    { $push: { family: { userId: alvoIdFinal, role: grauNome } } }
                );

                // Limpa a sessão da memória
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

            // Salva na memória quem é o alvo desse autor
            aguardandoParentesco.set(autorId, { alvoId: alvoId });

            const menuParentesco = `
🧬 *REGISTRO DE PARENTESCO*
Escolha o nível para @${alvoId.split('@')[0]}:

1️⃣ Tio/Tia
2️⃣ Irmão/Irmã
3️⃣ Primo/Prima
4️⃣ Avô/Avó

👉 Digite: */parentesco [número]*`.trim();

            await client.sendMessage(chatId, menuParentesco, { 
                mentions: [alvoId] 
            });

        } catch (e) {
            console.error("❌ Erro no comando parentesco:", e);
            await msg.reply("❌ Ocorreu um erro no sistema de DNA da Yukon.");
        }
    }
};