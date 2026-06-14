module.exports = {
    name: 'menu_social',
    async execute(client, msg) {
        try {
            const txtSoc = `╭━━━〔 💘 MÓDULO SOCIAL 〕━━━╮
◇ */ship* ➜ Descobrir compatibilidade amorosa
◇ */amizade* ➜ Ver pontos de amizade
◇ */casar* ➜ Pedir alguém em casamento
◇ */casais* ➜ Ver casais do grupo
◇ */divorciar* ➜ Encerrar casamento
◇ */beijar* ➜ Dar um beijo em alguém
◇ */tapa* ➜ Dar um tapa em alguém
◇ */chutar* ➜ Chutar alguém
◇ */abraçar* ➜ Abraçar alguém
◇ */criar_familia* ➜ Criar uma família
◇ */adotar* ➜ Adotar um membro
◇ */parentesco* ➜ Definir parentesco
◇ */heranca* ➜ Deixar herança para a família
◇ */mesada* ➜ Dar mesada aos filhos
◇ */deserdar* ➜ Remover membro da família
◇ */amante* ➜ Ter um relacionamento secreto
◇ */meu_amante* ➜ Ver seu amante
◇ */dar_flores* ➜ Enviar flores para alguém
◇ */meu_aniver* ➜ Definir aniversário
◇ */aceitarp* ➜ Aceitar pedido de casamento
◇ */aceitard* ➜ Confirmar divórcio
◇ */lista_aniver* ➜ Ver aniversariantes
╰━━━━━━━━━━━━━━━━━━━━━━╯
`;

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