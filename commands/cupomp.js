module.exports = {
    name: 'cupomp',
    async execute(client, msg, { args, chatId }) {
        const codigoInput = args[0]?.toUpperCase();
        if (!codigoInput) return msg.reply("⚠️ Digite o código. Ex: `/cupomp YUKON-XXXX`.");

        try {
            const mongoose = require('mongoose');
            const Coupon = mongoose.model('Coupon');

            const cupom = await Coupon.findOne({ code: codigoInput, isUsed: false });

            if (!cupom || new Date() > cupom.expiresAt) {
                return msg.reply("❌ Cupom inválido, já utilizado ou expirado.");
            }

            await Coupon.updateOne({ code: codigoInput }, { 
                isUsed: true, 
                usedByGroup: chatId 
            });

            return msg.reply(`🎉 *CUPOM APLICADO COM SUCESSO!*
━━━━━━━━━━━━━━━━━━━━━
📉 Você ganhou **${cupom.discountPercent}% de desconto**.
🛒 Use o comando **/assinar** agora para ver os novos preços!`);

        } catch (err) {
            return msg.reply("⚠️ Erro ao validar cupom.");
        }
    }
};