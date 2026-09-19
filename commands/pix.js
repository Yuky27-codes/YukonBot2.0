module.exports = {
    name: 'pix',
    async execute(client, msg) {
        if (msg.from.endsWith('@g.us')) {
            return msg.reply("❌ *AÇÃO PRIVADA*\nSolicite os dados de pagamento apenas no meu chat privado.");
        }

        try {
            const mongoose = require('mongoose');
            const UserProfile = mongoose.model('UserProfile');
            const Coupon = mongoose.model('Coupon');

            const perfil = await UserProfile.findOne({ userId: msg.from });

            if (!perfil || !perfil.planoPreco) {
                return msg.reply("⚠️ *PLANO NÃO SELECIONADO*\nEscolha um plano primeiro com **/assinar [1, 2 ou 3]**.");
            }

            // ✅ CORRIGIDO: busca cupom pelos grupos vinculados do cliente
            let desc = 0;
            if (perfil.gruposVinculados?.length > 0) {
                for (const gId of perfil.gruposVinculados) {
                    const cupom = await Coupon.findOne({ usedByGroup: gId, isUsed: true }).sort({ _id: -1 }).lean();
                    if (cupom) { desc = cupom.discountPercent; break; }
                }
            }

            const nomePlano = perfil.planoPreco === 10 ? "RECRUTA" : perfil.planoPreco === 30 ? "ASTRONAUTA" : "INTERGALÁCTICO";
            const limiteGrupos = perfil.planoPreco === 10 ? 1 : perfil.planoPreco === 30 ? 2 : 3;
            const valorFinal = perfil.planoPreco * (1 - desc / 100);
            const valorFormatado = valorFinal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

            return msg.reply(`🛰️ *DADOS PARA PAGAMENTO*
━━━━━━━━━━━━━━━━━━━━━
📦 *PLANO:* ${nomePlano}
📍 *Grupos vinculados:* ${perfil.gruposVinculados.length}/${limiteGrupos}
💰 *VALOR:* ${valorFormatado}${desc > 0 ? ` (-${desc}% de desconto)` : ""}

🔑 *CHAVE PIX (E-MAIL):*
\`devyuky7@gmail.com\`

👤 *NOME:* Matheus A. D. S. Silva
━━━━━━━━━━━━━━━━━━━━━
⚠️ *COMO ENVIAR O COMPROVANTE:*
1. Envie apenas *FOTO* ou *PRINT*
2. Arquivos em *PDF* não são aceitos
3. A foto deve ter a legenda: *comprovante*

_Após o envio, o Comandante Yukon será notificado para ativar sua licença!_`);

        } catch (err) {
            console.error("❌ Erro no /pix:", err);
            return msg.reply("⚠️ Erro ao gerar dados de pagamento.");
        }
    }
};