module.exports = {
    name: 'yukonshop',
    aliases: ['loja', 'shop'],
    async execute(client, msg, { chatId }) {
        try {
            let shopMsg = `🛒 *YUKON STATION - SHOP* ❄️\n`;
            shopMsg += `_Suba na hierarquia da nave agora!_\n`;
            shopMsg += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

            const patentes = [
                { n: "01", nome: "Impostor", preco: "500" },
                { n: "02", nome: "Cientista", preco: "1.000" },
                { n: "03", nome: "Capitão", preco: "5.000" },
                { n: "04", nome: "Especialista", preco: "10.000" },
                { n: "05", nome: "Veterano", preco: "25.000" },
                { n: "06", nome: "Comandante", preco: "50.000" },
                { n: "07", nome: "Elite Galáctica", preco: "80.000" },
                { n: "08", nome: "Guardião Estelar", preco: "120.000" },
                { n: "09", nome: "Viajante Dimensional", preco: "180.000" },
                { n: "10", nome: "Lorde das Estrelas", preco: "250.000" },
                { n: "11", nome: "Almirante de Frota", preco: "320.000" },
                { n: "12", nome: "Governador Planetário", preco: "400.000" },
                { n: "13", nome: "Lenda Estelar", preco: "500.000" }
            ];

            patentes.forEach(p => {
                shopMsg += `*${p.n}.* ${p.nome} — 💰 ${p.preco}\n`;
            });

            shopMsg += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
            shopMsg += `> 🛠️ *COMO ADQUIRIR:* Use o comando */comprar [número]*\n`;
            shopMsg += `> _Exemplo: /comprar 3 para Capitão_`;

            // Enviando com a imagem padrão de loja da Yukon
            await global.enviarMenuComFoto(msg, 'loja.jpg', shopMsg);

        } catch (err) {
            console.error("❌ Erro ao abrir a loja:", err);
            await msg.reply("⚠️ Ocorreu um erro ao acessar o catálogo da Yukon Shop.");
        }
    }
};