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
                '07':{nome: "Elite Galáctica", preco: 80000 },
                '8': { nome: 'Guardião Estelar', preco: 120000 },
                '9': { nome: 'Viajante Dimensional', preco: 180000 },
                '10': { nome: 'Lorde das Estrelas', preco: 250000 },
                '11': { nome: 'Almirante de Frota', preco: 320000 },
                '12': { nome: 'Governador Planetário', preco: 400000 },
                '13': { nome: 'Lenda Estelar', preco: 500000 }
            };

            const produto = produtos[item];
            if (!produto) {
                return await msg.reply("❗ *SETOR DE VENDAS:* Item inválido! Use um número de 1 a 13.\nExemplo: */comprar 1*");
            }

            const userComprador = await User.findOne({ userId: senderRaw, groupId: chatId });
            
            if (!userComprador) return await msg.reply("❌ Perfil não encontrado.");

            // 1. Verifica se tem saldo
            if (userComprador.coins < produto.preco) {
                const falta = produto.preco - userComprador.coins;
                return await msg.reply(`❌ *SALDO INSUFICIENTE*\n\nFaltam *${falta.toLocaleString('pt-BR')}* Moedas para este cargo.`);
            }

            // 2. Verifica se já possui (olhando agora dentro do INVENTÁRIO)
            const jaPossui = userComprador.inventory && userComprador.inventory.find(i => i.name === produto.nome);
            if (jaPossui) {
                return await msg.reply("🏅 Você já possui esta patente em seu inventário!");
            }

            // 3. Executa a transação
            // Salvamos no inventory como objeto para o comando /inventario ler
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
                { new: true }
            );

            // 4. Mensagem de sucesso (Estilo Yukon)
            const msgSucesso = `
🎊 *AQUISIÇÃO DE PATENTE* 🎊
━━━━━━━━━━━━━━━━━━━━━━━
🚀 *NOVA PATENTE:* ${produto.nome.toUpperCase()}
💰 *INVESTIMENTO:* ${produto.preco.toLocaleString('pt-BR')} YC
📉 *SALDO ATUAL:* ${finalUser.coins.toLocaleString('pt-BR')} YC

✨ Parabéns! O item foi enviado para o seu */inventario*.
━━━━━━━━━━━━━━━━━━━━━━━`.trim();

            await msg.reply(msgSucesso);

        } catch (e) {
    console.log("--- ERRO NO COMANDO COMPRAR ---");
    console.error(e); // Isso vai mostrar o erro real no seu terminal
    await msg.reply("⚠️ Erro técnico: " + e.message);
}
    }
};