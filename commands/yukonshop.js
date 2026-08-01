const { PATENTES } = require('./patentes');

module.exports = {
    name: 'yukonshop',
    aliases: ['loja', 'shop'],
    async execute(client, msg, { chatId }) {
        try {
            let shopMsg = `🛒 *YUKON STATION - SHOP* ❄️\n`;
            shopMsg += `_Suba na hierarquia da nave agora e desbloqueie vantagens reais!_\n`;
            shopMsg += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

            PATENTES.forEach(p => {
                const numero = String(p.nivel).padStart(2, '0');
                const precoFormatado = p.preco.toLocaleString('pt-BR');

                shopMsg += `${p.emblema} *${numero}. ${p.nome}* — 💰 ${precoFormatado}\n`;

                // Adiciona cada bônus em sua própria linha com o bullet point (•)
                if (p.sorteBonus > 0) shopMsg += `• 🍀 +${p.sorteBonus}% sorte\n`;
                if (p.coinBonusPercent > 0) shopMsg += `• 💰 +${p.coinBonusPercent}% ganhos\n`;
                if (p.usosExtras && p.usosExtras.cassino > 0) shopMsg += `• 🎰 +${p.usosExtras.cassino} uso(s) cassino/dia\n`;
                if (p.usosExtras && p.usosExtras.roubar > 0) shopMsg += `• 🥷 +${p.usosExtras.roubar} uso(s) roubo/dia\n`;
                if (p.missaoCooldownReducaoMin > 0) shopMsg += `• ⏳ -${p.missaoCooldownReducaoMin}min cooldown missão\n`;
                if (p.protecaoRoubo > 0) shopMsg += `• 🛡️ -${p.protecaoRoubo}% chance de ser roubado\n`;
                if (p.jurosBonusPercent > 0) shopMsg += `• 🏦 +${p.jurosBonusPercent}% juros no banco\n`;

                shopMsg += `\n`; // Linha em branco entre as patentes
            });

            shopMsg += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
            shopMsg += `> 🛠️ *COMO ADQUIRIR:* Use o comando */comprar [número]*\n`;
            shopMsg += `> _Exemplo: /comprar 3 para Capitão_\n`;
            shopMsg += `> ⚠️ _Só a patente mais alta que você possui conta pra valer os bônus._`;

            // Enviando com a imagem padrão de loja da Yukon
            await global.enviarMenuComFoto(msg, 'loja.jpg', shopMsg);

        } catch (err) {
            console.error("❌ Erro ao abrir a loja:", err);
            await msg.reply("⚠️ Ocorreu um erro ao acessar o catálogo da Yukon Shop.");
        }
    }
};