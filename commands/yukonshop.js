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

                // Monta a linha de bônus só com o que essa patente realmente dá
                const bonus = [];
                if (p.sorteBonus > 0) bonus.push(`🍀 +${p.sorteBonus}% sorte`);
                if (p.coinBonusPercent > 0) bonus.push(`💰 +${p.coinBonusPercent}% ganhos`);
                if (p.usosExtras.cassino > 0) bonus.push(`🎰 +${p.usosExtras.cassino} uso(s) cassino/dia`);
                if (p.usosExtras.roubar > 0) bonus.push(`🥷 +${p.usosExtras.roubar} uso(s) roubo/dia`);
                if (p.missaoCooldownReducaoMin > 0) bonus.push(`⏳ -${p.missaoCooldownReducaoMin}min cooldown missão`);
                if (p.protecaoRoubo > 0) bonus.push(`🛡️ -${p.protecaoRoubo}% chance de ser roubado`);
                if (p.jurosBonusPercent > 0) bonus.push(`🏦 +${p.jurosBonusPercent}% juros no banco`);

                if (bonus.length > 0) {
                    shopMsg += `   _${bonus.join(' • ')}_\n`;
                }
                shopMsg += `\n`;
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