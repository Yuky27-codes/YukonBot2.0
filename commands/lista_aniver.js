module.exports = {
    name: 'lista_aniver',
    async execute(client, msg, { chatId, User }) {
        try {
            const usuarios = await User.find({ groupId: chatId, birthday: { $ne: null } }).lean();

            if (usuarios.length === 0) return await msg.reply("📂 *SISTEMA:* Nenhum aniversário registrado neste grupo.");

            // Ordenação por mês e depois dia
            const listaOrdenada = usuarios.sort((a, b) => {
                const [diaA, mesA] = a.birthday.split('/').map(Number);
                const [diaB, mesB] = b.birthday.split('/').map(Number);
                return mesA - mesB || diaA - diaB;
            });

            let texto = "🗓️ *AGENDA DE ANIVERSÁRIOS YUKON*\n━━━━━━━━━━━━━━━━━━━━━\n";
            listaOrdenada.forEach(u => {
                texto += `• ${u.birthday} - @${u.userId.split('@')[0]}\n`;
            });

            await client.sendMessage(chatId, texto, { mentions: usuarios.map(u => u.userId) });
        } catch (e) { console.error(e); }
    }
};