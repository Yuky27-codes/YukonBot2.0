module.exports = {
    name: 'painel',
    async execute(client, msg) {
        try {
            const menuPrincipal = `🚀 *YUKONBOT — CENTRAL DE COMANDO* 🚀
━━━━━━━━━━━━━━━━━━━━━━

Olá tripulante! Escolha um setor para navegar:

🛡️ */menu_adm* — Segurança e Moderação
🧪 */menu_ia* — Laboratório de I.A.
💰 */menu_economia* — Mineração e Ranking
🎰 */menu_diversao* — Cassino e Jogos
💘 */menu_social* — Relacionamentos
🎮 */menu_sala* — Gerenciamento de Sala
📖 */menu_util* — Utilidades Gerais

━━━━━━━━━━━━━━━━━━━━━━`;

            // Chama a função global que você já tem no index
            if (typeof global.enviarMenuComFoto === 'function') {
                await global.enviarMenuComFoto(msg, 'painel.jpg', menuPrincipal);
            } else {
                // Fallback caso a função de foto não seja encontrada
                await msg.reply(menuPrincipal);
            }

        } catch (err) {
            console.error("❌ ERRO NO COMANDO PAINEL:", err);
        }
    }
};