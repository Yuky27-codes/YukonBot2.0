module.exports = {
    name: 'assinar',
    async execute(client, msg, { chatId }) {
        // Redireciona para o PV se for usado em grupo para manter a privacidade dos preços/descontos
        if (chatId.endsWith('@g.us')) {
            return msg.reply("🛰️ *CENTRAL DE VENDAS*\nPara ver os planos e seus descontos exclusivos, me chame no *Privado*!");
        }

        try {
            const mongoose = require('mongoose');
            const Coupon = mongoose.model('Coupon');
            
            // Busca o cupom mais recente vinculado ao WhatsApp do cliente
            const cupomAtivo = await Coupon.findOne({ usedByGroup: msg.from, isUsed: true }).sort({ _id: -1 }).lean();

            let desc = cupomAtivo ? cupomAtivo.discountPercent : 0;
            
            // Função para calcular desconto real
            const calc = (valor) => (valor * (1 - desc / 100)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

            // Definição dos valores base com a nova lógica de grupos
            const v10 = desc > 0 ? `~R$ 10,00~ por *${calc(10)}*` : `*R$ 10,00*`;
            const v30 = desc > 0 ? `~R$ 30,00~ por *${calc(30)}*` : `*R$ 30,00*`;
            const v75 = desc > 0 ? `~R$ 75,00~ por *${calc(75)}*` : `*R$ 75,00*`;

            return msg.reply(`🛰️ *CATÁLOGO DE ASSINATURAS YUKON*
━━━━━━━━━━━━━━━━━━━━━
${desc > 0 ? `🔥 *CUPOM APLICADO:* Você está economizando ${desc}%!\n` : ""}
📦 **PLANO RECRUTA**
💰 Valor: ${v10}
📍 Limite: **1 Grupo** vinculado
🔹 Acesso total aos comandos de games

🚀 **PLANO ASTRONAUTA**
💰 Valor: ${v30}
📍 Limite: **Até 2 Grupos** vinculados
🔹 Prioridade no processamento
🔹 Ideal para quem tem grupo reserva

👨‍🚀 **PLANO INTERGALÁCTICO**
💰 Valor: ${v75}
📍 Limite: **Até 3 Grupos** vinculados
🔹 Suporte VIP (Direto com o Dono)
🔹 O melhor custo-benefício para redes

━━━━━━━━━━━━━━━━━━━━━
📌 **COMO ATIVAR:**
1️⃣ Use **/id_grupo** dentro do grupo que deseja adicionar.
2️⃣ Use **/vincular [ID]** aqui no meu privado.
3️⃣ Após vincular, use **/pix** para pagar e liberar o acesso.

_A Yukon Station agradece a preferência!_`);

        } catch (err) {
            console.error(err);
            return msg.reply("⚠️ Erro ao carregar os planos de voo.");
        }
    }
};