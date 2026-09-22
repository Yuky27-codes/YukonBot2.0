module.exports = {
    name: 'dell',
    async execute(client, msg, { chatId, senderRaw, isAdmin, User, args }) {
        // Restringe o comando apenas para o grupo universal especificado
        const GRUPO_UNIVERSAL = "120363423062556856@g.us";
        if (chatId !== GRUPO_UNIVERSAL) {
            return await msg.reply("❌ *ACESSO NEGADO:* Este comando só pode ser executado no grupo universal da Yukon.");
        }

        // Mantém a trava de segurança para administradores
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
\`/dell (xxxxxxxxxxxx, xxxxxxxxxxxx), (remover coins tudo), (Tripulante, Veterano), (500)\``);
            }

            // Bloco 1: IDs dos usuários adaptados para o formato @lid
            const idsBrutos = blocos[0].split(',').map(id => {
                const numeroLimpo = id.replace(/\D/g, '');
                return `${numeroLimpo}@lid`;
            });
            
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
            // Se o bloco 3 foi usado para valor deixado (caso o bloco de cargos tenha sido omitido) ou se existe o bloco 4
            const indiceValor = blocos[3] !== undefined ? 3 : (cargosRemover.length === 0 && blocos[2] && /\d+/.test(blocos[2]) ? 2 : null);
            
            // Verificação direta do quarto bloco se houver
            if (blocos[3]) {
                const valNum = parseInt(blocos[3].replace(/\D/g, ''));
                if (!isNaN(valNum)) {
                    valorDeixado = valNum;
                }
            }

            let relatorioProcessamento = `⚙️ *RELATÓRIO DE REMOÇÃO EM MASSA* ⚙️\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
            let totalAfetados = 0;

            for (const alvoId of idsBrutos) {
                const alvoData = await User.findOne({ userId: alvoId, groupId: chatId });

                if (!alvoData) {
                    relatorioProcessamento += `⚠️ \`${alvoId}\`: Não encontrado nos registros.\n`;
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

                // 2. Lógica de Cargos (Roles) — Apenas se houver cargos informados para remoção
                if (cargosRemover.length > 0) {
                    const cargosAtuais = alvoData.roles || ["Tripulante"];
                    const novosCargos = cargosAtuais.filter(cargo => 
                        !cargosRemover.some(r => r.toLowerCase() === cargo.toLowerCase())
                    );
                    updateOps.roles = novosCargos.length > 0 ? novosCargos : ["Tripulante"];
                }

                // Aplica alterações no banco de dados se houver algo para atualizar
                if (Object.keys(updateOps).length > 0) {
                    await User.findOneAndUpdate(
                        { userId: alvoId, groupId: chatId },
                        { $set: updateOps }
                    );
                }

                totalAfetados++;
                relatorioProcessamento += `✅ \`${alvoId}\` — Atualizado com sucesso.\n`;
            }

            relatorioProcessamento += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📊 *Total de usuários processados:* ${totalAfetados}`;

            await client.sendMessage(chatId, relatorioProcessamento);

        } catch (e) {
            console.error("Erro no comando /dell:", e);
            await msg.reply("❌ Falha crítica ao processar a remoção em massa.");
        }
    }
};