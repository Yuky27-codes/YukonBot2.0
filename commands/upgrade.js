// Planos, preços e limites vêm do catálogo central publicado pelo painel (commands/_catalogo.js).
const { listarPlanos, planoPorNumero, planoDoPerfil, formatarPreco, MENSAGEM_CATALOGO_INDISPONIVEL } = require('./_catalogo');

module.exports = {
    name: 'upgrade',
    async execute(client, msg, { args }) {
        if (msg.from.endsWith('@g.us')) return msg.reply("❌ Use este comando no meu PV.");

        try {
            const planos = await listarPlanos();
            if (!planos) return msg.reply(MENSAGEM_CATALOGO_INDISPONIVEL);

            const novoPlano = await planoPorNumero(parseInt(args[0]));
            if (!novoPlano) {
                const opcoes = planos.map((p, i) => `\`/upgrade ${i + 1}\` — ${p.label} (${formatarPreco(p.priceBRL)})`).join('\n');
                return msg.reply(`⚠️ Escolha o nível do upgrade:\n${opcoes}`);
            }

            const mongoose = require('mongoose');
            const UserProfile = mongoose.model('UserProfile');

            const nomePlano = novoPlano.label.toUpperCase();
            const perfil = await UserProfile.findOne({ userId: msg.from });
            const planoAtual = await planoDoPerfil(perfil);
            const nomeAtual = planoAtual ? planoAtual.label : "Nenhum";
            const gruposAtuais = perfil?.gruposVinculados?.length || 0;

            // Impede downgrade (comparação pelo nível do plano)
            if (planoAtual && novoPlano.rank < planoAtual.rank) {
                return msg.reply(`⚠️ *DOWNGRADE NÃO PERMITIDO*\nVocê já está no plano *${nomeAtual}*.\nNão é possível escolher um plano inferior.\n\nSe precisar de ajuda, use */admin*.`);
            }

            if (planoAtual && novoPlano.id === planoAtual.id) {
                return msg.reply(`ℹ️ Você já está no plano *${nomePlano}*.`);
            }

            // Verifica se os grupos atuais cabem no novo plano
            if (gruposAtuais > novoPlano.groupLimit) {
                return msg.reply(`⚠️ Você tem *${gruposAtuais} grupo(s)* vinculados mas o plano *${nomePlano}* permite apenas *${novoPlano.groupLimit}*.\n\nRemova alguns grupos antes de fazer o downgrade.`);
            }

            // Só registra o plano ESCOLHIDO (pendente). O plano pago só muda na confirmação do pagamento.
            await UserProfile.updateOne(
                { userId: msg.from },
                { $set: { planoPreco: novoPlano.priceBRL, planoEscolhido: novoPlano.id } },
                { upsert: true }
            );

            return msg.reply(`⬆️ *UPGRADE SELECIONADO!*
━━━━━━━━━━━━━━━━━━━━━
📦 *Plano anterior:* ${nomeAtual}
📦 *Novo plano:* ${nomePlano}
📍 *Novo limite:* ${novoPlano.groupLimit} grupo(s)

🚀 *PRÓXIMOS PASSOS:*
1️⃣ Use */vincular [ID]* para adicionar novos grupos
2️⃣ Use */pix* para pagar a diferença e envie o comprovante`);

        } catch (err) {
            console.error("❌ Erro no /upgrade:", err);
            return msg.reply("⚠️ Erro ao processar upgrade.");
        }
    }
};
