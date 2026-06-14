module.exports = {
    name: 'menu_ia',
    async execute(client, msg) {
        try {
            const txtIA = `╭━━━〔 🧪 LABORATÓRIO DE I.A. 〕━━━╮
◇ */ia* ➜ Conversar com a Yukon
◇ */resumir* ➜ Gerar resumo da conversa
◇ */quiz geral* ➜ Receber pergunta aleatória
◇ */quiz emoji* ➜ Adivinhar filmes e personagens
◇ */quiz materias* ➜ Quiz sobre matérias escolares
◇ */quiz embaralhada* ➜ Descobrir palavra embaralhada
◇ */quiz frases* ➜ Completar frases e ditados
◇ */quemsoueu* ➜ Descobrir personagem pensado pela IA
◇ */forca* ➜ Jogar forca contra a IA
╰━━━━━━━━━━━━━━━━━━━━━━╯
`;

            // Verifica se a função global está disponível
            if (typeof global.enviarMenuComFoto === 'function') {
                await global.enviarMenuComFoto(msg, 'menu_ia.jpg', txtIA);
            } else {
                await msg.reply(txtIA);
            }

        } catch (err) {
            console.error("❌ ERRO NO MENU_IA:", err);
        }
    }
};