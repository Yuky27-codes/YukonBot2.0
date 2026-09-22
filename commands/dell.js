module.exports = {
    name: 'dell',
    async execute(client, msg, { chatId, isAdmin, User, args }) {
        // Mantém a trava de segurança para administradores
        if (!isAdmin) {
            return await msg.reply("❌ *ACESSO NEGADO:* Você não tem autorização para executar este comando de limpeza em massa.");
        }

        try {
            const textoCompleto = args.join(" ").trim();

            // VERIFICAÇÃO ESPECIAL: Se o comando for /dell rankglobal
            if (textoCompleto.toLowerCase() === 'rankglobal') {
                const topGeral = await User.find({ userId: { $ne: null } })
                    .sort({ coins: -1 })
                    .limit(10);

                if (!topGeral || topGeral.length === 0) {
                    return await msg.reply("🌌 Nenhum usuário encontrado no ranking global para limpar.");
                }

                let relatorio = `⚙️ *RELATÓRIO: LIMPEZA DO RANKGLOBAL* ⚙️\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
                let processados = 0;

                for (const alvoData of topGeral) {
                    const saldoAtual = alvoData.coins || 0;
                    
                    if (saldoAtual > 10000) {
                        await User.findOneAndUpdate(
                            { _id: alvoData._id },
                            { $set: { coins: 10000 } }
                        );
                        relatorio += `✅ \`${alvoData.userId}\` — Reduzido de ${saldoAtual.toLocaleString('pt-BR')} para *10.000* coins.\n`;
                        processados++;
                    } else {
                        relatorio += `ℹ️ \`${alvoData.userId}\` — Já possui menos de 10k (${saldoAtual.toLocaleString('pt-BR')}), ignorado.\n`;
                    }
                }

                relatorio += `━━━━━━━━━━━━━━━━━━━━━\n📊 *Total ajustados:* ${processados}`;
                return await client.sendMessage(chatId, relatorio);
            }

            // ==========================================
            // FLUXO NORMAL DO COMANDO /dell EM MASSA
            // ==========================================
            const regexBlocos = /\(([^)]*)\)/g;
            const blocos = [];
            let match;

            while ((match = regexBlocos.exec(textoCompleto)) !== null) {
                blocos.push(match[1].trim());
            }

            if (blocos.length < 2) {
                return await msg.reply(`❓ *COMO USAR O COMANDO EM MASSA:*
\`/dell rankglobal\`
_ou_
\`/dell (ID, ID...), (tudo ou valor p/ remover), (cargo1, cargo2 - OPCIONAL), (valor fixo que sobra - OPCIONAL)\``);
            }

            const numerosBrutos = blocos[0].split(',').map(id => id.replace(/\D/g, '')).filter(Boolean);
            
            // Bloco 2: Configuração de Coins corrigida
            const instrucaoCoins = blocos[1].toLowerCase();
            let acaoCoins = 'nada'; 
            let valorCoinsRemover = 0;

            if (instrucaoCoins.includes('tudo') || instrucaoCoins === 'all' || instrucaoCoins === '0') {
                acaoCoins = 'tudo';
            } else {
                const numMatch = instrucaoCoins.match(/\d+/);
                if (numMatch) {
                    acaoCoins = 'valor';
                    valorCoinsRemover = parseInt(numMatch[0]);
                }
            }

            // Bloco 3: Cargos a remover (Opcional)
            let cargosRemover = [];
            if (blocos[2] && blocos[2].length > 0) {
                cargosRemover = blocos[2].split(',').map(c => c.trim()).filter(Boolean);
            }

            // Bloco 4: Valor fixo deixado na conta (Opcional)
            let valorDeixado = null;
            if (blocos[3] && blocos[3].length > 0) {
                const valNum = parseInt(blocos[3].replace(/\D/g, ''));
                if (!isNaN(valNum)) {
                    valorDeixado = valNum;
                }
            }

            let relatorioProcessamento = `⚙️ *RELATÓRIO DE REMOÇÃO EM MASSA* ⚙️\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
            let totalAfetados = 0;

            for (const num of numerosBrutos) {
                const possiveisIds = [`${num}@lid`, `${num}@s.whatsapp.net`, num];
                let alvoData = await User.findOne({ userId: { $in: possiveisIds } });

                if (!alvoData) {
                    relatorioProcessamento += `⚠️ \`${num}\`: Não encontrado nos registros.\n`;
                    continue;
                }

                let saldoAtual = alvoData.coins || 0;
                let novoSaldo = saldoAtual;

                // 1. Aplicação estrita da lógica de coins
                if (valorDeixado !== null) {
                    // Se foi definido um teto/valor fixo para restar na conta
                    novoSaldo = Math.min(saldoAtual, valorDeixado);
                } else if (acaoCoins === 'tudo') {
                    // Zera tudo
                    novoSaldo = 0;
                } else if (acaoCoins === 'valor' && valorCoinsRemover > 0) {
                    // Subtrai o valor especificado, garantindo que nunca fique abaixo de 0
                    novoSaldo = Math.max(0, saldoAtual - valorCoinsRemover);
                }

                let updateOps = { coins: novoSaldo };

                // 2. Lógica de Cargos (Roles)
                if (cargosRemover.length > 0) {
                    const cargosAtuais = alvoData.roles || ["Tripulante"];
                    const novosCargos = cargosAtuais.filter(cargo => 
                        !cargosRemover.some(r => r.toLowerCase() === cargo.toLowerCase())
                    );
                    updateOps.roles = novosCargos.length > 0 ? novosCargos : ["Tripulante"];
                }

                // Salva as alterações no banco de dados
                await User.findOneAndUpdate(
                    { _id: alvoData._id },
                    { $set: updateOps }
                );

                totalAfetados++;
                relatorioProcessamento += `✅ \`${alvoData.userId}\` — Coins atualizados (${saldoAtual} ➔ ${novoSaldo}).\n`;
            }

            relatorioProcessamento += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📊 *Total de usuários processados:* ${totalAfetados}`;

            await client.sendMessage(chatId, relatorioProcessamento);

        } catch (e) {
            console.error("Erro no comando /dell:", e);
            await msg.reply("❌ Falha crítica ao processar a limpeza.");
        }
    }
};