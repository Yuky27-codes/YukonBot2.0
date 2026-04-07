module.exports = {
    name: 'adotar',
    async execute(client, msg, { chatId, senderRaw, User }) {
        const mencoes = msg.mentionedIds;
        const autorId = String(senderRaw).trim();
        const autorData = await User.findOne({ userId: autorId, groupId: chatId });

        if (!mencoes.length) return await msg.reply("❓ Mencione quem deseja adotar como filho(a).");
        if (!autorData.marriedWith) return await msg.reply("❌ Apenas casais podem adotar filhos oficialmente.");

        const alvoId = String(mencoes[0]._serialized || mencoes[0]).trim();
        const conjugeId = autorData.marriedWith;

        // Adiciona o filho para AMBOS (Pai e Mãe)
        const novoFilho = { userId: alvoId, role: 'filho' };
        await User.updateOne({ userId: autorId, groupId: chatId }, { $push: { family: novoFilho } });
        await User.updateOne({ userId: conjugeId, groupId: chatId }, { $push: { family: novoFilho } });

        const textoAdocao = `
🍼 *NOVO TRIPULANTE NA FAMÍLIA!*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
O pequeno(a) @${alvoId.split('@')[0]} foi adotado(a) com sucesso!

👨‍👩‍👦 *Pais:* @${autorId.split('@')[0]} & @${conjugeId.split('@')[0]}
Que este novo membro traga muita alegria à cabine de vocês!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`.trim();

        await client.sendMessage(chatId, textoAdocao, { mentions: [alvoId, autorId, conjugeId] });
    }
};