module.exports = {
    name: 'cupomp',
    async execute(client, msg, { args, chatId }) {
        // Garante que o uso seja no privado
        if (chatId.endsWith('@g.us')) {
            return msg.reply("❌ Por segurança, resgate seu cupom apenas no *Privado do Bot*.");
        }

        const codigoInput = args[0]?.toUpperCase();
        const idGrupoAlvo = args[1]; // ID do grupo que receberá o desconto

        if (!codigoInput || !idGrupoAlvo) {
            return msg.reply("⚠️ *COMO RESGATAR:*\nUse: `/cupomp [CÓDIGO] [ID_DO_GRUPO]`\n\n_Exemplo: /cupomp YUKON-PROMO 120363... @g.us_");
        }

        if (!idGrupoAlvo.includes('@g.us')) {
            return msg.reply("⚠️ O ID do grupo deve terminar com `@g.us`.");
        }

        try {
            const mongoose = require('mongoose');
            const Coupon = mongoose.model('Coupon');

            const cupom = await Coupon.findOne({ code: codigoInput, isUsed: false });

            // Verifica validade e expiração
            if (!cupom || (cupom.expiresAt && new Date() > cupom.expiresAt)) {
                return msg.reply("❌ Cupom inválido, já utilizado ou expirado.");
            }

            // --- LÓGICA UNIVERSAL ---

            // Se for um cupom de INDICAÇÃO (tem um grupo por trás)
            if (cupom.referrerGroupId) {
                // Impede auto-indicação
                if (cupom.referrerGroupId === idGrupoAlvo) {
                    return msg.reply("⚠️ *SISTEMA ANTI-FRAUDE*\nVocê não pode usar um cupom gerado pelo seu próprio grupo.");
                }
                
                await Coupon.updateOne({ code: codigoInput }, { 
                    isUsed: true, 
                    usedByGroup: idGrupoAlvo 
                });

                return msg.reply(`🎉 *CUPOM DE INDICAÇÃO ATIVADO!*
━━━━━━━━━━━━━━━━━━━━━
📍 Grupo: \`${idGrupoAlvo}\`
📉 Desconto: **${cupom.discountPercent}%**
🎁 Bônus: **+5 dias grátis** na sua 1ª assinatura.

🛒 Use **/assinar** para ver os preços.`);
            } 
            
            // Se for um cupom PROMOCIONAL (gerado por você sem grupo vinculado)
            else {
                await Coupon.updateOne({ code: codigoInput }, { 
                    isUsed: true, 
                    usedByGroup: idGrupoAlvo 
                });

                return msg.reply(`🎟️ *CUPOM PROMOCIONAL ATIVADO!*
━━━━━━━━━━━━━━━━━━━━━
📍 Grupo: \`${idGrupoAlvo}\`
📉 Desconto: **${cupom.discountPercent}%**

🛒 Use **/assinar** para ver os preços com desconto!`);
            }

        } catch (err) {
            console.error(err);
            return msg.reply("⚠️ Erro ao validar cupom.");
        }
    }
};