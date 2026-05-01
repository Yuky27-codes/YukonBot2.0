module.exports = {
    name: 'assinar',
    async execute(client, msg, { args, chatId }) {
        // Redireciona para o PV se for usado em grupo para manter a privacidade dos preços/descontos
        if (chatId.endsWith('@g.us')) {
            return msg.reply("🛰️ *CENTRAL DE VENDAS*\nPara ver os planos e seus descontos exclusivos, me chame no *Privado*!");
        }

        try {
            const mongoose = require('mongoose');
            const Coupon = mongoose.model('Coupon');
            const UserProfile = mongoose.model('UserProfile');

            const escolha = parseInt(args[0]);
            
            // Busca o cupom mais recente vinculado ao WhatsApp do cliente
            const cupomAtivo = await Coupon.findOne({ usedByGroup: msg.from, isUsed: true }).sort({ _id: -1 }).lean();

            let desc = cupomAtivo ? cupomAtivo.discountPercent : 0;
            
            // Função para calcular desconto real
            const calc = (valor) => (valor * (1 - desc / 100)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

            // Se o usuário NÃO escolheu um plano ainda (ex: mandou apenas /assinar)
            if (!escolha || ![1, 2, 3].includes(escolha)) {
                // Definição dos valores base com a sua lógica original
                const v10 = desc > 0 ? `~R$ 10,00~ por *${calc(10)}*` : `*R$ 10,00*`;
                const v30 = desc > 0 ? `~R$ 30,00~ por *${calc(30)}*` : `*R$ 30,00*`;
                const v75 = desc > 0 ? `~R$ 75,00~ por *${calc(75)}*` : `*R$ 75,00*`;

                return msg.reply(`🛰️ *CATÁLOGO DE ASSINATURAS YUKON*
━━━━━━━━━━━━━━━━━━━━━
${desc > 0 ? `🔥 *CUPOM APLICADO:* Você está economizando ${desc}%!\n` : ""}
1️⃣ **PLANO RECRUTA**
💰 Valor: ${v10}
📍 Limite: **1 Grupo** vinculado
🔹 Acesso total aos comandos de games

2️⃣ **PLANO ASTRONAUTA**
💰 Valor: ${v30}
📍 Limite: **Até 2 Grupos** vinculados
🔹 Prioridade no processamento

3️⃣ **PLANO INTERGALÁCTICO**
💰 Valor: ${v75}
📍 Limite: **Até 3 Grupos** vinculados
🔹 Suporte VIP (Direto com o Dono)

━━━━━━━━━━━━━━━━━━━━━
📌 **COMO ESCOLHER:**
Digite **/assinar [número]**
_Exemplo: /assinar 2_

_A Yukon Station agradece a preferência!_`);
            }

            // --- LÓGICA DE SELEÇÃO DE PLANO ---
            let precoEscolhido = escolha === 1 ? 10 : escolha === 2 ? 30 : 75;
            let nomePlano = escolha === 1 ? "RECRUTA" : escolha === 2 ? "ASTRONAUTA" : "INTERGALÁCTICO";
            let limiteGrupos = escolha === 1 ? 1 : escolha === 2 ? 2 : 3;

            // Salva a intenção de compra no perfil do usuário
            await UserProfile.updateOne(
                { userId: msg.from },
                { 
                    $set: { 
                        planoPreco: precoEscolhido,
                        gruposVinculados: [] // Reseta para evitar burlas ao trocar de plano
                    } 
                },
                { upsert: true }
            );

            return msg.reply(`✅ *PLANO ${nomePlano} SELECIONADO!*
━━━━━━━━━━━━━━━━━━━━━
💰 Valor Final: **${calc(precoEscolhido)}**
📍 Limite: **${limiteGrupos} grupo(s)**

🚀 **PRÓXIMOS PASSOS:**
1️⃣ Use **/id_grupo** dentro dos grupos que deseja adicionar.
2️⃣ Use **/vincular [ID]** aqui no meu privado.
3️⃣ Após vincular, use **/pix** para pagar.`);

        } catch (err) {
            console.error(err);
            return msg.reply("⚠️ Erro ao carregar os planos de voo.");
        }
    }
};