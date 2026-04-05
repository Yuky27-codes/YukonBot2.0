module.exports = {
    name: 'menu_ia',
    async execute(client, msg) {
        try {
            const txtIA = `🧪 *LABORATÓRIO DE I.A.*
━━━━━━━━━━━━━━━━━━━━━━
💬 */ia* ou */bot* — Chat com a Yukon
✨ */resumir* — Resumo do Chat
━━━━━━━━━━━━━━━━━━━━━━`;

            // Verifica se a função global está disponível
            if (typeof global.enviarMenuComFoto === 'function') {
                await global.enviarMenuComFoto(msg, 'menu_ia.jpg', txtIA);
            } else {
                await msg.reply(txtIA);
            }

        } catch (err) {
            console.error("❌ ERRO NO MENU_IA:", err);
        }
    }
};