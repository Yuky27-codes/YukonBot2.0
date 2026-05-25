// Sessões ativas do jogo da velha por grupo
const sessoesVelha = new Map();

module.exports = {
    name: 'jogovelha',
    async execute(client, msg, { chatId, senderRaw, args, User }) {
        try {
            const autorId = String(senderRaw).trim();
            const subcomando = args[0]?.toLowerCase();

            // --- VERIFICAR JOGO ATIVO ---
            if (sessoesVelha.has(chatId)) {
                const s = sessoesVelha.get(chatId);

                // Jogada: /jogovelha [1-9]
                if (subcomando && !isNaN(subcomando)) {
                    const posicao = parseInt(subcomando);

                    if (posicao < 1 || posicao > 9) {
                        return await client.sendMessage(chatId, "❌ Posição inválida! Escolha de 1 a 9.");
                    }

                    // Verifica se é a vez do jogador
                    if (autorId !== s.jogadorAtual) {
                        return await client.sendMessage(chatId, `⏳ Não é sua vez! Aguarde @${s.jogadorAtual.split('@')[0]}.`, { mentions: [s.jogadorAtual] });
                    }

                    // Verifica se a posição já foi jogada
                    if (s.tabuleiro[posicao - 1] !== posicao.toString()) {
                        return await client.sendMessage(chatId, "❌ Posição já ocupada! Escolha outra.");
                    }

                    // Faz a jogada
                    const simbolo = s.jogadorAtual === s.jogador1 ? '❌' : '⭕';
                    s.tabuleiro[posicao - 1] = simbolo;

                    // Verifica vitória
                    const venceu = verificarVitoria(s.tabuleiro);
                    const empate = !venceu && s.tabuleiro.every(c => c === '❌' || c === '⭕');

                    const tabuleiroMsg = montarTabuleiro(s.tabuleiro);

                    if (venceu) {
                        sessoesVelha.delete(chatId);
                        const premio = 300;
                        await User.updateOne({ userId: autorId, groupId: chatId }, { $inc: { coins: premio } });
                        return await client.sendMessage(chatId, `${tabuleiroMsg}\n\n🏆 *@${autorId.split('@')[0]} VENCEU!*\n💰 *+${premio} YC* adicionados!\n\nUse */jogovelha @pessoa* para jogar novamente!`, { mentions: [autorId] });
                    }

                    if (empate) {
                        sessoesVelha.delete(chatId);
                        return await client.sendMessage(chatId, `${tabuleiroMsg}\n\n🤝 *EMPATE!* Ninguém ganhou desta vez.\n\nUse */jogovelha @pessoa* para jogar novamente!`);
                    }

                    // Troca o turno
                    s.jogadorAtual = s.jogadorAtual === s.jogador1 ? s.jogador2 : s.jogador1;
                    const proximoSimbolo = s.jogadorAtual === s.jogador1 ? '❌' : '⭕';

                    return await client.sendMessage(chatId, `${tabuleiroMsg}\n\n${proximoSimbolo} Vez de @${s.jogadorAtual.split('@')[0]}!\nDigite */jogovelha [1-9]* para jogar.`, { mentions: [s.jogadorAtual] });
                }

                // Desistir: /jogovelha desistir
                if (subcomando === 'desistir') {
                    if (autorId !== s.jogador1 && autorId !== s.jogador2) {
                        return await client.sendMessage(chatId, "❌ Você não está neste jogo!");
                    }
                    const oponente = autorId === s.jogador1 ? s.jogador2 : s.jogador1;
                    sessoesVelha.delete(chatId);
                    return await client.sendMessage(chatId, `🏳️ @${autorId.split('@')[0]} desistiu!\n🏆 @${oponente.split('@')[0]} vence por W.O!`, { mentions: [autorId, oponente] });
                }

                return await client.sendMessage(chatId, `⚠️ Já há um jogo em andamento!\n\n${montarTabuleiro(s.tabuleiro)}\n\n${s.jogadorAtual === s.jogador1 ? '❌' : '⭕'} Vez de @${s.jogadorAtual.split('@')[0]}!\nDigite */jogovelha [1-9]* para jogar ou */jogovelha desistir* para abandonar.`, { mentions: [s.jogadorAtual] });
            }

            // --- INICIAR NOVO JOGO ---
            const mencoes = msg.mentionedIds;
            if (!mencoes.length) {
                return await client.sendMessage(chatId, `🎮 *JOGO DA VELHA — YUKON*\n\n*Como jogar:*\n1️⃣ Desafie alguém: */jogovelha @pessoa*\n2️⃣ Faça sua jogada: */jogovelha [1-9]*\n3️⃣ Desista: */jogovelha desistir*\n\n💰 *Prêmio:* 300 YC para quem vencer!`);
            }

            const oponenteId = String(mencoes[0]._serialized || mencoes[0]).trim();

            if (oponenteId === autorId) {
                return await client.sendMessage(chatId, "❌ Você não pode jogar contra si mesmo!");
            }

            // Tabuleiro inicial com números de 1-9
            const tabuleiro = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

            // Jogador 1 (quem desafiou) começa com ❌
            sessoesVelha.set(chatId, {
                jogador1: autorId,
                jogador2: oponenteId,
                jogadorAtual: autorId,
                tabuleiro
            });

            const tabuleiroMsg = montarTabuleiro(tabuleiro);

            await client.sendMessage(chatId, `🎮 *JOGO DA VELHA — YUKON*
━━━━━━━━━━━━━━━━━━━━━
❌ @${autorId.split('@')[0]} VS ⭕ @${oponenteId.split('@')[0]}

${tabuleiroMsg}

❌ Vez de @${autorId.split('@')[0]}!
Digite */jogovelha [1-9]* para jogar.
💰 *Prêmio:* 300 YC para o vencedor!
━━━━━━━━━━━━━━━━━━━━━`, { mentions: [autorId, oponenteId] });

        } catch (e) {
            console.error("❌ Erro no /jogovelha:", e);
            await client.sendMessage(chatId, "⚠️ Erro ao processar o jogo.");
        }
    }
};

function montarTabuleiro(t) {
    return `\`\`\`
 ${t[0]} │ ${t[1]} │ ${t[2]}
───┼───┼───
 ${t[3]} │ ${t[4]} │ ${t[5]}
───┼───┼───
 ${t[6]} │ ${t[7]} │ ${t[8]}
\`\`\``;
}

function verificarVitoria(t) {
    const linhas = [
        [0,1,2], [3,4,5], [6,7,8], // horizontais
        [0,3,6], [1,4,7], [2,5,8], // verticais
        [0,4,8], [2,4,6]            // diagonais
    ];
    return linhas.some(([a,b,c]) => t[a] === t[b] && t[b] === t[c] && (t[a] === '❌' || t[a] === '⭕'));
}