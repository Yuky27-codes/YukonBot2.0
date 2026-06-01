module.exports = {
    name: 'menu_util',
    async execute(client, msg) {
        try {
            const txtUtil = `╭━━━〔 📖 SISTEMA CENTRAL 〕━━━╮
◇ /iniciar ➜ Iniciar sistemas da Yukon
◇ /painel ➜ Abrir painel principal
◇ /resp ➜ Responder quizzes ativos
◇ /perg ➜ Fazer perguntas no Quem Sou Eu
◇ /palpite ➜ Chutar letra na forca
◇ /adivinhar ➜ Tentar descobrir a palavra
╰━━━━━━━━━━━━━━━━━━━━━━╯
`;

            if (typeof global.enviarMenuComFoto === 'function') {
                await global.enviarMenuComFoto(msg, 'menu_util.jpg', txtUtil);
            } else {
                await msg.reply(txtUtil);
            }

        } catch (err) {
            console.error("❌ ERRO NO MENU_UTIL:", err);
        }
    }
};