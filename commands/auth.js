module.exports = {
    name: 'auth',
    async execute(client, msg, { args, isAdmin }) {
        if (!isAdmin) return;

        const chat = await msg.getChat();
        if (chat.isGroup) {
            return msg.reply("❌ *AÇÃO PRIVADA*\nGerencie as licenças apenas no meu chat privado.");
        }

        const acao = args[0];
        const idGrupo = args[1];
        const diasArgs = parseInt(args[2]) || 30;

        if (!acao || !idGrupo || !idGrupo.includes('@g.us')) {
            return msg.reply("⚠️ *FORMATO INVÁLIDO*\n\nUse: `/auth add ID@g.us [dias]`\nOu: `/auth teste ID@g.us`\nOu: `/auth rem ID@g.us`");
        }

        try {
            const mongoose = require('mongoose');
            const AuthorizedGroup = mongoose.model('AuthorizedGroup');
            const Coupon = mongoose.model('Coupon');
            const UserProfile = mongoose.model('UserProfile');

            if (acao === 'add') {
                let diasParaAdicionar = diasArgs;
                let mensagemBonus = "";

                // Lógica de indicação
                const cupomReferencia = await Coupon.findOne({
                    usedByGroup: idGrupo,
                    isUsed: true
                }).sort({ _id: -1 });

                if (cupomReferencia?.referrerGroupId) {
                    diasParaAdicionar += 5;
                    mensagemBonus += `\n🎁 *BÔNUS:* +5 dias (Indicação)`;

                    const dador = await AuthorizedGroup.findOne({ groupId: cupomReferencia.referrerGroupId });
                    if (dador) {
                        let novaExpDador = new Date(dador.expiresAt || Date.now());
                        if (novaExpDador < new Date()) novaExpDador = new Date();
                        novaExpDador.setDate(novaExpDador.getDate() + 10);

                        await AuthorizedGroup.updateOne(
                            { groupId: cupomReferencia.referrerGroupId },
                            { $set: { expiresAt: novaExpDador, isAuthorized: true } }
                        );

                        try {
                            await client.sendMessage(cupomReferencia.referrerGroupId, "🎁 *RECOMPENSA DE INDICAÇÃO!*\nO grupo que você indicou acaba de assinar. Você ganhou *+10 dias grátis* na Yukon!");
                        } catch {}
                    }

                    await Coupon.updateOne({ _id: cupomReferencia._id }, { $unset: { referrerGroupId: "" } });
                }

                // ✅ CORRIGIDO: soma os dias ao tempo RESTANTE em vez de sobrescrever
                const authAtual = await AuthorizedGroup.findOne({ groupId: idGrupo });
                let dataBase = new Date();

                if (authAtual?.expiresAt && new Date(authAtual.expiresAt) > new Date()) {
                    // Ainda tem dias restantes — soma a partir da data atual de expiração
                    dataBase = new Date(authAtual.expiresAt);
                    mensagemBonus += `\n♻️ *Renovação:* dias somados ao tempo restante`;
                }

                const dataVencimento = new Date(dataBase);
                dataVencimento.setDate(dataVencimento.getDate() + diasParaAdicionar);

                await AuthorizedGroup.updateOne(
                    { groupId: idGrupo },
                    {
                        $set: {
                            isAuthorized: true,
                            authorizedBy: msg.author || msg.from,
                            expiresAt: dataVencimento,
                            createdAt: new Date()
                        }
                    },
                    { upsert: true }
                );

                // Notifica todos os grupos do mesmo cliente com a nova validade
                const dono = await UserProfile.findOne({ gruposVinculados: idGrupo });
                if (dono && dono.gruposVinculados.length > 1) {
                    for (const gId of dono.gruposVinculados) {
                        if (gId === idGrupo) continue;
                        await AuthorizedGroup.updateOne(
                            { groupId: gId },
                            { $set: { isAuthorized: true, expiresAt: dataVencimento } },
                            { upsert: true }
                        );
                    }
                    mensagemBonus += `\n📍 *${dono.gruposVinculados.length} grupo(s)* sincronizados com a mesma validade`;
                }

                return msg.reply(`✅ *ESTAÇÃO AUTORIZADA*
━━━━━━━━━━━━━━━━━━━━━
🛰️ *Status:* Online
🗓️ *Prazo:* ${diasParaAdicionar} dias
📅 *Expira:* ${dataVencimento.toLocaleDateString('pt-BR')}${mensagemBonus}`);
            }

            if (acao === 'teste') {
                const tempoTeste = new Date(Date.now() + 10 * 1000);
                await AuthorizedGroup.updateOne({ groupId: idGrupo }, { $set: { isAuthorized: true, expiresAt: tempoTeste } }, { upsert: true });
                return msg.reply(`⏳ *MODO TESTE*\nGrupo liberado por *10 segundos*!`);
            }

            if (acao === 'rem') {
                await AuthorizedGroup.updateOne({ groupId: idGrupo }, { $set: { isAuthorized: false, expiresAt: new Date(0) } });
                return msg.reply(`🔴 *ESTAÇÃO BLOQUEADA*`);
            }

        } catch (err) {
            console.error("❌ Erro no comando AUTH:", err);
            return msg.reply("⚠️ Erro no banco de dados.");
        }
    }
};