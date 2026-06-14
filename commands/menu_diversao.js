module.exports = {
    name: 'menu_diversao',
    async execute(client, msg) {
        try {
            const txtDiv = `╭━━━〔 🎰 CASSINO E ENTRETENIMENTO 〕━━━╮
◇ */cassino* ➜ Abrir menu de jogos
◇ */apostar* ➜ Apostar YukonCoins
◇ */roleta* ➜ Jogar na roleta
◇ */21* ➜ Jogar vinte e um
◇ */corrida* ➜ Apostar em corridas
◇ */f* ➜ Criar figurinhas
◇ */modo* ➜ Ver detalhes de um modo
◇ */modos* ➜ Listar modos disponíveis
◇ */humor* ➜ Receber uma piada aleatória
◇ */cantadas* ➜ Receber uma cantada aleatória
◇ */frasemotivacional* ➜ Receber uma frase motivacional
◇ */curiosidades* ➜ Receber uma curiosidade aleatória
◇ */matar* ➜ Aplicar um golpe fatal em alguém
◇ */encontro* ➜ Simular encontro entre membros
◇ */adotarpet* ➜ Adotar um animal de estimação
◇ */pet alimentar* ➜ Alimentar seu pet
◇ */pet carinho* ➜ Fazer carinho no pet
◇ */pet brincar* ➜ Brincar com seu pet
◇ */pet status* ➜ Ver informações do pet
◇ */jogovelha* ➜ Desafiar alguém para jogar
╰━━━━━━━━━━━━━━━━━━━━━━╯
`;

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