module.exports = {
    name: 'menu_util',
    async execute(client, msg) {
        try {
            const txtUtil = `╭━━━〔 📖 SISTEMA CENTRAL 〕━━━╮
◇ */iniciar* ➜ Iniciar sistemas da Yukon
◇ */painel* ➜ Abrir painel principal
◇ */resp* ➜ Responder quizzes ativos
◇ */perg* ➜ Fazer perguntas no Quem Sou Eu
◇ */palpite* ➜ Chutar letra na forca
◇ */adivinhar* ➜ Tentar descobrir a palavra
◇ */id_grupo* ➜ Obter ID do grupo
◇ */prefixo* [caractere] ➜ Define o prefixo
◇ */prefixo* remover ➜ Remove o prefixo customizado
◇ */prefixo* ➜ Mostra o prefixo atual
◇ */simbolo* ➜ Envia o símbolo do grupo
◇ */simbolo* [símbolo] ➜ ADMs definem o símbolo
◇ */simbolo* remover ➜ Remove o símbolo
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