// commands/indicar.js
module.exports = {
    name: 'indicar',
    async execute(client, msg, { chatId }) {
        // Trava para ser usado APENAS em grupos
        if (!chatId.endsWith('@g.us')) {
            return msg.reply("❌ Este comando deve ser usado dentro do grupo que você deseja indicar.");
        }

        const codigoCupom = "REF-" + Math.random().toString(36).substr(2, 5).toUpperCase();
        // O link já envia o código e o ID do grupo de origem para o PV
        const link = `https://wa.me/${client.info.wid.user}?text=/start_${codigoCupom}_${chatId.replace('@g.us', '')}`;

        try {
            const mongoose = require('mongoose');
            const Coupon = mongoose.model('Coupon');
            
            await Coupon.create({
                code: codigoCupom,
                discountPercent: 10,
                expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), 
                referrerGroupId: chatId 
            });

            return msg.reply(`📢 *PROGRAMA DE AFILIADOS YUKON*
━━━━━━━━━━━━━━━━━━━━━
Quer ganhar **10 DIAS GRÁTIS** de assinatura?

🚀 *Como funciona:*
1. Envie o link abaixo para um amigo (Dono de Grupo).
2. Ele vai resgatar o cupom no **PV do bot**.
3. Quando ele assinar, você ganha +10 dias e ele +5 dias!

🔗 *Seu link de indicação:*
${link}`);

        } catch (err) {
            return msg.reply("⚠️ Erro ao gerar sistema de indicação.");
        }
    }
};