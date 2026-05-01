module.exports = {
    name: 'pix',
    async execute(client, msg) {
        // Bloqueia uso em grupo para manter a privacidade financeira
        if (msg.from.endsWith('@g.us')) {
            return msg.reply("❌ *AÇÃO PRIVADA*\nSolicite os dados de pagamento apenas no meu chat privado.");
        }

        try {
            const mongoose = require('mongoose');
            const UserProfile = mongoose.model('UserProfile');
            const Coupon = mongoose.model('Coupon');

            // Busca o perfil do usuário e o cupom mais recente vinculado ao WhatsApp dele
            const perfil = await UserProfile.findOne({ userId: msg.from });
            const cupomAtivo = await Coupon.findOne({ usedByGroup: msg.from, isUsed: true }).sort({ _id: -1 }).lean();
            
            const desc = cupomAtivo ? cupomAtivo.discountPercent : 0;
            
            // Se o cliente não escolheu um plano no /assinar ainda, não temos valor para cobrar
            if (!perfil || !perfil.planoPreco) {
                return msg.reply("⚠️ *PLANO NÃO SELECIONADO*\nVocê ainda não escolheu um plano. Use **/assinar [1, 2 ou 3]** antes de gerar o PIX.");
            }

            // Define o nome do plano baseado no preço salvo no perfil
            let planoNome = "";
            if (perfil.planoPreco === 10) planoNome = "RECRUTA";
            else if (perfil.planoPreco === 30) planoNome = "ASTRONAUTA";
            else if (perfil.planoPreco === 75) planoNome = "INTERGALÁCTICO";

            // Cálculo dinâmico do valor com desconto
            const valorFinal = perfil.planoPreco * (1 - desc / 100);
            const valorFormatado = valorFinal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

            return msg.reply(`🛰️ *DADOS PARA PAGAMENTO*
━━━━━━━━━━━━━━━━━━━━━
✅ *PLANO SELECIONADO:* ${planoNome}
💰 *VALOR TOTAL:* ${valorFormatado} ${desc > 0 ? `(-${desc}% de desconto)` : ""}
📍 *GRUPOS VINCULADOS:* ${perfil.gruposVinculados.length}

🔑 *CHAVE PIX (E-MAIL):* 
\`devyuky7@gmail.com\`

👤 *NOME:* Matheus A. D. S. Silva
━━━━━━━━━━━━━━━━━━━━━

⚠️ *REGRAS DO COMPROVANTE:*
1. Envie apenas **FOTO** ou **PRINT**.
2. Arquivos em **PDF** não são aceitos.
3. A foto deve ser enviada com a legenda: **comprovante**

_Ao enviar corretamente, o Comandante Yukon será notificado para ativar sua licença imediatamente!_`);

        } catch (err) {
            console.error(err);
            return msg.reply("⚠️ Erro ao gerar dados de pagamento.");
        }
    }
};