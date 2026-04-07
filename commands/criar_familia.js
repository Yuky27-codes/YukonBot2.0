module.exports = {
    name: 'criar_familia',
    async execute(client, msg, { chatId, senderRaw, User }) {
        const user = await User.findOne({ userId: senderRaw, groupId: chatId });
        
        if (!user || !user.marriedWith) {
            return await msg.reply("❌ *ERRO:* Você precisa estar casado(a) para fundar uma linhagem na Yukon Station!");
        }

        const conjugeId = user.marriedWith;
        const textoBoasVindas = `
👨‍👩‍👧‍👦 *YUKON FAMILY — REGISTRO CIVIL*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
O casal @${senderRaw.split('@')[0]} & @${conjugeId.split('@')[0]} criou uma família oficial!

✨ *A linhagem de vocês agora pode prosperar.*
Use \`/adotar\` ou \`/parentesco\` para crescer sua família e dominar a estação!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`.trim();

        await client.sendMessage(chatId, textoBoasVindas, { mentions: [senderRaw, conjugeId] });
    }
};