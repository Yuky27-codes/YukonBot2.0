module.exports = {
    name: 'cupomp',
    async execute(client, msg, { args, chatId }) {
        if (chatId.endsWith('@g.us')) {
            return msg.reply("❌ Por segurança, resgate seu cupom apenas no *Privado do Bot*.");
        }

        const codigoInput = args[0]?.toUpperCase();

        if (!codigoInput) {
            return msg.reply("⚠️ *COMO RESGATAR:*\nUse: `/cupomp [CÓDIGO]`\n\n_Exemplo: /cupomp YUKON-ABC12_");
        }

        try {
            const mongoose = require('mongoose');
            const Coupon = mongoose.model('Coupon');
            const UserProfile = mongoose.model('UserProfile');

            const cupom = await Coupon.findOne({ code: codigoInput });

            // Validações de existência, expiração por data e limite de usos
            if (!cupom) {
                return msg.reply("❌ Cupom não encontrado.");
            }
            if (cupom.expiresAt && new Date() > cupom.expiresAt) {
                return msg.reply("❌ Este cupom já expirou o prazo de resgate.");
            }
            if (cupom.usesCount >= (cupom.maxUses || 1)) {
                return msg.reply("❌ Este cupom já esgotou o limite máximo de pessoas que podiam resgatá-lo.");
            }

            // Verifica se o usuário já tem um cupom ativo
            const perfil = await UserProfile.findOne({ userId: msg.from });
            if (perfil && perfil.cupomExpiraEm && new Date() < perfil.cupomExpiraEm) {
                return msg.reply(`⚠️ Você já possui um cupom ativo vinculado à sua conta!\nAproveite o seu desconto atual antes de resgatar outro.`);
            }

            // Incrementa o uso do cupom globalmente
            await Coupon.updateOne({ code: codigoInput }, { $inc: { usesCount: 1 } });

            // Define o prazo de 24 horas corridas a partir de agora para o cliente usar o desconto
            const expiraCupomCliente = new Date(Date.now() + 24 * 60 * 60 * 1000);

            // Salva o desconto e o prazo de validade de 24h no perfil do usuário
            await UserProfile.updateOne(
                { userId: msg.from },
                { 
                    $set: { 
                        descontoAtivo: cupom.discountPercent,
                        cupomExpiraEm: expiraCupomCliente
                    } 
                },
                { upsert: true }
            );

            return msg.reply(`🎉 *CUPOM RESGATADO COM SUCESSO!*
━━━━━━━━━━━━━━━━━━━━━
📉 Desconto: **${cupom.discountPercent}%**
⏳ Validade: Você tem **24 horas corridas** para utilizar este desconto.
⏰ Expira em: *${expiraCupomCliente.toLocaleString('pt-BR')}*

🛒 Digite **/assinar** agora mesmo para ver os valores com desconto!`);

        } catch (err) {
            console.error("❌ Erro ao resgatar cupom:", err);
            return msg.reply("⚠️ Erro interno ao processar o resgate do cupom.");
        }
    }
};