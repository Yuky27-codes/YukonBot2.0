// Plano PAGO da licença de um grupo (AuthorizedGroup.paidPlan / paidPlanExpiresAt).
// É gravado SOMENTE quando um pagamento é efetivamente confirmado:
//   - Pix automático confirmado pelo painel (/api/pix/confirmar no index.js);
//   - /confirmar executado pela equipe da Yukon (dono/super users ou funcionária com o comando liberado),
//     depois de conferir o comprovante do Pix manual (/pix).
// O planoPreco do perfil (gravado pelo /assinar) é apenas o plano ESCOLHIDO/pendente e nunca conta como pagamento.
// Este arquivo fica em commands/ só para ser encontrado pelo index.js e pelos comandos; não é um comando de usuário.

const PRECO_BASE_PARA_PLANO = { 10: 'recruta', 30: 'astronauta', 75: 'intergalactico' };

function planoPagoPorPreco(precoBase) {
    return PRECO_BASE_PARA_PLANO[precoBase] || null;
}

// Campos a gravar no AuthorizedGroup junto com a validade paga. Preço fora da tabela base => nada é gravado.
function camposPlanoPago({ precoBase, validade, origem, txid }) {
    const plano = planoPagoPorPreco(precoBase);
    if (!plano) return {};
    return {
        paidPlan: plano,
        paidPlanExpiresAt: validade,
        paidPlanSource: origem,
        paidPlanTxid: txid || null,
        paidPlanConfirmedAt: new Date(),
    };
}

module.exports = {
    planoPagoPorPreco,
    camposPlanoPago,
    // Sem efeito se alguém digitar /_licenca_paga
    execute: async () => {},
};
