module.exports = {
    name: 'menu_diversao',
    async execute(client, msg) {
        try {
            const txtDiv = `🎰 *CASSINO E ENTRETENIMENTO*
━━━━━━━━━━━━━━━━━━━━━━
🎲 */cassino* — Menu de Jogos
💸 */apostar* — Multiplicar Coins
🖼️ */f* — Figurinhas
🎰 */roleta / 21 / corrida*
━━━━━━━━━━━━━━━━━━━━━━`;

            // Chama a função global definida no seu index
            if (typeof global.enviarMenuComFoto === 'function') {
                await global.enviarMenuComFoto(msg, 'menu_diversao.jpg', txtDiv);
            } else {
                await msg.reply(txtDiv);
            }

        } catch (err) {
            console.error("❌ ERRO NO MENU_DIVERSAO:", err);
        }
    }
};