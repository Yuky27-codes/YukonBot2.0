module.exports = {
    name: 'menu_sala',
    async execute(client, msg) {
        try {
            const txtSala = `╭━━━〔 🎮 GERENCIAMENTO DE SALA 〕━━━╮
◇ */addsala* ➜ Definir código da sala
◇ */sala* ➜ Ver sala configurada
◇ */parceria [code] ou [Nome]* ➜ fechar parceria com outro grupo
◇ */parceriaCode* ➜ Gerar código de parceria para outro grupo
◇ */parcerias* ➜ Ver parcerias do grupo
◇ */parceriadel [code] ou [Nome]* ➜ Remover parceria com outro grupo
◇ */addsalap* ➜ Definir código da sala parceira
◇ */sapap* ➜ Ver sala parceira configurada
◇ */fsala* ➜ fecha a sala parceira
◇ */criar evento* ➜ Criar evento no grupo
◇ */infor evento* ➜ Informações do evento
◇ */evento* ➜ Ver o evento do grupo
◇ */participar* ➜ Entrar pra lista de participantes do evento
◇ */confirmarp* ➜ Confirmar presença no evento
◇ */listaevento* ➜ Ver lista de participantes do evento
◇ */comecar evento* ➜ Iniciar o evento (apenas admins)
◇ */finalizar evento* ➜ Finalizar o evento (apenas admins)
╰━━━━━━━━━━━━━━━━━━━━━━╯
`;

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