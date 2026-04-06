module.exports = {
    name: 'meu_aniver',
    async execute(client, msg, { args, chatId, senderRaw, User }) {
        const data = args[0]; // Espera "10/05"
        
        // Validação simples de formato DD/MM
        const regex = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])$/;
        if (!data || !regex.test(data)) {
            return await msg.reply("❌ *SISTEMA:* Use o formato correto: `/meu_aniver DD/MM` (Ex: `/meu_aniver 10/05`)!");
        }

        try {
            await User.updateOne(
                { userId: senderRaw, groupId: chatId },
                { $set: { birthday: data } },
                { upsert: true }
            );
            await msg.reply(`🎂 *YUKON:* Data de aniversário registrada com sucesso: *${data}*!`);
        } catch (e) {
            console.error(e);
        }
    }
};