module.exports = {
    name: 'menu_adm',
    async execute(client, msg) {
        try {
            const txtAdm = `🛡️ *SETOR DE SEGURANÇA*
━━━━━━━━━━━━━━━━━━━━━━
⚠️ */adv* — Advertir
📋 */listaadv* — Ver Lista de Avisos
❌ */rmadv* — Remover Advertência
⛔ */ban* — Banir
🚫 */banblack* — Blacklist Permanente
🔓 */unbanblack* — Remover Blacklist
📋 */blacklist* — Ver Inimigos
🔇 */mute / desmute* — Silenciar Chat
🤐 */mutep / desmutep* — Mute no Banco
🔼 */promover* — Tornar Administrador
🔽 */rebaixar* — Remover Administração
📣 */todos* — Marcar Todos
🆔 */id* — Ver Dados Técnicos
━━━━━━━━━━━━━━━━━━━━━━`;

            // Chama a função global que está no seu index
            if (typeof global.enviarMenuComFoto === 'function') {
                await global.enviarMenuComFoto(msg, 'menu_adm.jpg', txtAdm);
            } else {
                await msg.reply(txtAdm);
            }

        } catch (err) {
            console.error("❌ ERRO NO MENU_ADM:", err);
        }
    }
};