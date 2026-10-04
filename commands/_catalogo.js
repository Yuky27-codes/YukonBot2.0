// Catálogo de planos do Bot: NÃO é uma tabela própria. Lê o catálogo central publicado pelo painel na coleção
// plan_catalog (documento "current"): nome, nível, preço, duração e limite de grupos de cada plano.
// Usado por /assinar, /upgrade, /pix, /meu_plano, /vincular, /desvincular, /transferirplano, /confirmar
// e pela confirmação automática do Pix (index.js).
//
// Perfis criados antes da V1 não têm `planoEscolhido`: o plano deles é lido pelo significado antigo do
// planoPreco (legacyProfilePrices, publicado junto com o catálogo).
// Este arquivo fica em commands/ só para ser encontrado pelos comandos; não é um comando de usuário.

const mongoose = require('mongoose');

const CACHE_MS = 60 * 1000;
let cache = { em: 0, doc: null };

async function catalogoPublicado() {
    if (cache.doc && Date.now() - cache.em < CACHE_MS) return cache.doc;
    try {
        const doc = await mongoose.connection.collection('plan_catalog').findOne({ _id: 'current' });
        if (doc && Array.isArray(doc.plans)) cache = { em: Date.now(), doc };
    } catch (err) {
        console.error('[catálogo] Falha ao ler o catálogo de planos:', err.message);
    }
    // Em falha de leitura, segue com o último catálogo conhecido (se houver)
    return cache.doc;
}

/** Planos em ordem de nível (1 = Recruta ...). null se o catálogo ainda não foi publicado pelo painel. */
async function listarPlanos() {
    const doc = await catalogoPublicado();
    if (!doc) return null;
    return [...doc.plans].sort((a, b) => a.rank - b.rank);
}

async function planoPorId(id) {
    const planos = await listarPlanos();
    return (planos || []).find((p) => p.id === id) || null;
}

/** Número escolhido nos menus (/assinar 1, /upgrade 3...) = posição do plano por nível. */
async function planoPorNumero(numero) {
    const planos = await listarPlanos();
    if (!planos || !Number.isInteger(numero) || numero < 1) return null;
    return planos[numero - 1] || null;
}

/** Plano do perfil: o id escolhido (perfis V1) ou o significado antigo do planoPreco (perfis anteriores). */
async function planoDoPerfil(perfil) {
    if (!perfil) return null;
    if (perfil.planoEscolhido) {
        const escolhido = await planoPorId(perfil.planoEscolhido);
        if (escolhido) return escolhido;
    }
    const doc = await catalogoPublicado();
    const legado = doc && doc.legacyProfilePrices ? doc.legacyProfilePrices[String(perfil.planoPreco)] : null;
    return legado ? planoPorId(legado) : null;
}

const formatarPreco = (valor) => Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const nomeComEmoji = (plano) => `${plano.label} ${plano.emoji}`;

const MENSAGEM_CATALOGO_INDISPONIVEL = "⚠️ Os planos estão temporariamente indisponíveis. Tente novamente em alguns minutos.";

module.exports = {
    listarPlanos,
    planoPorId,
    planoPorNumero,
    planoDoPerfil,
    formatarPreco,
    nomeComEmoji,
    MENSAGEM_CATALOGO_INDISPONIVEL,
    // Sem efeito se alguém digitar /_catalogo
    execute: async () => {},
};
