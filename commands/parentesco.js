// Variável temporária na memória para guardar quem está sendo "parentado"
const aguardandoParentesco = new Map();

module.exports = {
    name: 'parentesco',
    async execute(client, msg, { chatId, senderRaw, User, args }) {
        const autorId = String(senderRaw).trim();
        const mencoes = msg.mentionedIds;

        // ETAPA 2: Escolha do número
        if (args.length === 1 && !isNaN(args[0])) {
            const sessao = aguardandoParentesco.get(autorId);
            if (!sessao) return await msg.reply("❌ Use `/parentesco @alvo` primeiro.");

            const escolha = parseInt(args[0]);
            const graus = { 1: 'Tio/Tia', 2: 'Irmão/Irmã', 3: 'Primo/Prima', 4: 'Avô/Avó' };
            const grauNome = graus[escolha];

            if (!grauNome) return await msg.reply("❌ Opção inválida! Escolha de 1 a 4.");

            // Salva no banco
            await User.updateOne(
                { userId: autorId, groupId: chatId },
                { $push: { family: { userId: sessao.alvoId, role: grauNome } } }
            );

            await msg.reply(`✅ O(a) **${grauNome}** @${sessao.alvoId.split('@')[0]} entrou para a família!`, {
                mentions: [sessao.alvoId]
            });
            
            return aguardandoParentesco.delete(autorId);
        }

        // ETAPA 1: Mencionar a pessoa
        if (!mencoes.length) return await msg.reply("❓ Mencione o futuro parente.");
        
        const alvoId = String(mencoes[0]._serialized || mencoes[0]).trim();
        aguardandoParentesco.set(autorId, { alvoId });

        const menuParentesco = `
🧬 *REGISTRO DE PARENTESCO*
Escolha o nível para @${alvoId.split('@')[0]}:

1️⃣ Tio/Tia
2️⃣ Irmão/Irmã
3️⃣ Primo/Prima
4️⃣ Avô/Avó

👉 Digite \`/parentesco [número]\``;

        await msg.reply(menuParentesco, { mentions: [alvoId] });
    }
};