module.exports = {
    name: 'comprar',
    async execute(client, msg, { args, chatId, senderRaw, User }) {
        try {
            const item = args[0];
            const produtos = {
                '1': { nome: 'Impostor', preco: 500 },
                '2': { nome: 'Cientista', preco: 1000 },
                '3': { nome: 'Capitão', preco: 5000 },
                '4': { nome: 'Especialista', preco: 10000 },
                '5': { nome: 'Veterano', preco: 25000 },
                '6': { nome: 'Comandante', preco: 50000 },
                '7': { nome: 'Elite Galáctica', preco: 80000 },
                '8': { nome: 'Guardião Estelar', preco: 120000 },
                '9': { nome: 'Viajante Dimensional', preco: 180000 },
                '10': { nome: 'Lorde das Estrelas', preco: 250000 },
                '11': { nome: 'Almirante de Frota', preco: 320000 },
                '12': { nome: 'Governador Planetário', preco: 400000 },
                '13': { nome: 'Lenda Estelar', preco: 500000 }
            };

            const produto = produtos[item];
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

            const msgSucesso = `
🎊 *AQUISIÇÃO CONCLUÍDA* 🎊
━━━━━━━━━━━━━━━━━━━━━━━
🚀 *PATENTE:* ${produto.nome.toUpperCase()}
📉 *SALDO ATUAL:* ${finalUser.coins.toLocaleString('pt-BR')} YC
━━━━━━━━━━━━━━━━━━━━━━━`.trim();

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