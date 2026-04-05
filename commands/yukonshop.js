module.exports = {
    name: 'yukonshop',
    aliases: ['loja'], // Caso você adicione o suporte a apelidos no index
    async execute(client, msg, { chatId }) {
        try {
            // Já estamos recebendo o chatId higienizado do seu index.js
            const shopMsg = `🛒 *YUKON SHOP - PATENTES* ❄️
Suba na hierarquia da nave agora!

1️⃣ *Impostor* - 💰 500
2️⃣ *Cientista* - 💰 1.000
3️⃣ *Capitão* - 💰 5.000
4️⃣ *Especialista* - 💰 10.000
5️⃣ *Veterano* - 💰 25.000
6️⃣ *Comandante* - 💰 50.000
7️⃣ *Elite Galáctica* - 💰 80.000
8️⃣ *Guardião Estelar* - 💰 120.000
9️⃣ *Viajante Dimensional* - 💰 180.000
🔟 *Lorde das Estrelas* - 💰 250.000
1️⃣1️⃣ *Almirante de Frota* - 💰 320.000
1️⃣2️⃣ *Governador Planetário* - 💰 400.000
1️⃣3️⃣ *Lenda Estelar* - 💰 500.000

Use */comprar [numero]* para adquirir!`;

            // Envio via client para evitar erros de renderização
            await client.sendMessage(chatId, shopMsg, { sendSeen: false });

        } catch (err) {
            console.error("❌ Erro ao abrir a loja:", err);
        }
    }
};