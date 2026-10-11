// =====================================================================================================
// MOTOR DE MÚSICA DO /play — música completa com plano B, sem serviço pago.
//
// Ordem das fontes (para na primeira que entregar o áudio):
//   1. YouTube    (yt-dlp; usa youtube-cookies.txt na raiz do Bot se existir — conta Google descartável)
//   2. SoundCloud (yt-dlp; não costuma bloquear servidores de nuvem)
//   3. Deezer     (prévia oficial de 30s — último recurso, nunca falha por bloqueio)
//
// Proteções: 1 download por vez (fila de até 5), músicas de até 10 min / 25 MB, cache das últimas músicas
// (a mesma música não baixa de novo) e espera de 60s por pessoa.
//
// O yt-dlp é o BINÁRIO OFICIAL independente (github.com/yt-dlp/yt-dlp/releases), baixado e atualizado pela própria
// Yukon em bin/: o yt-dlp do npm (yt-dlp-exec) no Linux precisa de Python, que a Square Cloud pode não ter.
// =====================================================================================================
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

const RAIZ = path.resolve(__dirname, '..');
const PASTA_BIN = path.join(RAIZ, 'bin');
const PASTA_CACHE = path.join(os.tmpdir(), 'yukon-musica');
const ARQUIVO_COOKIES = path.join(RAIZ, 'youtube-cookies.txt');

const LIMITES = {
    duracaoMaxSeg: 10 * 60,
    tamanhoMaxMB: 25,
    filaMax: 5,
    esperaPorPessoaMs: 60 * 1000,
    tempoMaxDownloadMs: 120 * 1000,
    cacheMaxArquivos: 40,
};

// ------------------------------------------------------------------------------------------- binários
const NOME_BINARIO = process.platform === 'win32' ? 'yt-dlp.exe' : process.platform === 'darwin' ? 'yt-dlp_macos' : 'yt-dlp_linux';
const URL_BINARIO = `https://github.com/yt-dlp/yt-dlp/releases/latest/download/${NOME_BINARIO}`;
const caminhoYtDlp = () => process.env.YTDLP_PATH || path.join(PASTA_BIN, NOME_BINARIO);

function caminhoFfmpeg() {
    try { return require('ffmpeg-static'); } catch { return null; }
}

// Baixa (ou atualiza) o yt-dlp oficial. Usa o axios que o Bot já tem.
async function instalarYtDlp({ forcar = false } = {}) {
    const destino = caminhoYtDlp();
    if (!forcar && fs.existsSync(destino) && fs.statSync(destino).size > 1_000_000) return destino;
    const axios = require('axios');
    fs.mkdirSync(path.dirname(destino), { recursive: true });
    const resposta = await axios.get(URL_BINARIO, { responseType: 'arraybuffer', maxRedirects: 5, timeout: 120000 });
    const temporario = `${destino}.baixando`;
    fs.writeFileSync(temporario, Buffer.from(resposta.data));
    if (process.platform !== 'win32') fs.chmodSync(temporario, 0o755);
    fs.renameSync(temporario, destino);
    return destino;
}

// Roda o yt-dlp e devolve { codigo, saida, erro } (mata o processo se passar do tempo)
function rodarYtDlp(args, tempoMaxMs = LIMITES.tempoMaxDownloadMs) {
    return new Promise((resolve) => {
        let saida = '';
        let erro = '';
        let filho;
        try {
            filho = spawn(caminhoYtDlp(), args, { windowsHide: true });
        } catch (e) {
            return resolve({ codigo: -1, saida: '', erro: e.message });
        }
        const timer = setTimeout(() => { erro += '\n[tempo esgotado]'; filho.kill('SIGKILL'); }, tempoMaxMs);
        filho.stdout.on('data', (d) => { saida += d; });
        filho.stderr.on('data', (d) => { erro += d; });
        filho.on('error', (e) => { clearTimeout(timer); resolve({ codigo: -1, saida, erro: erro + e.message }); });
        filho.on('close', (codigo) => { clearTimeout(timer); resolve({ codigo, saida, erro }); });
    });
}

function argsComuns() {
    // O YouTube exige resolver um desafio em JavaScript: usamos o próprio Node da Yukon (não precisa instalar nada)
    const args = ['--no-playlist', '--no-warnings', '--socket-timeout', '15', '--retries', '2', '--js-runtimes', `node:${process.execPath}`];
    const ffmpeg = caminhoFfmpeg();
    if (ffmpeg) args.push('--ffmpeg-location', ffmpeg);
    return args;
}

const limparTexto = (t) => String(t || '').replace(/\s+/g, ' ').trim();

// Busca + download por uma "busca" do yt-dlp (ytsearch1:..., scsearch1:... ou um link direto)
async function baixarComYtDlp(alvo, { usarCookies }) {
    await instalarYtDlp();
    fs.mkdirSync(PASTA_CACHE, { recursive: true });

    // 1) Metadados primeiro (duração e id), sem baixar nada
    const infoArgs = [...argsComuns(), '--dump-single-json', '--skip-download', alvo];
    if (usarCookies && fs.existsSync(ARQUIVO_COOKIES)) infoArgs.unshift('--cookies', ARQUIVO_COOKIES);
    const info = await rodarYtDlp(infoArgs, 45000);
    if (info.codigo !== 0) throw new Error(resumoErro(info.erro));
    let dados = JSON.parse(info.saida);
    if (dados.entries) dados = dados.entries[0];
    if (!dados) throw new Error('nada encontrado');
    if (dados.duration && dados.duration > LIMITES.duracaoMaxSeg) {
        const erro = new Error('longa demais');
        erro.duracao = dados.duration;
        throw erro;
    }
    const chave = `${dados.extractor_key || 'x'}-${dados.id}`.replace(/[^\w-]/g, '_');
    const metadados = {
        titulo: limparTexto(dados.track || dados.title),
        artista: limparTexto(dados.artist || dados.uploader || dados.channel),
        duracao: dados.duration || null,
        capa: dados.thumbnail || null,
        link: dados.webpage_url || null,
        chave,
    };

    // 2) Cache: a mesma música não baixa de novo
    const emCache = path.join(PASTA_CACHE, `${chave}.mp3`);
    if (fs.existsSync(emCache)) return { ...metadados, arquivo: emCache, doCache: true };

    // 3) Download do áudio, convertido para mp3
    const urlDireta = dados.webpage_url || alvo;
    const baixarArgs = [
        ...argsComuns(),
        '-f', 'bestaudio/best',
        '-x', '--audio-format', 'mp3', '--audio-quality', '5',
        '--max-filesize', `${LIMITES.tamanhoMaxMB}M`,
        '-o', path.join(PASTA_CACHE, `${chave}.%(ext)s`),
        urlDireta,
    ];
    if (usarCookies && fs.existsSync(ARQUIVO_COOKIES)) baixarArgs.unshift('--cookies', ARQUIVO_COOKIES);
    const download = await rodarYtDlp(baixarArgs);
    if (download.codigo !== 0 || !fs.existsSync(emCache)) throw new Error(resumoErro(download.erro || 'arquivo não gerado'));
    if (fs.statSync(emCache).size > LIMITES.tamanhoMaxMB * 1024 * 1024) {
        fs.rmSync(emCache, { force: true });
        throw new Error('arquivo grande demais');
    }
    limparCache();
    return { ...metadados, arquivo: emCache, doCache: false };
}

// Primeira linha útil do erro do yt-dlp (para o log e o diagnóstico)
function resumoErro(texto) {
    const linhas = String(texto || '').split('\n').map((l) => l.trim()).filter(Boolean);
    const erro = linhas.find((l) => /^ERROR:/i.test(l)) || linhas[linhas.length - 1] || 'erro desconhecido';
    return erro.replace(/^ERROR:\s*/i, '').slice(0, 200);
}

function limparCache() {
    try {
        const arquivos = fs.readdirSync(PASTA_CACHE)
            .filter((f) => f.endsWith('.mp3'))
            .map((f) => ({ f, t: fs.statSync(path.join(PASTA_CACHE, f)).mtimeMs }))
            .sort((a, b) => b.t - a.t);
        for (const velho of arquivos.slice(LIMITES.cacheMaxArquivos)) fs.rmSync(path.join(PASTA_CACHE, velho.f), { force: true });
        // sobras de downloads interrompidos
        for (const f of fs.readdirSync(PASTA_CACHE)) if (!f.endsWith('.mp3')) fs.rmSync(path.join(PASTA_CACHE, f), { force: true });
    } catch { /* cache é opcional */ }
}

// ------------------------------------------------------------------------------------------- fontes
const ehLinkYoutube = (t) => /^(https?:\/\/)?(www\.|m\.|music\.)?(youtube\.com|youtu\.be)\//i.test(t);
const ehLinkSoundcloud = (t) => /^(https?:\/\/)?(www\.|m\.)?soundcloud\.com\//i.test(t);

const FONTES = [
    {
        nome: 'YouTube',
        completa: true,
        aceita: (busca) => !ehLinkSoundcloud(busca),
        baixar: (busca) => baixarComYtDlp(ehLinkYoutube(busca) ? busca : `ytsearch1:${busca}`, { usarCookies: true }),
    },
    {
        nome: 'SoundCloud',
        completa: true,
        aceita: (busca) => !ehLinkYoutube(busca),
        baixar: (busca) => baixarComYtDlp(ehLinkSoundcloud(busca) ? busca : `scsearch1:${busca}`, { usarCookies: false }),
    },
    {
        nome: 'Deezer',
        completa: false, // prévia de 30s
        aceita: (busca) => !/^https?:\/\//i.test(busca),
        baixar: async (busca) => {
            const axios = require('axios');
            const { data } = await axios.get('https://api.deezer.com/search', { params: { q: busca, limit: 1 }, timeout: 15000 });
            const faixa = data?.data?.[0];
            if (!faixa?.preview) throw new Error('nada encontrado');
            const audio = await axios.get(faixa.preview, { responseType: 'arraybuffer', timeout: 20000 });
            return {
                titulo: limparTexto(faixa.title),
                artista: limparTexto(faixa.artist?.name),
                duracao: 30,
                capa: faixa.album?.cover_medium || null,
                link: faixa.link || null,
                chave: `deezer-${faixa.id}`,
                buffer: Buffer.from(audio.data),
            };
        },
    },
];

// Tenta cada fonte em ordem. `fontes` pode ser trocado nos testes.
async function buscarMusica(busca, { fontes = FONTES, log = console } = {}) {
    const falhas = [];
    for (const fonte of fontes) {
        if (!fonte.aceita(busca)) continue;
        try {
            const resultado = await fonte.baixar(busca);
            return { ...resultado, fonte: fonte.nome, completa: fonte.completa, falhas };
        } catch (e) {
            // Música longa demais não adianta tentar em outra fonte: é a mesma música
            if (e.message === 'longa demais') throw e;
            falhas.push(`${fonte.nome}: ${e.message}`);
            log.warn?.(`🎵 /play: ${fonte.nome} falhou (${e.message})`);
        }
    }
    const erro = new Error('nenhuma fonte');
    erro.falhas = falhas;
    throw erro;
}

// ------------------------------------------------------------------------------------------- fila
// 1 download por vez para não estourar a memória da Yukon; quem chegar com a fila cheia é avisado
const fila = [];
let tocando = false;
const ultimoPedido = new Map();

// Resolve com { aceito: false } (fila cheia) ou { aceito: true, resultado | erro } quando a tarefa terminar
function entrarNaFila(tarefa) {
    if (tamanhoFila() >= LIMITES.filaMax) return Promise.resolve({ aceito: false });
    return new Promise((resolve) => {
        fila.push({ tarefa, resolve });
        processarFila();
    });
}

async function processarFila() {
    if (tocando) return;
    const proximo = fila.shift();
    if (!proximo) return;
    tocando = true;
    try {
        proximo.resolve({ aceito: true, resultado: await proximo.tarefa() });
    } catch (erro) {
        proximo.resolve({ aceito: true, erro });
    } finally {
        tocando = false;
        processarFila();
    }
}

const tamanhoFila = () => fila.length + (tocando ? 1 : 0);

function podePedir(userId, agora = Date.now()) {
    const ultimo = ultimoPedido.get(userId) || 0;
    const espera = ultimo + LIMITES.esperaPorPessoaMs - agora;
    return espera > 0 ? Math.ceil(espera / 1000) : 0;
}
const marcarPedido = (userId, agora = Date.now()) => ultimoPedido.set(userId, agora);

const formatarDuracao = (s) => (s ? `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}` : '—');

module.exports = {
    LIMITES, FONTES, ARQUIVO_COOKIES, caminhoYtDlp, caminhoFfmpeg, instalarYtDlp, rodarYtDlp,
    buscarMusica, entrarNaFila, tamanhoFila, podePedir, marcarPedido, formatarDuracao, resumoErro,
    _interno: { fila, ultimoPedido },
};
