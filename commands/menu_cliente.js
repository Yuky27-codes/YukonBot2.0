module.exports = {
    name: 'menu_cliente',
    async execute(client, msg) {
        try {
            const txtCliente = `╭━━━〔 🛰️ CENTRAL DO CLIENTE YUKON 〕━━━╮
◇ */id_grupo* ➜ Obter ID do grupo (no grupo)

◇ */teste* ➜ Testar a Yukon por 24h grátis

◇ */vincular* ➜ Vincular grupo ao perfil

◇ */meu_plano* ➜ Ver plano e grupos vinculados

◇ */assinar* ➜ Escolher plano de assinatura

◇ */upgrade* ➜ Aumentar limite de grupos

◇ */indicar* ➜ Indicar a Yukon para um grupo e ganhar dias

◇ */pix* ➜ Gerar pagamento via PIX

◇ */suporte* ➜ FAQ e central de ajuda
╰━━━━━━━━━━━━━━━━━━━━━━╯

📌 **COMO TESTAR GRÁTIS (24H):**
1️⃣ Adicione a Yukon no seu grupo.
2️⃣ Digite */id_grupo* lá dentro e copie o ID.
3️⃣ Envie aqui no PV: */teste [ID_DO_GRUPO]*

_Nota: O teste gratuito de 24h é válido apenas uma única vez por grupo._
`;

            if (typeof global.enviarMenuComFoto === 'function') {
                await global.enviarMenuComFoto(msg, 'menu_cliente.jpg', txtCliente);
            } else {
                await msg.reply(txtCliente);
            }

        } catch (err) {
            console.error("❌ ERRO NO MENU_CLIENTE:", err);
        }
    }
};