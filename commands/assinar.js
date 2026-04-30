// commands/assinar.js
module.exports = {
    name: 'assinar',
    async execute(client, msg, { chatId }) {
        const texto = `🛰️ *CENTRAL DE ASSINATURAS YUKON*
━━━━━━━━━━━━━━━━━━━━━
Escolha um plano para manter sua estação ativa:

🚀 *Plano Astronauta* (15 dias)
💰 Valor: **R$ 10,00**

👨‍🚀 *Plano Comandante* (30 dias)
💰 Valor: **R$ 30,00** (Desconto!)

🌌 *Plano Intergaláctico* (60 dias)
💰 Valor: **R$ 50,00**

━━━━━━━━━━━━━━━━━━━━━
📌 *COMO PAGAR:*
1. Faça o Pix para a chave: \`devyuky7@gmail.com\`
2. Envie o **print do comprovante** aqui no chat.

_Após o envio, nossa equipe analisará o pagamento em instantes!_`;

        return msg.reply(texto);
    }
};