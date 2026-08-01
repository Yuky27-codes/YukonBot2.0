const { PATENTES } = require('./patentes');

module.exports = {
    name: 'comprar',
    async execute(client, msg, { args, chatId, senderRaw, User }) {
        try {
            const item = args[0];

            // Monta a lista de produtos direto do patentes.js (fonte única de verdade
            // — preço e bônus da loja sempre batem com o que os comandos aplicam de verdade)
            const produto = PATENTES.find(p => String(p.nivel) === item);
            if (!produto) {
                return await msg.reply("❗ *SETOR DE VENDAS:* Item inválido! Use um número de 1 a 13.");
            }

            const userComprador = await User.findOne({ userId: senderRaw, groupId: chatId });
            if (!userComprador) return await msg.reply("❌ Perfil não encontrado.");

            // 1. CHECAGEM DE SEGURANÇA (LIMPEZA DE CAMPO SUJO)
            // Se o inventário for um objeto (tipo {}), nós forçamos ele a virar um array agora mesmo.
            if (userComprador.inventory && !Array.isArray(userComprador.inventory)) {
                await User.updateOne(
                    { userId: senderRaw, groupId: chatId },
                    { $set: { inventory: [] } }
                );
                userComprador.inventory = []; // Atualiza na memória também
            }

            const moedasAtuais = userComprador.coins || 0;
            const inventarioAtual = Array.isArray(userComprador.inventory) ? userComprador.inventory : [];

            if (moedasAtuais < produto.preco) {
                const falta = produto.preco - moedasAtuais;
                return await msg.reply(`❌ *SALDO INSUFICIENTE:* Faltam ${falta.toLocaleString('pt-BR')} moedas.`);
            }

            const jaPossui = inventarioAtual.some(i => i.name === produto.nome);
            if (jaPossui) {
                return await msg.reply("🏅 Você já possui esta patente!");
            }

            // 2. TRANSAÇÃO COM MODO DE COMPATIBILIDADE
            const finalUser = await User.findOneAndUpdate(
                { userId: senderRaw, groupId: chatId },
                { 
                    $inc: { coins: -produto.preco },
                    $push: { 
                        inventory: { 
                            name: produto.nome, 
                            type: 'cargo', 
                            date: new Date() 
                        } 
                    } 
                },
                { returnDocument: 'after', upsert: true }
            );

            // Monta a lista de bônus que essa patente concede, só com o que ela realmente tem
            const bonus = [];
            if (produto.sorteBonus > 0) bonus.push(`🍀 +${produto.sorteBonus}% de sorte (cassino e roubo)`);
            if (produto.coinBonusPercent > 0) bonus.push(`💰 +${produto.coinBonusPercent}% em todos os ganhos de coins`);
            if (produto.usosExtras.cassino > 0) bonus.push(`🎰 +${produto.usosExtras.cassino} uso(s) extra(s) de /cassino por dia`);
            if (produto.usosExtras.roubar > 0) bonus.push(`🥷 +${produto.usosExtras.roubar} uso(s) extra(s) de /roubar por dia`);
            if (produto.missaoCooldownReducaoMin > 0) bonus.push(`⏳ -${produto.missaoCooldownReducaoMin}min no cooldown da /missão`);
            if (produto.protecaoRoubo > 0) bonus.push(`🛡️ -${produto.protecaoRoubo}% de chance de ser roubado`);
            if (produto.jurosBonusPercent > 0) bonus.push(`🏦 +${produto.jurosBonusPercent}% de juros no banco`);

            const listaBonus = bonus.length > 0
                ? `\n🎁 *VANTAGENS DESBLOQUEADAS:*\n${bonus.map(b => `• ${b}`).join('\n')}\n`
                : '';

            const msgSucesso = `
🎊 *AQUISIÇÃO CONCLUÍDA* 🎊
━━━━━━━━━━━━━━━━━━━━━━━
🚀 *PATENTE:* ${produto.nome.toUpperCase()} ${produto.emblema}
📉 *SALDO ATUAL:* ${finalUser.coins.toLocaleString('pt-BR')} YC
${listaBonus}━━━━━━━━━━━━━━━━━━━━━━━
⚠️ _Se você já tinha outra patente, só a mais alta conta pra valer os bônus._`.trim();

            await msg.reply(msgSucesso);

        } catch (e) {
            console.error("--- ERRO NO COMANDO COMPRAR ---");
            console.error(e);
            
            // Se o erro de "not an array" acontecer mesmo assim, resetamos o campo na hora
            if (e.message.includes('must be an array')) {
                await User.updateOne({ userId: senderRaw, groupId: chatId }, { $set: { inventory: [] } });
                return await msg.reply("⚠️ Seus arquivos de inventário estavam corrompidos e foram resetados. Por favor, tente comprar novamente.");
            }

            await msg.reply("⚠️ Erro técnico ao processar compra.");
        }
    }
};