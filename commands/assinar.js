module.exports = {
    name: 'assinar',
    async execute(client, msg, { args, chatId }) {
        if (chatId.endsWith('@g.us')) {
            return client.sendMessage(chatId, "🛰️ *CENTRAL DE VENDAS*\nPara ver os planos e assinar, me chame no *Privado*!");
        }

        try {
            const mongoose = require('mongoose');
            const Coupon = mongoose.model('Coupon');
            const UserProfile = mongoose.model('UserProfile');

            const escolha = parseInt(args[0]);

            const perfil = await UserProfile.findOne({ userId: msg.from });
            let desc = 0;

            if (perfil?.gruposVinculados?.length > 0) {
                for (const gId of perfil.gruposVinculados) {
                    const cupom = await Coupon.findOne({ usedByGroup: gId, isUsed: true }).sort({ _id: -1 }).lean();
                    if (cupom) { desc = cupom.discountPercent; break; }
                }
            }

            const calc = (valor) => (valor * (1 - desc / 100)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

            if (!escolha || ![1, 2, 3].includes(escolha)) {
                const v10 = desc > 0 ? `~R$ 10,00~ por *${calc(10)}*` : `*R$ 10,00*`;
                const v30 = desc > 0 ? `~R$ 30,00~ por *${calc(30)}*` : `*R$ 30,00*`;
                const v75 = desc > 0 ? `~R$ 75,00~ por *${calc(75)}*` : `*R$ 75,00*`;

                return client.sendMessage(msg.from, `🛰️ *CATÁLOGO DE ASSINATURAS YUKON*
━━━━━━━━━━━━━━━━━━━━━
${desc > 0 ? `🔥 *CUPOM APLICADO:* Você está economizando ${desc}%!\n` : ""}
1️⃣ *PLANO RECRUTA*
💰 Valor: ${v10}
📍 Limite: *1 Grupo* vinculado
📅 Duração: *10 dias*

2️⃣ *PLANO ASTRONAUTA*
💰 Valor: ${v30}
📍 Limite: *Até 2 Grupos* vinculados
📅 Duração: *30 dias*

3️⃣ *PLANO INTERGALÁCTICO*
💰 Valor: ${v75}
📍 Limite: *Até 3 Grupos* vinculados
📅 Duração: *90 dias*

━━━━━━━━━━━━━━━━━━━━━
📌 *COMO ASSINAR:*
1️⃣ Digite */assinar [número]* para escolher o plano
2️⃣ Use */id_grupo* no grupo para pegar o ID
3️⃣ Use */vincular [ID]* aqui no PV
4️⃣ Use */pix* para pagar`);
            }

            const precoEscolhido = escolha === 1 ? 10 : escolha === 2 ? 30 : 75;
            const nomePlano = escolha === 1 ? "RECRUTA" : escolha === 2 ? "ASTRONAUTA" : "INTERGALÁCTICO";
            const limiteGrupos = escolha === 1 ? 1 : escolha === 2 ? 2 : 3;
            // ✅ Dias corretos por plano
            const diasPlano = escolha === 1 ? 10 : escolha === 2 ? 30 : 90;

            const gruposAtuais = perfil?.gruposVinculados || [];

            if (gruposAtuais.length > limiteGrupos) {
                return client.sendMessage(msg.from, `⚠️ *ATENÇÃO:* Você já tem *${gruposAtuais.length} grupo(s)* vinculados.\nO plano *${nomePlano}* permite apenas *${limiteGrupos} grupo(s)*.\n\nEscolha um plano maior ou remova grupos antes de mudar.`);
            }

            await UserProfile.updateOne(
                { userId: msg.from },
                { $set: { planoPreco: precoEscolhido } },
                { upsert: true }
            );

            return client.sendMessage(msg.from, `✅ *PLANO ${nomePlano} SELECIONADO!*
━━━━━━━━━━━━━━━━━━━━━
💰 *Valor:* ${calc(precoEscolhido)}
📍 *Limite:* ${limiteGrupos} grupo(s)
📅 *Duração:* ${diasPlano} dias

🚀 *PRÓXIMOS PASSOS:*
1️⃣ Use */id_grupo* no grupo que deseja adicionar
2️⃣ Use */vincular [ID]* aqui no PV
3️⃣ Use */pix* para pagar e envie o comprovante`);

        } catch (err) {
            console.error("❌ Erro no /assinar:", err);
            return client.sendMessage(msg.from, "⚠️ Erro ao carregar os planos.");
        }
    }
};