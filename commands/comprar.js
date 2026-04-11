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

            // 1. Garante que tratamos o inventário como array, mesmo se vier errado do banco
            const inventarioAtual = Array.isArray(userComprador.inventory) ? userComprador.inventory : [];
            const moedasAtuais = userComprador.coins || 0;

            if (moedasAtuais < produto.preco) {
                const falta = produto.preco - moedasAtuais;
                return await msg.reply(`❌ *SALDO INSUFICIENTE:* Faltam ${falta.toLocaleString('pt-BR')} moedas.`);
            }

            const jaPossui = inventarioAtual.some(i => i.name === produto.nome);
            if (jaPossui) {
                return await msg.reply("🏅 Você já possui esta patente!");
            }

            // 2. A SOLUÇÃO: Se o inventory não for array, o $set vai sobrescrever ele para array antes do $push
            const updateData = {
                $inc: { coins: -produto.preco },
                $push: { 
                    inventory: { 
                        name: produto.nome, 
                        type: 'cargo', 
                        date: new Date() 
                    } 
                }
            };

            // Se detectarmos que NÃO é um array no banco, forçamos a correção
            if (!Array.isArray(userComprador.inventory)) {
                // Removemos o $push e usamos apenas $set para "limpar" e adicionar o primeiro item
                delete updateData.$push;
                updateData.$set = { inventory: [{ name: produto.nome, type: 'cargo', date: new Date() }] };
            }

            const finalUser = await User.findOneAndUpdate(
                { userId: senderRaw, groupId: chatId },
                updateData,
                { returnDocument: 'after', upsert: true } // Corrigido o aviso de 'new' deprecado
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
            await msg.reply("⚠️ Erro técnico ao processar compra. O sistema de inventário foi reiniciado para sua conta.");
        }
    }
};