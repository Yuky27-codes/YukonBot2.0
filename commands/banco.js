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

                return await client.sendMessage(chatId, `🏦 *BANCO YUKON — CENTRAL FINANCEIRA*
━━━━━━━━━━━━━━━━━━━━━
💰 *Carteira:* ${saldoCarteira.toLocaleString('pt-BR')} YC
🏦 *Banco:* ${saldoBanco.toLocaleString('pt-BR')} YC

📋 *COMANDOS:*
💳 */banco depositar [valor]* — Deposita YC no banco
💸 */banco sacar [valor]* — Saca YC do banco
📊 */banco extrato* — Vê seu histórico

⚙️ *REGRAS:*
• Depósito máximo: *100.000 YC/dia*
• Saque máximo: *300.000 YC*
• Rendimento: *1% a 3% ao dia* (aleatório)
• Sem taxas de saque
━━━━━━━━━━━━━━━━━━━━━`);
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

                const aviso = valorReal < valor
                    ? `\n⚠️ Limite diário: depositado apenas *${valorReal.toLocaleString('pt-BR')} YC* (restante do limite).`
                    : '';

                return await client.sendMessage(chatId, `✅ *DEPÓSITO REALIZADO*
━━━━━━━━━━━━━━━━━━━━━
💳 *Depositado:* ${valorReal.toLocaleString('pt-BR')} YC
🏦 *Saldo no banco:* ${(user.bankCoins + valorReal).toLocaleString('pt-BR')} YC
💰 *Carteira:* ${(user.coins - valorReal).toLocaleString('pt-BR')} YC
📅 *Depositado hoje:* ${(depositadoHoje + valorReal).toLocaleString('pt-BR')}/100.000 YC${aviso}
━━━━━━━━━━━━━━━━━━━━━`);
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

                return await client.sendMessage(chatId, `✅ *SAQUE REALIZADO*
━━━━━━━━━━━━━━━━━━━━━
💸 *Sacado:* ${valor.toLocaleString('pt-BR')} YC
🏦 *Saldo no banco:* ${(saldoBanco - valor).toLocaleString('pt-BR')} YC
💰 *Carteira:* ${(user.coins + valor).toLocaleString('pt-BR')} YC
━━━━━━━━━━━━━━━━━━━━━`);
            }

            // --- EXTRATO ---
            if (acao === 'extrato') {
                const saldoBanco = user.bankCoins || 0;
                const rendimento = user.lastBankRendimento || 0;
                const dataRendimento = user.lastBankRendimentoDate || 'Nenhum ainda';
                const depositadoHoje = user.bankDepositedToday || 0;
                const hoje = new Date().toLocaleDateString('pt-BR');
                const depositoHojeReal = user.lastBankDepositDate === hoje ? depositadoHoje : 0;

                return await client.sendMessage(chatId, `📊 *EXTRATO BANCÁRIO — YUKON*
━━━━━━━━━━━━━━━━━━━━━
👤 *Titular:* @${autorId.split('@')[0]}
🏦 *Saldo no banco:* ${saldoBanco.toLocaleString('pt-BR')} YC
💰 *Carteira:* ${user.coins.toLocaleString('pt-BR')} YC

📈 *ÚLTIMO RENDIMENTO:*
• Valor: *+${rendimento.toLocaleString('pt-BR')} YC*
• Data: *${dataRendimento}*

📅 *HOJE:*
• Depositado: *${depositoHojeReal.toLocaleString('pt-BR')}/100.000 YC*
━━━━━━━━━━━━━━━━━━━━━`, { mentions: [autorId] });
            }

            return await client.sendMessage(chatId, "❓ Ação inválida! Use: *depositar*, *sacar* ou *extrato*.");

        } catch (e) {
            console.error("❌ Erro no /banco:", e);
            await client.sendMessage(chatId, "⚠️ Erro ao processar operação bancária.");
        }
    }
};