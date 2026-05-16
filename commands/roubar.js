module.exports = {
    name: 'roubar',
    async execute(client, msg, { chatId, senderRaw, User }) {
        try {
            const mencoes = msg.mentionedIds;
            const alvoRaw = mencoes.length > 0 ? (mencoes[0]._serialized || mencoes[0]) : null;
            const autorId = String(senderRaw).trim();
            const meuId = "143130204626959@lid";

            if (!alvoRaw) return await client.sendMessage(chatId, "👤 *SISTEMA:* Mencione o alvo do assalto!");
            
            const alvoId = String(alvoRaw).trim();
            if (alvoId === autorId) return await client.sendMessage(chatId, "❓ Você não pode roubar a si mesmo.");

            // --- 🛡️ IMUNIDADE SILENCIOSA DO COMANDANTE YUKON ---
            if (alvoId === meuId) return; 

            let autorData = await User.findOne({ userId: autorId, groupId: chatId });
            const alvoData = await User.findOne({ userId: alvoId, groupId: chatId });

            if (!autorData) return;

            // --- 🕒 SISTEMA DE LIMITE DIÁRIO (CORRIGIDO) ---
            const hoje = new Date().toLocaleDateString('pt-BR');
            const isComandante = autorId === meuId;

            if (!isComandante) {
                // Força o reset no banco de dados se o dia mudou
                if (autorData.lastRobberyDate !== hoje) {
                    await User.updateOne(
                        { userId: autorId, groupId: chatId }, 
                        { $set: { robberyCount: 0, lastRobberyDate: hoje } }
                    );
                    autorData.robberyCount = 0; // Atualiza localmente
                }

                if (autorData.robberyCount >= 3) {
                    return await client.sendMessage(chatId, "🚫 *LIMITE ATINGIDO:* Você já realizou seus 3 assaltos diários. A polícia da Yukon está de olho em você!");
                }
            }

            // --- 🛡️ VERIFICAÇÃO DE MODO PASSIVO (IMUNE) ---
            if (autorData.isPassive) {
                return await client.sendMessage(chatId, "⚠️ *AVISO:* Você está no **Modo Passivo**. Desative seu escudo para poder realizar assaltos!");
            }

            if (alvoData && alvoData.isPassive) {
                return await client.sendMessage(chatId, `🛡️ *ESCUDO ATIVO:* @${alvoId.split('@')[0]} está no Modo Passivo e não pode ser roubado.`, { mentions: [alvoId] });
            }

            if (!alvoData || alvoData.coins <= 0) return await client.sendMessage(chatId, "⚠️ O alvo não tem moedas.");
            
            // --- 🛡️ VERIFICAÇÃO DE PROTEÇÃO (ESCUDO DE PLASMA COMPRADO) ---
            const agora = Date.now();
            if (alvoData.protectedUntil && alvoData.protectedUntil > agora) {
                const tempoRestanteMs = alvoData.protectedUntil - agora;
                const horas = Math.floor(tempoRestanteMs / (1000 * 60 * 60));
                const minutos = Math.floor((tempoRestanteMs % (1000 * 60 * 60)) / (1000 * 60));
                return await client.sendMessage(chatId, `🛡️ *ACESSO NEGADO:* O alvo está protegido por um Escudo de Plasma!\n⏳ Expira em: *${horas}h ${minutos}min*`, { mentions: [alvoId] });
            }

            if (autorData.coins < 50) return await client.sendMessage(chatId, "⚠️ Você precisa de 50 coins para arriscar um roubo.");

            // Se chegou aqui, o roubo vai acontecer. Incrementamos o contador agora.
            await User.updateOne({ userId: autorId, groupId: chatId }, { $inc: { robberyCount: 1 } });

            const sucesso = Math.random() < 0.40; // 40% de chance

            if (sucesso) {
                const valorRoubado = Math.floor(alvoData.coins * 0.20); 
                await User.updateOne({ userId: autorId, groupId: chatId }, { $inc: { coins: valorRoubado } });
                await User.updateOne({ userId: alvoId, groupId: chatId }, { $inc: { coins: -valorRoubado } });

                await client.sendMessage(chatId, `🥷 *GOLPE DE MESTRE!*\n\n@${autorId.split('@')[0]} roubou *${valorRoubado}* coins de @${alvoId.split('@')[0]}!`, { mentions: [autorId, alvoId] });
            } else {
                const multa = Math.floor(autorData.coins * 0.30);
                const tempoPrisao = 5 * 60 * 1000; 
                const soltarEm = Date.now() + tempoPrisao;

                await User.updateOne(
                    { userId: autorId, groupId: chatId },
                    { 
                        $inc: { coins: -multa }, 
                        $set: { isMuted: true, muteExpires: soltarEm } 
                    }
                );

                await client.sendMessage(chatId, `🚨 *POLÍCIA DA YUKON!*\n\n@${autorId.split('@')[0]} foi pego! \n💰 Perdeu: *${multa}* coins\n⛓️ Prisão: *5 minutos*`, { mentions: [autorId] });
            }
        } catch (e) { console.error("❌ ERRO NO ROUBAR:", e); }
    }
};