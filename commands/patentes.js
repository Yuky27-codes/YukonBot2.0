/**
 * CONFIG CENTRAL DE PATENTES — YUKON SHOP
 * ─────────────────────────────────────────────────────────
 * Cada patente comprada em /comprar vira um item no inventory
 * do usuário: { name, type: 'cargo', date }.
 *
 * Esse arquivo define os ATRIBUTOS de cada patente e expõe
 * funções prontas pra qualquer comando ler o bônus do usuário
 * sem precisar duplicar lógica.
 *
 * REGRA DE EMPILHAMENTO: se o usuário possui vários cargos,
 * só o de MAIOR NÍVEL conta (getAtributos já resolve isso).
 *
 * Significado de cada atributo:
 * - sorteBonus: pontos percentuais somados na chance de vitória
 *   em qualquer jogo do /cassino e na chance de sucesso do /roubar
 * - coinBonusPercent: % extra em cima de qualquer ganho de coins
 *   (cassino, missão, pousar, caixa surpresa)
 * - missaoCooldownReducaoMin: minutos a menos no cooldown de 24h
 *   da /missão
 * - protecaoRoubo: pontos percentuais SUBTRAÍDOS da chance de
 *   sucesso de quem tenta roubar ESSE usuário (defesa)
 * - jurosBonusPercent: % extra no rendimento do banco (/depositar)
 * - usosExtras: usos a mais por dia em comandos com contador
 *   (cassino, roubar)
 * - emblema: emoji exibido no /perfil ao lado do nome
 */

const PATENTES = [
    { nivel: 1,  nome: 'Impostor',              preco: 500,     emblema: '🔰', sorteBonus: 1,  coinBonusPercent: 2,  missaoCooldownReducaoMin: 0,   protecaoRoubo: 0,  jurosBonusPercent: 0,  usosExtras: { cassino: 0, roubar: 0 } },
    { nivel: 2,  nome: 'Cientista',              preco: 1000,    emblema: '🧪', sorteBonus: 2,  coinBonusPercent: 4,  missaoCooldownReducaoMin: 0,   protecaoRoubo: 0,  jurosBonusPercent: 0,  usosExtras: { cassino: 0, roubar: 0 } },
    { nivel: 3,  nome: 'Capitão',                preco: 5000,    emblema: '🎖️', sorteBonus: 3,  coinBonusPercent: 6,  missaoCooldownReducaoMin: 15,  protecaoRoubo: 3,  jurosBonusPercent: 0,  usosExtras: { cassino: 0, roubar: 0 } },
    { nivel: 4,  nome: 'Especialista',           preco: 10000,   emblema: '🛠️', sorteBonus: 4,  coinBonusPercent: 8,  missaoCooldownReducaoMin: 30,  protecaoRoubo: 5,  jurosBonusPercent: 2,  usosExtras: { cassino: 0, roubar: 0 } },
    { nivel: 5,  nome: 'Veterano',                preco: 25000,   emblema: '⭐', sorteBonus: 5,  coinBonusPercent: 10, missaoCooldownReducaoMin: 45,  protecaoRoubo: 7,  jurosBonusPercent: 3,  usosExtras: { cassino: 0, roubar: 0 } },
    { nivel: 6,  nome: 'Comandante',              preco: 50000,   emblema: '🚀', sorteBonus: 6,  coinBonusPercent: 12, missaoCooldownReducaoMin: 60,  protecaoRoubo: 10, jurosBonusPercent: 4,  usosExtras: { cassino: 0, roubar: 1 } },
    { nivel: 7,  nome: 'Elite Galáctica',         preco: 80000,   emblema: '💠', sorteBonus: 7,  coinBonusPercent: 14, missaoCooldownReducaoMin: 75,  protecaoRoubo: 12, jurosBonusPercent: 5,  usosExtras: { cassino: 1, roubar: 1 } },
    { nivel: 8,  nome: 'Guardião Estelar',        preco: 120000,  emblema: '🛡️', sorteBonus: 9,  coinBonusPercent: 17, missaoCooldownReducaoMin: 90,  protecaoRoubo: 15, jurosBonusPercent: 6,  usosExtras: { cassino: 1, roubar: 1 } },
    { nivel: 9,  nome: 'Viajante Dimensional',    preco: 180000,  emblema: '🌌', sorteBonus: 11, coinBonusPercent: 20, missaoCooldownReducaoMin: 105, protecaoRoubo: 18, jurosBonusPercent: 8,  usosExtras: { cassino: 1, roubar: 2 } },
    { nivel: 10, nome: 'Lorde das Estrelas',      preco: 250000,  emblema: '👑', sorteBonus: 13, coinBonusPercent: 23, missaoCooldownReducaoMin: 120, protecaoRoubo: 20, jurosBonusPercent: 10, usosExtras: { cassino: 2, roubar: 2 } },
    { nivel: 11, nome: 'Almirante de Frota',      preco: 320000,  emblema: '⚓', sorteBonus: 15, coinBonusPercent: 26, missaoCooldownReducaoMin: 150, protecaoRoubo: 22, jurosBonusPercent: 12, usosExtras: { cassino: 2, roubar: 2 } },
    { nivel: 12, nome: 'Governador Planetário',   preco: 400000,  emblema: '🌍', sorteBonus: 17, coinBonusPercent: 30, missaoCooldownReducaoMin: 180, protecaoRoubo: 25, jurosBonusPercent: 15, usosExtras: { cassino: 2, roubar: 3 } },
    { nivel: 13, nome: 'Lenda Estelar',           preco: 500000,  emblema: '🏆', sorteBonus: 20, coinBonusPercent: 35, missaoCooldownReducaoMin: 240, protecaoRoubo: 30, jurosBonusPercent: 20, usosExtras: { cassino: 3, roubar: 3 } },
];

const ATRIBUTOS_PADRAO = {
    nivel: 0,
    nome: null,
    emblema: '',
    sorteBonus: 0,
    coinBonusPercent: 0,
    missaoCooldownReducaoMin: 0,
    protecaoRoubo: 0,
    jurosBonusPercent: 0,
    usosExtras: { cassino: 0, roubar: 0 }
};

/**
 * Retorna o objeto de patente de maior nível que o usuário possui,
 * a partir do inventory dele. Se não possuir nenhum cargo, retorna null.
 */
function getPatenteAtual(inventory) {
    if (!Array.isArray(inventory) || inventory.length === 0) return null;

    let patenteAtual = null;
    for (const item of inventory) {
        if (item.type !== 'cargo') continue;
        const patente = PATENTES.find(p => p.nome === item.name);
        if (patente && (!patenteAtual || patente.nivel > patenteAtual.nivel)) {
            patenteAtual = patente;
        }
    }
    return patenteAtual;
}

/**
 * Retorna os atributos prontos pra uso direto nos comandos.
 * Se o usuário não tiver cargo nenhum, retorna os atributos padrão (tudo zerado),
 * então é sempre seguro chamar sem checar null antes.
 */
function getAtributos(inventory) {
    const patente = getPatenteAtual(inventory);
    return patente || ATRIBUTOS_PADRAO;
}

module.exports = { PATENTES, getPatenteAtual, getAtributos, ATRIBUTOS_PADRAO };
