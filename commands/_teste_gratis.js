// Teste grátis de 24h (/teste): os dados do grupo durante o teste não ficam no banco.
//
// - O único registro que fica é o da autorização (authorizedgroups): sem ele a barreira de licença bloqueia os
//   comandos do grupo e o teste poderia ser repetido sem limite (jaFezTeste).
// - Enquanto o grupo está em teste, ninguém dele aparece no /rankglobal.
// - Quando o teste acaba sem assinatura, todos os dados gerados no grupo (usuários e moedas, pets, mensagens,
//   estatísticas, configurações, agendamentos...) são apagados e o grupo fica bloqueado como antes.
// - Se o grupo assinar durante o teste (licença estendida além do teste ou plano pago gravado), os dados ficam.

// Coleções com dados por grupo (campo groupId), todas definidas no index.js
const MODELOS_DO_GRUPO = [
    'User', 'Pet', 'GroupMessage', 'GroupConfig', 'Modo', 'Evento', 'GroupStats', 'GroupDailyStats',
    'GroupCHSHistory', 'GroupMetrics', 'GroupSchedule', 'Partnership', 'BotCommand', 'LinkCode',
];

// Ainda é teste: marcado como teste, sem plano pago e sem a licença ter passado do fim do teste
const FILTRO_SO_TESTE = {
    emTeste: true,
    $or: [{ paidPlan: null }, { paidPlan: { $exists: false } }],
    $expr: { $lte: ['$expiresAt', '$testeExpiraEm'] },
};

/** Grupos que estão (ou estavam) em teste e não assinaram. */
async function gruposSoTeste(mongoose) {
    const AuthorizedGroup = mongoose.model('AuthorizedGroup');
    return (await AuthorizedGroup.find(FILTRO_SO_TESTE).select({ groupId: 1 }).lean()).map((g) => g.groupId);
}

/**
 * Roda no cron: marca como convertidos os grupos que assinaram durante o teste e apaga os dados dos testes que
 * acabaram sem assinatura. Devolve { convertidos, limpos, documentos }.
 */
async function processarTestes(mongoose, agora = new Date()) {
    const AuthorizedGroup = mongoose.model('AuthorizedGroup');

    // Assinou durante o teste: deixa de ser teste e os dados ficam
    const convertidos = await AuthorizedGroup.updateMany(
        { emTeste: true, $nor: [FILTRO_SO_TESTE] },
        { $set: { emTeste: false, testeConvertidoEm: agora } },
    );

    const expirados = await AuthorizedGroup.find({ ...FILTRO_SO_TESTE, expiresAt: { $lte: agora } }).lean();
    let documentos = 0;
    for (const grupo of expirados) {
        // Confere de novo logo antes de apagar: se a assinatura chegou nesse meio-tempo, os dados ficam
        if (!(await AuthorizedGroup.exists({ _id: grupo._id, ...FILTRO_SO_TESTE }))) continue;
        for (const nome of MODELOS_DO_GRUPO) {
            if (!mongoose.models[nome]) continue;
            const r = await mongoose.models[nome].deleteMany({ groupId: grupo.groupId });
            documentos += r.deletedCount || 0;
        }
        // Mantém só a marca de que o teste foi usado; condicional para não pisar numa assinatura que chegou agora
        await AuthorizedGroup.updateOne(
            { _id: grupo._id, ...FILTRO_SO_TESTE },
            { $set: { emTeste: false, isAuthorized: false, testeLimpoEm: agora } },
        );
    }
    return { convertidos: convertidos.modifiedCount || 0, limpos: expirados.length, documentos };
}

module.exports = { MODELOS_DO_GRUPO, gruposSoTeste, processarTestes };
