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

            // Busca o perfil e o cupom para calcular o valor real
            const perfil = await UserProfile.findOne({ userId: msg.from });
            const cupomAtivo = await Coupon.findOne({ usedByGroup: msg.from, isUsed: true }).sort({ _id: -1 }).lean();
            
            const desc = cupomAtivo ? cupomAtivo.discountPercent : 0;
            const qtdGrupos = perfil ? perfil.gruposVinculados.length : 0;

            // Lógica de definição de plano baseada na quantidade de grupos vinculados
            let planoNome = "NENHUM GRUPO VINCULADO";
            let valorBase = 0;

            if (qtdGrupos === 1) {
                planoNome = "PLANO RECRUTA";
                valorBase = 10;
            } else if (qtdGrupos === 2) {
                planoNome = "PLANO ASTRONAUTA";
                valorBase = 30;
            } else if (qtdGrupos === 3) {
                planoNome = "PLANO INTERGALÁCTICO";
                valorBase = 75;
            }

            const valorFinal = valorBase * (1 - desc / 100);
            const valorFormatado = valorFinal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

            // Mensagem personalizada baseada no estado do cliente
            let headerPagamento = "";
            if (qtdGrupos === 0) {
                headerPagamento = "⚠️ *ATENÇÃO:* Você ainda não vinculou nenhum grupo! Use **/vincular [ID]** antes de pagar.";
            } else {
                headerPagamento = `✅ *PLANO DETECTADO:* ${planoNome}\n📍 *GRUPOS:* ${qtdGrupos}\n💰 *VALOR A PAGAR:* ${valorFormatado}${desc > 0 ? ` (-${desc}%)` : ""}`;
            }

            return msg.reply(`${headerPagamento}

━━━━━━━━━━━━━━━━━━━━━
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