module.exports = {
    name: 'assinar',
    async execute(client, msg, { chatId }) {
        try {
            const mongoose = require('mongoose');
            const Coupon = mongoose.model('Coupon');
            const cupomAtivo = await Coupon.findOne({ usedByGroup: chatId, isUsed: true }).lean();

            let desc = cupomAtivo ? cupomAtivo.discountPercent : 0;
            
            // Função para calcular desconto real
            const calc = (valor) => (valor * (1 - desc / 100)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

            // Definição dos valores base
            const v10 = desc > 0 ? `~R$ 10,00~ por *${calc(10)}*` : `*R$ 10,00*`;
            const v30 = desc > 0 ? `~R$ 30,00~ por *${calc(30)}*` : `*R$ 30,00*`;
            const v75 = desc > 0 ? `~R$ 75,00~ por *${calc(75)}*` : `*R$ 75,00*`;

            return msg.reply(`🛰️ *CATÁLOGO DE SUPRIMENTOS YUKON*
━━━━━━━━━━━━━━━━━━━━━
${desc > 0 ? `🔥 *CUPOM APLICADO:* Você está economizando ${desc}%!\n` : ""}
📦 *PLANO RECRUTA* (10 Dias)
💰 Valor: ${v10}
🔹 Acesso total aos comandos
🔹 Suporte básico via ticket

🚀 *PLANO EXPLORADOR* (30 Dias)
💰 Valor: ${v30}
🔹 **BÔNUS:** +1 Grupo adicional grátis
🔹 Prioridade no processamento
🔹 Selo de apoiador no perfil

👨‍🚀 *PLANO COMANDANTE* (60 Dias)
💰 Valor: ${v75}
🔹 **SUPER BÔNUS:** +3 Grupos adicionais grátis
🔹 Suporte VIP (Direto com o Dono)
🔹 Acesso antecipado a novas funções
🔹 Personalização de comandos (sob consulta)

━━━━━━━━━━━━━━━━━━━━━
📌 *INSTRUÇÕES:*
Escolha seu plano e use o comando **/pix** para visualizar a chave de pagamento e as regras de envio do comprovante.

_A Yukon Station agradece a preferência!_`);

        } catch (err) {
            console.error(err);
            return msg.reply("⚠️ Erro ao carregar os planos de voo.");
        }
    }
};