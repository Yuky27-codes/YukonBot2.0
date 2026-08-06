const mongoose = require('mongoose');

// 🖼️ Nome do arquivo de imagem dentro da pasta /assets do projeto.
// Troque aqui se você salvar a imagem com outro nome.
const FOTO_BANCO = 'dinheiro.png';

// Gera uma barrinha de progresso visual (ex: ▰▰▰▰▱▱▱▱▱▱)
function barraProgresso(atual, max, tamanho = 10) {
    const pct = Math.max(0, Math.min(1, atual / max));
    const preenchido = Math.round(pct * tamanho);
    return '▰'.repeat(preenchido) + '▱'.repeat(tamanho - preenchido);
}

module.exports = {
    name: 'banco',
    async execute(client, msg, { chatId, senderRaw, args, User }) {
        try {
            const autorId = String(senderRaw).trim();
            const acao = args[0]?.toLowerCase();
            const valor = parseInt(args[1]);

            // --- MENU ---
            if (!acao) {
                const user = await User.findOne({ userId: autorId, groupId: chatId });
                const saldoBanco = user?.bankCoins || 0;
                const saldoCarteira = user?.coins || 0;

                const texto = `🏦✨ *BANCO CENTRAL YUKON* ✨🏦
━━━━━━━━━━━━━━━━━━━━━
👤 *Titular:* @${autorId.split('@')[0]}
━━━━━━━━━━━━━━━━━━━━━
💰 *Carteira:* ${saldoCarteira.toLocaleString('pt-BR')} YC
🏛️ *Cofre (Banco):* ${saldoBanco.toLocaleString('pt-BR')} YC
━━━━━━━━━━━━━━━━━━━━━
📜 *SERVIÇOS DISPONÍVEIS*
　💳 */banco depositar [valor]*
　💸 */banco sacar [valor]*
　📊 */banco extrato*
━━━━━━━━━━━━━━━━━━━━━
⚙️ *REGULAMENTO*
　▸ Depósito máx.: *100.000 YC/dia*
　▸ Saque máx.: *300.000 YC/operação*
　▸ Rendimento: *1% a 3% ao dia*
　▸ Saque sem taxas
━━━━━━━━━━━━━━━━━━━━━
_"Seu dinheiro seguro, sob a proteção da Yukon."_ 🛡️`;

                return await global.enviarMenuComFoto(msg, FOTO_BANCO, texto, [autorId]);
            }

            const user = await User.findOne({ userId: autorId, groupId: chatId });
            if (!user) return await client.sendMessage(chatId, "❌ Perfil não encontrado.");

            // --- DEPOSITAR ---
            if (acao === 'depositar') {
                if (isNaN(valor) || valor <= 0) {
                    return await client.sendMessage(chatId, "❌ Valor inválido!\n_Exemplo: /banco depositar 5000_");
                }

                if (user.coins < valor) {
                    return await client.sendMessage(chatId, `❌ Saldo insuficiente!\nSua carteira tem: *${user.coins.toLocaleString('pt-BR')} YC*`);
                }

                // Verifica limite diário de depósito
                const hoje = new Date().toLocaleDateString('pt-BR');
                const depositadoHoje = user.lastBankDepositDate === hoje ? (user.bankDepositedToday || 0) : 0;
                const limiteRestante = 100000 - depositadoHoje;

                if (limiteRestante <= 0) {
                    return await client.sendMessage(chatId, `🚫 Você já atingiu o limite de depósito hoje!\nLimite diário: *100.000 YC*\nReinicia à meia-noite.`);
                }

                const valorReal = Math.min(valor, limiteRestante);

                // Capturar depósito em GroupDailyStats
                const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD (compatível com fuso SP)
                const GroupDailyStats = mongoose.model('GroupDailyStats');
                await GroupDailyStats.findOneAndUpdate(
                    { groupId: chatId, date: today },
                    { $inc: { coinsGenerated: valorReal } },
                    { upsert: true }
                );

                await User.updateOne(
                    { userId: autorId, groupId: chatId },
                    {
                        $inc: { coins: -valorReal, bankCoins: valorReal },
                        $set: {
                            lastBankDepositDate: hoje,
                            bankDepositedToday: depositadoHoje + valorReal
                        }
                    }
                );

                const totalDepositadoHoje = depositadoHoje + valorReal;
                const aviso = valorReal < valor
                    ? `\n\n⚠️ _Limite diário atingido: depositado apenas *${valorReal.toLocaleString('pt-BR')} YC* (restante do limite)._`
                    : '';

                const texto = `✅💳 *DEPÓSITO CONFIRMADO*
━━━━━━━━━━━━━━━━━━━━━
📥 *Valor depositado:* +${valorReal.toLocaleString('pt-BR')} YC
🏛️ *Novo saldo no cofre:* ${(user.bankCoins + valorReal).toLocaleString('pt-BR')} YC
💰 *Carteira restante:* ${(user.coins - valorReal).toLocaleString('pt-BR')} YC
━━━━━━━━━━━━━━━━━━━━━
📅 *Limite diário:* ${totalDepositadoHoje.toLocaleString('pt-BR')}/100.000 YC
${barraProgresso(totalDepositadoHoje, 100000)}
━━━━━━━━━━━━━━━━━━━━━${aviso}`;

                return await global.enviarMenuComFoto(msg, FOTO_BANCO, texto, [autorId]);
            }

            // --- SACAR ---
            if (acao === 'sacar') {
                if (isNaN(valor) || valor <= 0) {
                    return await client.sendMessage(chatId, "❌ Valor inválido!\n_Exemplo: /banco sacar 5000_");
                }

                const saldoBanco = user.bankCoins || 0;

                if (saldoBanco <= 0) {
                    return await client.sendMessage(chatId, "❌ Você não tem saldo no banco!");
                }

                if (valor > 300000) {
                    return await client.sendMessage(chatId, `🚫 Limite de saque: *300.000 YC* por vez.\nVocê tentou sacar: *${valor.toLocaleString('pt-BR')} YC*`);
                }

                if (valor > saldoBanco) {
                    return await client.sendMessage(chatId, `❌ Saldo insuficiente no banco!\nSaldo atual: *${saldoBanco.toLocaleString('pt-BR')} YC*`);
                }

                await User.updateOne(
                    { userId: autorId, groupId: chatId },
                    { $inc: { coins: valor, bankCoins: -valor } }
                );

                const texto = `✅💸 *SAQUE CONFIRMADO*
━━━━━━━━━━━━━━━━━━━━━
📤 *Valor sacado:* -${valor.toLocaleString('pt-BR')} YC
🏛️ *Novo saldo no cofre:* ${(saldoBanco - valor).toLocaleString('pt-BR')} YC
💰 *Carteira atual:* ${(user.coins + valor).toLocaleString('pt-BR')} YC
━━━━━━━━━━━━━━━━━━━━━
_Saque processado sem taxas._ ✔️`;

                return await global.enviarMenuComFoto(msg, FOTO_BANCO, texto, [autorId]);
            }

            // --- EXTRATO ---
            if (acao === 'extrato') {
                const saldoBanco = user.bankCoins || 0;
                const rendimento = user.lastBankRendimento || 0;
                const dataRendimento = user.lastBankRendimentoDate || 'Nenhum ainda';
                const depositadoHoje = user.bankDepositedToday || 0;
                const hoje = new Date().toLocaleDateString('pt-BR');
                const depositoHojeReal = user.lastBankDepositDate === hoje ? depositadoHoje : 0;

                const texto = `📊🏦 *EXTRATO — BANCO CENTRAL YUKON*
━━━━━━━━━━━━━━━━━━━━━
👤 *Titular:* @${autorId.split('@')[0]}
━━━━━━━━━━━━━━━━━━━━━
🏛️ *Saldo no cofre:* ${saldoBanco.toLocaleString('pt-BR')} YC
💰 *Carteira:* ${user.coins.toLocaleString('pt-BR')} YC
━━━━━━━━━━━━━━━━━━━━━
📈 *ÚLTIMO RENDIMENTO*
　+${rendimento.toLocaleString('pt-BR')} YC em ${dataRendimento}
━━━━━━━━━━━━━━━━━━━━━
📅 *DEPÓSITO DE HOJE*
　${depositoHojeReal.toLocaleString('pt-BR')}/100.000 YC
　${barraProgresso(depositoHojeReal, 100000)}
━━━━━━━━━━━━━━━━━━━━━`;

                return await global.enviarMenuComFoto(msg, FOTO_BANCO, texto, [autorId]);
            }

            return await client.sendMessage(chatId, "❓ Ação inválida! Use: *depositar*, *sacar* ou *extrato*.");

        } catch (e) {
            console.error("❌ Erro no /banco:", e);
            await client.sendMessage(chatId, "⚠️ Erro ao processar operação bancária.");
        }
    }
};