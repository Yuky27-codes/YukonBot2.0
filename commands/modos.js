module.exports = {
    name: 'modos',
    async execute(client, msg, { chatId, Modo }) {
        const lista = await Modo.find({ groupId: chatId });

        if (lista.length === 0) {
            return await msg.reply("📂 *Vazio:* Nenhum modo customizado foi criado para este grupo.");
        }

        let texto = `*╭━ ⌈ 🤖 LISTA DE MODOS — YUKONBOT 🚀 ⌋ ━╮*\n`;
        texto += `*┃ _Sistema de modos carregado com sucesso..._\n`;
        texto += `*┣━━━━━━━━━━━━━━━━━━━━━━*\n`;

        lista.forEach((m, index) => {
            texto += `*┃ 🌌 ${String(index + 1).padStart(2, '0')}.* 「 *${m.nome.toUpperCase()}* 」\n`;
        });

        texto += `*┣━━━━━━━━━━━━━━━━━━━━━━*\n`;
        texto += `*┃ 📊 𝗧𝗼𝘁𝗮𝗹 𝗱𝗲 𝗠𝗼𝗱𝗼𝘀:* ${lista.length}\n`;
        texto += `*╰━━━━━━━━━━━━━━━━━━━━━━*\n\n`;
        texto += `> 🤖 Digite /modo {número do modo} para visualizar os detalhes e instruções de uso...`;

        await global.enviarMenuComFoto(msg, 'modos.jpg', texto);
    }
};