module.exports = {
    name: 'teste',
    async execute(client, msg, { args, chatId }) {
        // Bloqueia se tentarem usar dentro de um grupo (tem que ser no PV)
        if (chatId.endsWith('@g.us')) {
            return msg.reply("❌ Por segurança, utilize o comando de teste apenas no meu chat privado (PV).");
        }

        const idGrupo = args[0];

        // Validação básica do ID
        if (!idGrupo || !idGrupo.includes('@g.us')) {
            return msg.reply(`⚠️ *FORMATO INVÁLIDO*
Para ativar o seu teste gratuito, você precisa informar o ID do grupo correto.

*Exemplo:* \`/teste 120363000000000000@g.us\`

💡 *Como conseguir o ID?* Adicione a Yukon no seu grupo e digite \`/id_grupo\` lá dentro.`);
        }

        try {
            const mongoose = require('mongoose');
            const AuthorizedGroup = mongoose.model('AuthorizedGroup');

            // Busca o registro do grupo no banco
            let grupoAuth = await AuthorizedGroup.findOne({ groupId: idGrupo });

            // Trava anti-trapaça: Se já fez teste antes, bloqueia!
            if (grupoAuth && grupoAuth.jaFezTeste === true) {
                return msg.reply(`🚫 *TESTE JÁ UTILIZADO*
━━━━━━━━━━━━━━━━━━━━━
Este grupo (\`${idGrupo}\`) já resgatou o período de teste gratuito de 24 horas anteriormente. 

Para continuar utilizando a Yukon sem interrupções, adquira uma de nossas assinaturas definitivas.`);
            }

            // Define o tempo de expiração para exatamente 24 horas a partir de agora
            const tempoTeste = new Date(Date.now() + 24 * 60 * 60 * 1000);

            // Atualiza ou cria o registro no banco liberando o grupo e marcando que já usou o teste
            await AuthorizedGroup.updateOne(
                { groupId: idGrupo },
                { 
                    $set: { 
                        isAuthorized: true, 
                        expiresAt: tempoTeste,
                        jaFezTeste: true, // Registra que o teste foi queimado para este grupo
                        authorizedBy: msg.from 
                    } 
                },
                { upsert: true }
            );

            // Tenta avisar lá dentro do grupo que o teste foi ativado com sucesso
            try {
                await client.sendMessage(idGrupo, `🚀 *ESTAÇÃO LIBERADA VIA TESTE (24H)*\n━━━━━━━━━━━━━━━━━━━━━\nEste grupo acaba de ativar o período de testes da YukonBot!\n\n⏳ O acesso expira em: **${tempoTeste.toLocaleString('pt-BR')}**\nAproveite para explorar todos os comandos!`);
            } catch (e) {
                console.log("Não foi possível enviar aviso no grupo (talvez o bot não esteja lá dentro ainda).");
            }

            // Confirma no PV do cliente
            return msg.reply(`✅ *TESTE ATIVADO COM SUCESSO!*
━━━━━━━━━━━━━━━━━━━━━
📍 *Grupo:* \`${idGrupo}\`
⏳ *Duração:* 24 Horas
📅 *Expira em:* ${tempoTeste.toLocaleString('pt-BR')}

O grupo já está liberado e pronto para uso. Divirta-se explorando a Yukon!`);

        } catch (err) {
            console.error("❌ Erro no comando /teste do cliente:", err);
            return msg.reply("⚠️ Ocorreu um erro interno ao processar o seu teste. Tente novamente em instantes.");
        }
    }
};