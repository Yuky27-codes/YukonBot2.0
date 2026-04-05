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
                return await client.sendMessage(chatId, "❗ *SETOR DE VENDAS:* Item inválido! Use um número de 1 a 13.\nExemplo: */comprar 1*", { sendSeen: false });
            }

            // Busca o comprador no banco
            const userComprador = await User.findOne({ userId: senderRaw, groupId: chatId });
            
            if (!userComprador) {
                return await client.sendMessage(chatId, "❌ Perfil não encontrado no banco de dados.", { sendSeen: false });
            }

            // 1. Verifica se tem dinheiro suficiente
            if (userComprador.coins < produto.preco) {
                const falta = produto.preco - userComprador.coins;
                return await client.sendMessage(chatId, `❌ *SALDO INSUFICIENTE*\n\nVocê precisa de mais *${falta.toLocaleString('pt-BR')}* YukonCoins para este cargo.`, { sendSeen: false });
            }

            // 2. Verifica se já tem o cargo (evita compra duplicada)
            if (userComprador.roles && userComprador.roles.includes(produto.nome)) {
                return await client.sendMessage(chatId, "🏅 Você já possui este cargo em sua ficha de tripulante!", { sendSeen: false });
            }

            // 3. Executa a transação (Debita moedas e adiciona o cargo)
            const finalUser = await User.findOneAndUpdate(
                { userId: senderRaw, groupId: chatId },
                { 
                    $inc: { coins: -produto.preco },
                    $push: { roles: produto.nome } 
                },
                { new: true }
            );

            // 4. Mensagem de sucesso
            const msgSucesso = `🎊 *AQUISIÇÃO DE PATENTE* 🎊
━━━━━━━━━━━━━━━━━━
🚀 *Nova Patente:* ${produto.nome}
💰 *Investimento:* ${produto.preco.toLocaleString('pt-BR')} YC
📉 *Saldo Atual:* ${finalUser.coins.toLocaleString('pt-BR')} YC
━━━━━━━━━━━━━━━━━━
Sua nova patente já foi registrada no seu /perfil!`;

            await client.sendMessage(chatId, msgSucesso, { sendSeen: false });

        } catch (e) {
            console.error("❌ Erro na compra:", e.message);
            await client.sendMessage(chatId, "⚠️ Ocorreu um erro técnico ao processar sua compra. Tente novamente.", { sendSeen: false });
        }
    }
};