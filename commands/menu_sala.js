module.exports = {
    name: 'menu_sala',
    async execute(client, msg) {
        try {
            const txtSala = `🎮 *GERENCIAMENTO DE SALA*
━━━━━━━━━━━━━━━━━━━━━━
🆔 */addsala* — Definir Código
👁️ */sala* — Ver Sala Atual
━━━━━━━━━━━━━━━━━━━━━━`;

            // Chama a função global definida no seu index
            if (typeof global.enviarMenuComFoto === 'function') {
                await global.enviarMenuComFoto(msg, 'menu_sala.jpg', txtSala);
            } else {
                await msg.reply(txtSala);
            }

        } catch (err) {
            console.error("❌ ERRO NO MENU_SALA:", err);
        }
    }
};