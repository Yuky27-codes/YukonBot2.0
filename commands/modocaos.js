// Armazena os grupos com modo caos ativo: { chatId: timestamp de expiração }
if (!global.modoCaosAtivo) global.modoCaosAtivo = {};

module.exports = {
    name: 'modocaos',
    async execute(client, msg, { chatId, senderRaw, User }) {
        try {
            const autorId = String(senderRaw).trim();
            const CUSTO = 50000;
            const DURACAO_MS = 10 * 60 * 1000; // 10 minutos

            // Verifica se já tem modo caos ativo no grupo
            if (global.modoCaosAtivo[chatId] && global.modoCaosAtivo[chatId] > Date.now()) {
                const restante = Math.ceil((global.modoCaosAtivo[chatId] - Date.now()) / 1000 / 60);
                return await client.sendMessage(chatId, `⚠️ *MODO CAOS já está ativo!*\n\n🔴 Tempo restante: *${restante} minuto(s)*\n\nNinguém está protegido até o fim!`);
            }

            // Verifica limite diário
            const hoje = new Date().toLocaleDateString('pt-BR');
            const user = await User.findOne({ userId: autorId, groupId: chatId });

            if (!user) return await client.sendMessage(chatId, "❌ Perfil não encontrado.");

            if (user.lastModoCaosDate === hoje) {
                return await client.sendMessage(chatId, `🚫 Você já ativou o *Modo Caos* hoje!\nVolte amanhã para semear o caos novamente.`);
            }

            // Verifica saldo
            if (!user || user.coins < CUSTO) {
                return await client.sendMessage(chatId, `❌ *SALDO INSUFICIENTE!*\nO Modo Caos custa *${CUSTO.toLocaleString('pt-BR')} YC*.\nSeu saldo: *${(user?.coins || 0).toLocaleString('pt-BR')} YC*`);
            }

            // Debita e registra
            await User.updateOne(
                { userId: autorId, groupId: chatId },
                {
                    $inc: { coins: -CUSTO },
                    $set: { lastModoCaosDate: hoje }
                }
            );

            // Ativa o modo caos globalmente para o grupo
            const expiraEm = Date.now() + DURACAO_MS;
            global.modoCaosAtivo[chatId] = expiraEm;

            // Desativa automaticamente após 10 minutos
            setTimeout(async () => {
                delete global.modoCaosAtivo[chatId];
                await client.sendMessage(chatId, `✅ *MODO CAOS ENCERRADO!*\n\nA ordem foi restaurada na Yukon Station.\nAs proteções voltaram a funcionar normalmente.`);
            }, DURACAO_MS);

            await client.sendMessage(chatId, `🔴 *MODO CAOS ATIVADO!*
━━━━━━━━━━━━━━━━━━━━━
💥 @${autorId.split('@')[0]} ativou o Modo Caos!

⚠️ *REGRAS DO CAOS:*
• Todas as proteções estão desativadas!
• Modo passivo ignorado!
• Qualquer um pode roubar qualquer um!

⏳ *Duração:* 10 minutos
💰 *Custo pago:* ${CUSTO.toLocaleString('pt-BR')} YC
━━━━━━━━━━━━━━━━━━━━━
🏴‍☠️ *Que o caos reine!*`, { mentions: [autorId] });

        } catch (e) {
            console.error("❌ Erro no /modocaos:", e);
            await client.sendMessage(chatId, "⚠️ Erro ao ativar o Modo Caos.");
        }
    }
};