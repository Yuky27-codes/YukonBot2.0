module.exports = {
    name: 'dell',
    async execute(client, msg, { chatId, senderRaw, isAdmin, User, args }) {
        // Mantém a trava de segurança para administradores globais/do bot
        if (!isAdmin) {
            return await msg.reply("❌ *ACESSO NEGADO:* Você não tem autorização para executar este comando de limpeza em massa.");
        }

        try {
            // Junta todos os argumentos em uma única string para processar os parênteses
            const textoCompleto = args.join(" ");

            // Expressão regular para capturar os blocos entre parênteses
            const regexBlocos = /\(([^)]*)\)/g;
            const blocos = [];
            let match;

            while ((match = regexBlocos.exec(textoCompleto)) !== null) {
                blocos.push(match[1].trim());
            }

            if (blocos.length < 2) {
                return await msg.reply(`❓ *COMO USAR O COMANDO EM MASSA:*
\`/dell (ID, ID, ID...), (remover coins [valor] ou [tudo]), (cargo1, cargo2 - OPCIONAL), (valor deixado - OPCIONAL)\`

*Exemplo:*
\`/dell (xxxxxxxxxxxx), (remover coins tudo), (), (10000)\``);
            }

            // Bloco 1: Extrai apenas os números puros de cada ID enviado
            const numerosBrutos = blocos[0].split(',').map(id => id.replace(/\D/g, '')).filter(Boolean);
            
            // Bloco 2: Configuração de Coins
            const instrucaoCoins = blocos[1].toLowerCase();
            let acaoCoins = 'nada'; 
            let valorCoinsRemover = 0;

            if (instrucaoCoins.includes('tudo')) {
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

            // Bloco 4: Valor que vai ser deixado na conta (Opcional)
            let valorDeixado = null;
            if (blocos[3]) {
                const valNum = parseInt(blocos[3].replace(/\D/g, ''));
                if (!isNaN(valNum)) {
                    valorDeixado = valNum;
                }
            }

            let relatorioProcessamento = `⚙️ *RELATÓRIO DE REMOÇÃO EM MASSA* ⚙️\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
            let totalAfetados = 0;

            for (const num of numerosBrutos) {
                // Busca o usuário pelo ID independente do groupId, testando as variações de sufixo
                const possiveisIds = [`${num}@lid`, `${num}@s.whatsapp.net`, num];
                let alvoData = await User.findOne({ userId: { $in: possiveisIds } });

                if (!alvoData) {
                    relatorioProcessamento += `⚠️ \`${num}\`: Não encontrado nos registros.\n`;
                    continue;
                }

                let updateOps = {};

                // 1. Lógica de Coins
                if (acaoCoins === 'tudo') {
                    updateOps.coins = 0;
                } else if (acaoCoins === 'valor' && valorCoinsRemover > 0) {
                    const novoSaldo = Math.max(0, (alvoData.coins || 0) - valorCoinsRemover);
                    updateOps.coins = novoSaldo;
                }

                // Sobrescreve caso tenha um valor fixo definido para restar na conta
                if (valorDeixado !== null) {
                    updateOps.coins = Math.min(alvoData.coins || 0, valorDeixado);
                }

                // 2. Lógica de Cargos (Roles)
                if (cargosRemover.length > 0) {
                    const cargosAtuais = alvoData.roles || ["Tripulante"];
                    const novosCargos = cargosAtuais.filter(cargo => 
                        !cargosRemover.some(r => r.toLowerCase() === cargo.toLowerCase())
                    );
                    updateOps.roles = novosCargos.length > 0 ? novosCargos : ["Tripulante"];
                }

                // Aplica alterações no banco de dados usando o ID exato encontrado no documento
                if (Object.keys(updateOps).length > 0) {
                    await User.findOneAndUpdate(
                        { _id: alvoData._id },
                        { $set: updateOps }
                    );
                }

                totalAfetados++;
                relatorioProcessamento += `✅ \`${alvoData.userId}\` — Atualizado com sucesso.\n`;
            }

            relatorioProcessamento += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📊 *Total de usuários processados:* ${totalAfetados}`;

            await client.sendMessage(chatId, relatorioProcessamento);

        } catch (e) {
            console.error("Erro no comando /dell:", e);
            await msg.reply("❌ Falha crítica ao processar a remoção em massa.");
        }
    }
};