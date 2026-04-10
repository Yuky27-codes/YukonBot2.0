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
👨‍👩‍👧‍👦 */criar_familia* — Criar uma família
👼 */adotar* — Adotar um membro como filho(a)
🤝 */parentesco* — Definir grau de parentesco
💸 */heranca* — Deixar herança para a família
🪙 */mesada* — Dar mesada para filhos
🤫 */amante* — Ter um relacionamento secreto
💑 */meu_amante* — Ver quem é seu amante
🌹 */dar_flores* — Enviar flores para um membro
🎉 */meu_aniver* — Definir sua data de aniversário
🎂 */lista_aniver* — Ver aniversariantes
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