// commands/atendimento.js
//
// Único ponto de entrada do atendimento automático da Yukon no PV.
// Antes, QUALQUER mensagem genérica recebida no privado disparava essa
// mensagem automaticamente (isso foi o gatilho identificado nos banimentos:
// picos de envio em massa quando muita gente mandava mensagem ao mesmo tempo).
//
// Agora só roda quando o usuário digita "/atendimento" explicitamente.

const MENSAGEM_PADRAO_ATENDIMENTO = `🛰️ *CENTRAL YUKON — ATENDIMENTO AUTOMATIZADO*
━━━━━━━━━━━━━━━━━━━━━
Olá! Seja muito bem-vindo(a) à central da YukonBot. Recebi a sua mensagem!

🚀 Para ver todos os recursos disponíveis, gerenciar suas assinaturas, ver os planos ou ver como vincular seus grupos, acesse o painel principal digitando ou clicando no comando abaixo:

👉 \`/menu_cliente\`

🔧 *Dica:* Se você veio do Instagram para testar ou assinar, digite **/menu_cliente** para ver o passo a passo de ativação.`;

module.exports = {
    execute: async (client, msg, { chatId }) => {
        // Trava extra de segurança: atendimento é só para o PV.
        if (chatId.endsWith('@g.us')) {
            return msg.reply('⚠️ O atendimento automático da Yukon só está disponível no chat privado (PV). Me chame no PV com `/atendimento`.');
        }

        const remetente = msg.from;

        if (!global.sessoesAtendimento) {
            global.sessoesAtendimento = {};
        }

        // (Re)inicia a sessão de atendimento explicitamente para este usuário.
        // Daqui pra frente, o verificador periódico (iniciarVerificadorDeSessoes,
        // no index.js) cuida do aviso de inatividade e do encerramento automático
        // — mas a ativação inicial sempre parte do usuário, nunca do bot.
        global.sessoesAtendimento[remetente] = {
            ultimoContato: Date.now(),
            etapa: 'ativo'
        };

        return msg.reply(MENSAGEM_PADRAO_ATENDIMENTO);
    }
};