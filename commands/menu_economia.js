module.exports = {
    name: 'menu_economia',
    async execute(client, msg) {
        try {
            const txtEco = `💰 *ECONOMIA E STATUS*
━━━━━━━━━━━━━━━━━━━━━━
👤 */perfil* — Seus Dados
🏆 */rank* — Ricos do Grupo
🌎 */rankglobal* — Ricos de Yukon
📅 */missão* — Coleta Diária
🛒 */yukonshop* — Loja
━━━━━━━━━━━━━━━━━━━━━━`;

            // Chama a função global definida no seu index
            if (typeof global.enviarMenuComFoto === 'function') {
                await global.enviarMenuComFoto(msg, 'menu_economia.jpg', txtEco);
            } else {
                await msg.reply(txtEco);
            }

        } catch (err) {
            console.error("❌ ERRO NO MENU_ECONOMIA:", err);
        }
    }
};