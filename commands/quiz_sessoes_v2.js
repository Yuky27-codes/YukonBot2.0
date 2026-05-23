// Sessões compartilhadas de todos os jogos
const sessoesQuiz = new Map();      // quiz geral, emoji, materias, embaralhada, frases
const sessoesQuemsoueu = new Map(); // quem sou eu
const sessoesForca = new Map();     // forca

module.exports = { sessoesQuiz, sessoesQuemsoueu, sessoesForca };