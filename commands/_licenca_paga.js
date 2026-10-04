// Plano PAGO da licença de um grupo (AuthorizedGroup.paidPlan / paidPlanExpiresAt).
// É gravado SOMENTE quando um pagamento é efetivamente confirmado:
//   - Pix automático confirmado pelo painel (/api/pix/confirmar no index.js);
//   - /confirmar executado pela equipe da Yukon (dono/super users ou funcionária com o comando liberado),
//     depois de conferir o comprovante do Pix manual (/pix).
// O plano escolhido no perfil (/assinar, /upgrade) é só a escolha pendente e nunca conta como pagamento.
//
// O plano é identificado pelo id do catálogo central (commands/_catalogo.js) — recruta, astronauta,
// intergalactico ou cosmico —, e não pelo preço pago (que pode ter desconto de cupom). Plano fora do
// catálogo publicado => nada é gravado como plano pago (a licença em si continua sendo ativada).
// Este arquivo fica em commands/ só para ser encontrado pelo index.js e pelos comandos; não é um comando de usuário.

const { planoPorId } = require('./_catalogo');

// Campos a gravar no AuthorizedGroup junto com a validade paga.
async function camposPlanoPago({ planoId, validade, origem, txid }) {
    const plano = planoId ? await planoPorId(planoId) : null;
    if (!plano) {
        if (planoId) console.warn(`[licença paga] Plano "${planoId}" fora do catálogo publicado: plano pago não registrado.`);
        return {};
    }
    return {
        paidPlan: plano.id,
        paidPlanExpiresAt: validade,
        paidPlanSource: origem,
        paidPlanTxid: txid || null,
        paidPlanConfirmedAt: new Date(),
    };
}

module.exports = {
    camposPlanoPago,
    // Sem efeito se alguém digitar /_licenca_paga
    execute: async () => {},
};
