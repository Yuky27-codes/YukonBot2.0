module.exports = {
    name: 'familia',
    async execute(client, msg, { chatId, senderRaw, User }) {
        const user = await User.findOne({ userId: senderRaw, groupId: chatId });
        if (!user) return;

        const conjugeNome = user.marriedWith ? `@${user.marriedWith.split('@')[0]}` : "Solteiro(a)";
        const filhos = user.family.filter(p => p.role === 'filho');
        const parentes = user.family.filter(p => p.role !== 'filho');

        let texto = `👨‍👩‍👧‍👦 *FAMÍLIA YUKON*\n`;
        texto += `━━━━━━━━━━━━━━━━━━━━━\n`;
        texto += `💍 *CASAL:* @${senderRaw.split('@')[0]} & ${conjugeNome}\n\n`;
        
        texto += `👶 *FILHOS [${filhos.length}]:*\n`;
        filhos.forEach(f => texto += `• @${f.userId.split('@')[0]}\n`);

        texto += `\n🧬 *PARENTES:*\n`;
        parentes.forEach(p => texto += `• @${p.userId.split('@')[0]} (${p.role})\n`);
        
        texto += `━━━━━━━━━━━━━━━━━━━━━`;

        const mentions = [senderRaw, ...user.family.map(p => p.userId)];
        if (user.marriedWith) mentions.push(user.marriedWith);

        // Usando sua função de imagem
        await global.enviarMenuComFoto({ from: chatId }, 'familia.jpg', texto, mentions);
    }
};
