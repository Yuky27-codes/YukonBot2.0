module.exports = {
    name: 'menu_cliente',
    async execute(client, msg) {
        try {
            const txtCliente = `╭━━━〔 🛰️ CENTRAL DO CLIENTE YUKON 〕━━━╮
◇ /id_grupo ➜ Obter ID do grupo
◇ /vincular ➜ Vincular grupo ao perfil
◇ /meu_plano ➜ Ver plano e grupos vinculados
◇ /assinar ➜ Escolher plano de assinatura
◇ /upgrade ➜ Aumentar limite de grupos
◇ /pix ➜ Gerar pagamento via PIX
◇ /suporte ➜ FAQ e central de ajuda
╰━━━━━━━━━━━━━━━━━━━━━━╯

📌 Dica: Utilize /id_grupo no grupo que deseja vincular e depois use /vincular no privado da Yukon.
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