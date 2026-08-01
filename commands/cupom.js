module.exports = {
    name: 'cupom',
    async execute(client, msg, { args, isAdmin }) {
        if (!isAdmin) return; // Apenas o admin gera

        // Exemplo de uso: /cupom 10 48 5 (10% de desconto, 48 horas de validade para resgate, 5 usos máximos)
        const desc = parseInt(args[0]);
        const horasValidade = parseInt(args[1]) || 24; 
        const limiteUsos = parseInt(args[2]) || 1;     

        if (isNaN(desc)) {
            return msg.reply(`⚠️ *USO INCORRETO*\nUse: \`/cupom [desconto%] [horas_validade] [limite_usos]\`\n\n_Exemplo: /cupom 10 48 5_`);
        }

        const codigo = "YUKON-" + Math.random().toString(36).substr(2, 5).toUpperCase();
        const dataExpira = new Date(Date.now() + horasValidade * 60 * 60 * 1000);

        try {
            const mongoose = require('mongoose');
            const Coupon = mongoose.model('Coupon');

            await Coupon.create({
                code: codigo,
                discountPercent: desc,
                expiresAt: dataExpira,
                maxUses: limiteUsos,
                usesCount: 0  
            });

            return msg.reply(`🎟️ *CUPOM YUKON GERADO COM SUCESSO*
━━━━━━━━━━━━━━━━━━━━━
🔑 Código: \`${codigo}\`
📉 Desconto: **${desc}%**
👥 Limite de Resgates: **${limiteUsos} pessoas**
⏳ Prazo para resgatar até: *${dataExpira.toLocaleString('pt-BR')}*`);

        } catch (err) {
            console.error("Erro ao criar cupom:", err);
            return msg.reply("❌ Erro ao gerar cupom no banco de dados.");
        }
    }
};