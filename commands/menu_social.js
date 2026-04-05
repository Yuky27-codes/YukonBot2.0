module.exports = {
    name: 'menu_social',
    async execute(client, msg) {
        try {
            const txtSoc = `💘 *MÓDULO SOCIAL*
━━━━━━━━━━━━━━━━━━━━━━
💖 */ship* — Romance
😊 */amizade* - Ver pontos de amizade 
💍 */casar* — Casamento
📜 */casais* — Lista de Casados
💔 */divorciar* — Separação
💋 */beijar* — Beijo
👊 */tapa / chutar / abraçar*
━━━━━━━━━━━━━━━━━━━━━━`;

            // Chama a função global definida no seu index
            if (typeof global.enviarMenuComFoto === 'function') {
                await global.enviarMenuComFoto(msg, 'menu_social.jpg', txtSoc);
            } else {
                await msg.reply(txtSoc);
            }

        } catch (err) {
            console.error("❌ ERRO NO MENU_SOCIAL:", err);
        }
    }
};