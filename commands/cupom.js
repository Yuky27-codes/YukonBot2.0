module.exports = {
    name: 'cupom',
    async execute(client, msg, { args, isAdmin }) {
        if (!isAdmin) return; // Apenas o dono gera cupom

        const horas = parseInt(args[0]) || 24; // Padrão 24h
        const desc = parseInt(args[1]) || 10;  // Padrão 10%
        const codigo = "YUKON-" + Math.random().toString(36).substr(2, 5).toUpperCase();

        const dataExpira = new Date(Date.now() + horas * 60 * 60 * 1000);

        try {
            const mongoose = require('mongoose');
            const Coupon = mongoose.model('Coupon');

            await Coupon.create({
                code: codigo,
                discountPercent: desc,
                expiresAt: dataExpira
            });

            return msg.reply(`🎟️ *CUPOM YUKON GERADO*
━━━━━━━━━━━━━━━━━━━━━
🔑 Código: \`${codigo}\`
📉 Desconto: **${desc}%**
⏳ Válido por: **${horas}h**
🗓️ Expira em: ${dataExpira.toLocaleString('pt-BR')}`);

        } catch (err) {
            return msg.reply("❌ Erro ao gerar cupom no banco.");
        }
    }
};