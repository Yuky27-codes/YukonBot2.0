// /play [música ou link] — toca a música completa (YouTube → SoundCloud → prévia do Deezer). Motor: ./_musica.js
//   /play diagnostico  → (admins da Yukon) testa cada fonte de dentro do servidor e mostra o que funciona
//   /play atualizar    → (admins da Yukon) baixa a versão mais nova do yt-dlp (quando o YouTube muda algo)
const M = require('./_musica');

const BUSCA_TESTE = 'Alan Walker Faded';

async function capaComoMidia(MessageMedia, url) {
    if (!url) return null;
    try {
        const axios = require('axios');
        const { data, headers } = await axios.get(url, { responseType: 'arraybuffer', timeout: 10000 });
        return new MessageMedia(headers['content-type'] || 'image/jpeg', Buffer.from(data).toString('base64'), 'capa.jpg');
    } catch {
        return null;
    }
}

async function diagnostico(client, msg, chatId) {
    const linhas = ['🩺 *DIAGNÓSTICO DO /play*', '━━━━━━━━━━━━━━━━━━━━━'];
    try {
        const caminho = await M.instalarYtDlp();
        const versao = await M.rodarYtDlp(['--version'], 20000);
        linhas.push(`🔧 yt-dlp: ${versao.codigo === 0 ? versao.saida.trim() : `❌ ${M.resumoErro(versao.erro)}`}`);
        linhas.push(`📁 ${caminho}`);
    } catch (e) {
        linhas.push(`🔧 yt-dlp: ❌ não consegui instalar (${e.message})`);
    }
    linhas.push(`🎚️ ffmpeg: ${M.caminhoFfmpeg() ? '✅' : '❌ não encontrado'}`);
    linhas.push(`🍪 cookies do YouTube: ${require('fs').existsSync(M.ARQUIVO_COOKIES) ? '✅ youtube-cookies.txt' : '— sem arquivo (opcional)'}`);
    linhas.push('', `Teste com "${BUSCA_TESTE}":`);
    for (const fonte of M.FONTES) {
        const inicio = Date.now();
        try {
            const r = await M.buscarMusica(BUSCA_TESTE, { fontes: [fonte], log: { warn() {} } });
            linhas.push(`✅ ${fonte.nome} · ${r.titulo} (${Math.round((Date.now() - inicio) / 1000)}s${r.doCache ? ', do cache' : ''})`);
        } catch (e) {
            linhas.push(`❌ ${fonte.nome} · ${(e.falhas && e.falhas[0]) || e.message}`);
        }
    }
    return client.sendMessage(chatId, linhas.join('\n'));
}

module.exports = {
    name: 'play',
    async execute(client, msg, { chatId, senderRaw, args, isSuperAdmin, MessageMedia }) {
        const busca = args.join(' ').trim().slice(0, 150);
        const sub = busca.toLowerCase();

        try {
            if (!busca) {
                return msg.reply(`🎵 *COMO USAR O /play*
━━━━━━━━━━━━━━━━━━━━━
• */play nome da música* · ex.: */play Alan Walker Faded*
• */play link do YouTube ou SoundCloud*

⏱️ Músicas de até ${LIMITE_MIN()} minutos · 1 pedido por pessoa a cada minuto`);
            }
            if ((sub === 'diagnostico' || sub === 'diagnóstico') && isSuperAdmin) return diagnostico(client, msg, chatId);
            if (sub === 'atualizar' && isSuperAdmin) {
                await M.instalarYtDlp({ forcar: true });
                const v = await M.rodarYtDlp(['--version'], 20000);
                return msg.reply(`✅ yt-dlp atualizado: ${v.saida.trim() || 'ok'}`);
            }

            const userId = String(senderRaw).trim();
            const espera = M.podePedir(userId);
            if (espera > 0 && !isSuperAdmin) return msg.reply(`⏳ Calma, DJ! Espere *${espera}s* para pedir outra música.`);
            if (M.tamanhoFila() >= M.LIMITES.filaMax) return msg.reply('🎧 A fila de músicas está cheia agora. Tente de novo em 1 minuto!');

            M.marcarPedido(userId);
            const naFrente = M.tamanhoFila();
            await msg.reply(naFrente > 0 ? `🔎 Procurando *${busca}*... (${naFrente} pedido(s) na sua frente)` : `🔎 Procurando *${busca}*...`);

            const pedido = await M.entrarNaFila(() => M.buscarMusica(busca));
            if (!pedido.aceito) return msg.reply('🎧 A fila de músicas está cheia agora. Tente de novo em 1 minuto!');
            if (pedido.erro) {
                if (pedido.erro.message === 'longa demais') {
                    return msg.reply(`⏱️ Essa tem *${M.formatarDuracao(pedido.erro.duracao)}*. O limite é de ${LIMITE_MIN()} minutos.`);
                }
                console.warn('🎵 /play sem resultado:', busca, pedido.erro.falhas || pedido.erro.message);
                return msg.reply('😕 Não consegui encontrar ou baixar essa música agora. Tente escrever *artista + nome da música*.');
            }

            const m = pedido.resultado;
            const cartao = [
                `🎵 *${m.titulo || busca}*`,
                m.artista ? `👤 ${m.artista}` : null,
                `⏱️ ${m.completa ? M.formatarDuracao(m.duracao) : 'prévia de 30s'} · 📡 ${m.fonte}`,
                !m.completa ? '_Não consegui a música completa agora; aqui vai a prévia oficial._' : null,
                !m.completa && m.link ? `🔗 Completa: ${m.link}` : null,
            ].filter(Boolean).join('\n');

            const capa = await capaComoMidia(MessageMedia, m.capa);
            if (capa) await client.sendMessage(chatId, capa, { caption: cartao });
            else await client.sendMessage(chatId, cartao);

            const audio = m.arquivo
                ? MessageMedia.fromFilePath(m.arquivo)
                : new MessageMedia('audio/mpeg', m.buffer.toString('base64'), `${(m.titulo || 'musica').slice(0, 40)}.mp3`);
            audio.mimetype = 'audio/mpeg';
            return client.sendMessage(chatId, audio);
        } catch (err) {
            console.error('❌ Erro no /play:', err);
            return msg.reply('⚠️ O toca-discos engasgou. Tente de novo em instantes.');
        }
    },
};

function LIMITE_MIN() {
    return Math.round(M.LIMITES.duracaoMaxSeg / 60);
}
