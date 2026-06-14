module.exports = {
    name: 'menu_adm',
    async execute(client, msg) {
        try {
            const txtAdm = `╭━━━〔 🛡️ SETOR DE SEGURANÇA 〕━━━╮

◇ */adv* ➜ Advertir membro
◇ */listaadv* ➜ Ver advertências
◇ */rmadv* ➜ Remover advertência
◇ */ban* ➜ Banir membro
◇ */banblack* ➜ Banir permanentemente
◇ */unbanblack* ➜ Remover banimento permanente
◇ */blacklist* ➜ Ver lista de banidos
◇ */mute* ➜ Silenciar chat
◇ */desmute* ➜ Remover silenciamento
◇ */mutep* ➜ Mutar no sistema
◇ */desmutep* ➜ Desmutar no sistema
◇ */promover* ➜ Tornar administrador
◇ */rebaixar* ➜ Remover administração
◇ */todos* ➜ Marcar todos os membros
◇ */id* ➜ Ver dados técnicos
◇ */addcoins* ➜ Adicionar YukonCoins
◇ */rmvcoins* ➜ Remover YukonCoins
◇ */lock* ➜ Restringir uso da Yukon
◇ */unlock* ➜ Liberar uso da Yukon
◇ */addmodo* ➜ Criar novo modo
◇ */editmodo* ➜ Editar modo
◇ */delmodo* ➜ Excluir modo
◇ */confmodos* ➜ Configurar sistema de modos
◇ */monitorar* ➜ Informações do grupo
◇ */checar* ➜ Ver atividade de membro
╰━━━━━━━━━━━━━━━━━━━━━━╯
`;

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