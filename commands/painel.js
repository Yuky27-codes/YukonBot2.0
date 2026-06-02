module.exports = {
    name: 'painel',
    async execute(client, msg) {
        try {
            const menuPrincipal = `╭━━━〔 🚀 YUKONBOT • CENTRAL DE COMANDO 〕━━━╮

Olá, tripulante! Escolha um setor para navegar:

◇ /menu_adm ➜ Segurança e moderação
◇ /menu_ia ➜ Laboratório de I.A.
◇ /menu_economia ➜ Economia e status
◇ /menu_diversao ➜ Cassino e entretenimento
◇ /menu_social ➜ Relacionamentos e família
◇ /menu_sala ➜ Gerenciamento de sala
◇ /menu_util ➜ Sistema central
◇ /menu_cliente ➜ Assinaturas e suporte

╰━━━━━━━━━━━━━━━━━━━━━━╯

📌 Utilize o comando do setor desejado para visualizar todos os recursos disponíveis.
`;

            // Chama a função global que você já tem no index
            if (typeof global.enviarMenuComFoto === 'function') {
                await global.enviarMenuComFoto(msg, 'painel.jpg', menuPrincipal);
            } else {
                // Fallback caso a função de foto não seja encontrada
                await msg.reply(menuPrincipal);
            }

        } catch (err) {
            console.error("❌ ERRO NO COMANDO PAINEL:", err);
        }
    }
};