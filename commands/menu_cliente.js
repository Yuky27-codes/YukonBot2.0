module.exports = {
    name: 'menu_cliente',
    async execute(client, msg) {
        try {
            const txtCliente = `🛰️ *CENTRAL DO CLIENTE YUKON*
━━━━━━━━━━━━━━━━━━━━━━
🛠️ **CONFIGURAÇÃO**
▶️ */id_grupo* — Pegar ID do grupo
▶️ */vincular* — Vincular grupo ao perfil
▶️ */meu_plano* — Ver status e grupos

💳 **ASSINATURA**
▶️ */assinar* — Escolher plano (1, 2 ou 3)
▶️ */upgrade* — Aumentar limite de grupos
▶️ */pix* — Gerar pagamento dinâmico

🆘 **SUPORTE**
▶️ */suporte* — FAQ e Passo a Passo
━━━━━━━━━━━━━━━━━━━━━━
📌 *DICA:* Primeiro use /id_grupo no seu grupo, depois venha aqui e use /vincular.`;

            // Mantendo o seu padrão de envio com foto
            if (typeof global.enviarMenuComFoto === 'function') {
                // Substitua 'banner_cliente.jpg' pelo nome do seu arquivo de imagem
                await global.enviarMenuComFoto(msg, 'menu_cliente.jpg', txtCliente);
            } else {
                await msg.reply(txtCliente);
            }

        } catch (err) {
            console.error("❌ ERRO NO MENU_CLIENTE:", err);
        }
    }
};