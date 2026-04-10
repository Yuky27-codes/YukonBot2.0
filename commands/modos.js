module.exports = {
    name: 'modos',
    async execute(client, msg, { chatId, Modo }) {
        try {
            const lista = await Modo.find({ groupId: chatId });

            if (lista.length === 0) {
                return await msg.reply("📂 *SISTEMA VAZIO:* Nenhum modo customizado foi encontrado nos registros deste grupo.");
            }

            let texto = `*╭━ ⌈ 🤖 LISTA DE MODOS — YUKON STATION 🚀 ⌋ ━╮*\n`;
            texto += `*┃ _Arquivos carregados com sucesso..._\n`;
            texto += `*┣━━━━━━━━━━━━━━━━━━━━━━*\n`;

            lista.forEach((m, index) => {
                // Formatação: 01, 02, 03...
                const numero = String(index + 1).padStart(2, '0');
                texto += `*┃ 🌌 ${numero}.* 「 *${m.nome.toUpperCase()}* 」\n`;
            });

            texto += `*┣━━━━━━━━━━━━━━━━━━━━━━*\n`;
            texto += `*┃ 📊 𝗧𝗼𝘁𝗮𝗹 𝗱𝗲 𝗠𝗼𝗱𝗼𝘀:* ${lista.length}\n`;
            texto += `*╰━━━━━━━━━━━━━━━━━━━━━━*\n\n`;
            texto += `> 🤖 Digite */modo [número]* para visualizar os detalhes e instruções de uso.`;

            // Certifique-se de que a imagem 'modos.jpg' está na pasta /assets
            await global.enviarMenuComFoto(msg, 'modos.jpg', texto);

        } catch (error) {
            console.error("❌ Erro ao listar modos:", error);
            await msg.reply("⚠️ Falha crítica ao acessar o banco de dados de modos.");
        }
    }
};