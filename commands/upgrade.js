module.exports = {
    name: 'upgrade',
    async execute(client, msg, { args }) {
        if (msg.from.endsWith('@g.us')) return msg.reply("❌ Use este comando no meu PV.");

        const novoPlano = parseInt(args[0]);
        if (!novoPlano || ![1, 2, 3].includes(novoPlano)) {
            return msg.reply("⚠️ Escolha o nível do upgrade:\n`/upgrade 1` — Recruta (R$10)\n`/upgrade 2` — Astronauta (R$30)\n`/upgrade 3` — Intergaláctico (R$75)");
        }

        try {
            const mongoose = require('mongoose');
            const UserProfile = mongoose.model('UserProfile');

            const preco = novoPlano === 1 ? 10 : novoPlano === 2 ? 30 : 75;
            const nomePlano = novoPlano === 1 ? "RECRUTA" : novoPlano === 2 ? "ASTRONAUTA" : "INTERGALÁCTICO";
            const limite = novoPlano === 1 ? 1 : novoPlano === 2 ? 2 : 3;

            const perfil = await UserProfile.findOne({ userId: msg.from });
            const precoAtual = perfil?.planoPreco || 0;
            const nomeAtual = precoAtual === 10 ? "Recruta" : precoAtual === 30 ? "Astronauta" : precoAtual === 75 ? "Intergaláctico" : "Nenhum";
            const gruposAtuais = perfil?.gruposVinculados?.length || 0;

            // ✅ CORRIGIDO: impede downgrade
            if (preco < precoAtual) {
                return msg.reply(`⚠️ *DOWNGRADE NÃO PERMITIDO*\nVocê já está no plano *${nomeAtual}*.\nNão é possível escolher um plano inferior.\n\nSe precisar de ajuda, use */admin*.`);
            }

            if (preco === precoAtual) {
                return msg.reply(`ℹ️ Você já está no plano *${nomePlano}*.`);
            }

            // Verifica se os grupos atuais cabem no novo plano
            if (gruposAtuais > limite) {
                return msg.reply(`⚠️ Você tem *${gruposAtuais} grupo(s)* vinculados mas o plano *${nomePlano}* permite apenas *${limite}*.\n\nRemova alguns grupos antes de fazer o downgrade.`);
            }

            await UserProfile.updateOne(
                { userId: msg.from },
                { $set: { planoPreco: preco } },
                { upsert: true }
            );

            return msg.reply(`⬆️ *UPGRADE SELECIONADO!*
━━━━━━━━━━━━━━━━━━━━━
📦 *Plano anterior:* ${nomeAtual}
📦 *Novo plano:* ${nomePlano}
📍 *Novo limite:* ${limite} grupo(s)

🚀 *PRÓXIMOS PASSOS:*
1️⃣ Use */vincular [ID]* para adicionar novos grupos
2️⃣ Use */pix* para pagar a diferença e envie o comprovante`);

        } catch (err) {
            console.error("❌ Erro no /upgrade:", err);
            return msg.reply("⚠️ Erro ao processar upgrade.");
        }
    }
};