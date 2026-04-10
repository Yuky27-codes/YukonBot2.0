module.exports = {
    name: 'menu_util',
    async execute(client, msg) {
        try {
            const txtUtil = `📖 *SISTEMA CENTRAL*
━━━━━━━━━━━━━━━━━━━━━━
▶️ */iniciar* — Iniciar Bot
📊 */painel* — Menu Principal
━━━━━━━━━━━━━━━━━━━━━━`;

            // Chama a função global definida no seu index
            if (typeof global.enviarMenuComFoto === 'function') {
                await global.enviarMenuComFoto(msg, 'menu_util.jpg', txtUtil);
            } else {
                await msg.reply(txtUtil);
            }

        } catch (err) {
            console.error("❌ ERRO NO MENU_UTIL:", err);
        }
    }
};