module.exports = {
    name: 'menu_economia',
    async execute(client, msg) {
        try {
            const txtEco = `╭━━━〔 💰 ECONOMIA E STATUS 〕━━━╮
◇ /perfil ➜ Ver suas informações
◇ /inventario ➜ Ver seus itens no grupo
◇ /rank ➜ Ranking de riqueza do grupo
◇ /rankglobal ➜ Ranking global da Yukon
◇ /missão ➜ Resgatar recompensa diária
◇ /yukonshop ➜ Abrir loja da Yukon
◇ /doar ➜ Transferir coins para outro usuário
◇ /protecao ➜ Proteger seus coins temporariamente
◇ /roubar ➜ Tentar roubar coins de alguém
◇ /banco depositar ➜ Depositar YukonCoins
◇ /banco sacar ➜ Sacar YukonCoins
◇ /banco extrato ➜ Ver histórico bancário
◇ /modocaos ➜ Ativar modo caos por 10 minutos
◇ /caixasurpresa ➜ Abrir uma caixa surpresa
◇ /pousar ➜ Explorar locais e obter recompensas
◇ /desafiodiario ➜ Completar desafio diário
◇ /imune ➜ Ativar proteção contra roubos
◇ /assinatura ➜ Ver status da assinatura
╰━━━━━━━━━━━━━━━━━━━━━━╯
`;

            // Chama a função global definida no seu index
            if (typeof global.enviarMenuComFoto === 'function') {
                await global.enviarMenuComFoto(msg, 'menu_economia.jpg', txtEco);
            } else {
                await msg.reply(txtEco);
            }

        } catch (err) {
            console.error("❌ ERRO NO MENU_ECONOMIA:", err);
        }
    }
};