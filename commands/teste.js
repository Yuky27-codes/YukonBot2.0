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

            // Teste só para grupo que NUNCA teve licença. Antes, qualquer um que soubesse o ID (/id_grupo) rodava o
            // /teste num grupo pago: a validade virava 24h e quem pediu passava a ser o dono (authorizedBy), que é
            // quem o /codigo autoriza a vincular o grupo ao painel.
            const grupoAuth = await AuthorizedGroup.findOne({ groupId: idGrupo }).lean();
            if (grupoAuth) {
                return msg.reply(grupoAuth.jaFezTeste
                    ? `🚫 *TESTE JÁ UTILIZADO*
━━━━━━━━━━━━━━━━━━━━━
Este grupo (\`${idGrupo}\`) já resgatou o período de teste gratuito de 24 horas anteriormente. 

Para continuar utilizando a Yukon sem interrupções, adquira uma de nossas assinaturas definitivas.`
                    : `🚫 *TESTE INDISPONÍVEL*
━━━━━━━━━━━━━━━━━━━━━
Este grupo já possui (ou já possuiu) uma licença da Yukon, então o teste gratuito não se aplica.

Use */meu_plano* no PV para ver a sua assinatura ou fale com o suporte.`);
            }

            // Só o dono ou um admin do grupo no WhatsApp pode ativar o teste
            let ehAdminDoGrupo = false;
            try {
                const chatGrupo = await client.getChatById(idGrupo);
                if (chatGrupo && chatGrupo.isGroup) {
                    const contato = await msg.getContact().catch(() => null);
                    const meusIds = new Set([msg.from, contato?.id?._serialized].filter(Boolean));
                    const meusNumeros = new Set([contato?.number, contato?.id?.user, String(msg.from).split('@')[0]].filter(Boolean));
                    const participante = (chatGrupo.participants || []).find((p) =>
                        meusIds.has(p.id?._serialized) || meusNumeros.has(p.id?.user));
                    ehAdminDoGrupo = Boolean(participante && (participante.isAdmin || participante.isSuperAdmin));
                }
            } catch (e) {
                ehAdminDoGrupo = false;
            }
            if (!ehAdminDoGrupo) {
                return msg.reply(`🚫 *TESTE NÃO AUTORIZADO*
━━━━━━━━━━━━━━━━━━━━━
Só o dono ou um administrador do grupo pode ativar o teste.

💡 Confira se a Yukon já está no grupo e se você é administrador dele.`);
            }

            // Define o tempo de expiração para exatamente 24 horas a partir de agora
            const tempoTeste = new Date(Date.now() + 24 * 60 * 60 * 1000);

            // Só cria (nunca sobrescreve): se o registro surgiu entre a consulta e aqui, nada é alterado
            const resultado = await AuthorizedGroup.updateOne(
                { groupId: idGrupo },
                { 
                    $setOnInsert: { 
                        groupId: idGrupo,
                        isAuthorized: true, 
                        expiresAt: tempoTeste,
                        jaFezTeste: true, // Registra que o teste foi queimado para este grupo
                        authorizedBy: msg.from,
                        // Dados do teste não ficam: fora do /rankglobal e apagados ao fim (commands/_teste_gratis.js)
                        emTeste: true,
                        testeExpiraEm: tempoTeste
                    } 
                },
                { upsert: true }
            );
            if (!resultado.upsertedCount) {
                return msg.reply("🚫 *TESTE INDISPONÍVEL*\nEste grupo já possui uma licença da Yukon.");
            }

            // Tenta avisar lá dentro do grupo que o teste foi ativado com sucesso
            try {
                await client.sendMessage(idGrupo, `🚀 *ESTAÇÃO LIBERADA VIA TESTE (24H)*\n━━━━━━━━━━━━━━━━━━━━━\nEste grupo acaba de ativar o período de testes da YukonBot, *use /painel para ver todos menus Disponíveis!*\n\n⏳ O acesso expira em: **${tempoTeste.toLocaleString('pt-BR')}**\nAproveite para explorar todos os comandos!`);
            } catch (e) {
                console.log("Não foi possível enviar aviso no grupo (talvez o bot não esteja lá dentro ainda).");
            }

            // Confirma no PV do cliente
            return msg.reply(`✅ *TESTE ATIVADO COM SUCESSO!*
━━━━━━━━━━━━━━━━━━━━━
📍 *Grupo:* \`${idGrupo}\`
⏳ *Duração:* 24 Horas
📅 *Expira em:* ${tempoTeste.toLocaleString('pt-BR')}

O grupo já está liberado e pronto para uso, basta enviar */painel* no grupo. Divirta-se explorando a Yukon!

⚠️ _Durante o teste o grupo não entra no /rankglobal, e tudo o que for feito nele (moedas, níveis, pets, configurações) é apagado quando o teste acabar. Assinando antes do fim, tudo é mantido._`);

        } catch (err) {
            console.error("❌ Erro no comando /teste do cliente:", err);
            return msg.reply("⚠️ Ocorreu um erro interno ao processar o seu teste. Tente novamente em instantes.");
        }
    }
};