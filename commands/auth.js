module.exports = {
    name: 'auth',
    async execute(client, msg, { args, isAdmin }) {
        if (!isAdmin) return; 

        const chat = await msg.getChat();
        if (chat.isGroup) {
            return msg.reply("❌ *AÇÃO PRIVADA*\nGerencie as licenças apenas no meu chat privado.");
        }

        const acao = args[0]; // add, rem ou teste
        const idGrupo = args[1];

        if (!acao || !idGrupo || !idGrupo.includes('@g.us')) {
            return msg.reply("⚠️ *FORMATO INVÁLIDO*\n\nUse: `/auth add ID@g.us [dias]`\nEx: `/auth add ID@g.us 30`\nOu: `/auth teste ID@g.us` (10 segundos)");
        }

        try {
            const mongoose = require('mongoose');
            const AuthorizedGroup = mongoose.model('AuthorizedGroup');
            const Coupon = mongoose.model('Coupon');

            if (acao === 'add') {
                let diasParaAdicionar = parseInt(args[2]) || 30;
                let mensagemBonus = "";

                // --- 🟢 LOGICA DE INDICAÇÃO ---
                // Verifica se este grupo usou um cupom de indicação
                const cupomReferencia = await Coupon.findOne({ usedByGroup: idGrupo, isUsed: true });

                if (cupomReferencia && cupomReferencia.referrerGroupId) {
                    // 1. Benefício do Indicado: +5 dias
                    diasParaAdicionar += 5;
                    mensagemBonus += `\n🎁 *BÔNUS:* +5 dias (Indicação)`;

                    // 2. Benefício do Indicador: +10 dias
                    const dador = await AuthorizedGroup.findOne({ groupId: cupomReferencia.referrerGroupId });
                    if (dador) {
                        let novaExpDador = new Date(dador.expiresAt || Date.now());
                        if (novaExpDador < new Date()) novaExpDador = new Date(); // Se vencido, começa de hoje
                        
                        novaExpDador.setDate(novaExpDador.getDate() + 10);

                        await AuthorizedGroup.updateOne(
                            { groupId: cupomReferencia.referrerGroupId },
                            { $set: { expiresAt: novaExpDador, isAuthorized: true } }
                        );

                        // Notifica o grupo que indicou
                        await client.sendMessage(cupomReferencia.referrerGroupId, "🎁 *RECOMPENSA DE INDICAÇÃO!*\nO grupo que você indicou acaba de assinar. Você ganhou **+10 dias grátis** na Yukon!");
                    }
                    
                    // Remove o referrerGroupId para não dar bônus repetido na próxima renovação
                    await Coupon.updateOne({ _id: cupomReferencia._id }, { $unset: { referrerGroupId: "" } });
                }

                const dataVencimento = new Date();
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

                return msg.reply(`✅ *ESTAÇÃO AUTORIZADA*
━━━━━━━━━━━━━━━━━━━━━
🛰️ Status: **Online**
🗓️ Prazo Total: **${diasParaAdicionar} dias**
📅 Expira: ${dataVencimento.toLocaleDateString('pt-BR')}${mensagemBonus}`);
            } 
            
            if (acao === 'teste') {
                const tempoTeste = new Date(Date.now() + 10 * 1000); // 10 segundos

                await AuthorizedGroup.updateOne(
                    { groupId: idGrupo },
                    { $set: { isAuthorized: true, expiresAt: tempoTeste } },
                    { upsert: true }
                );
                return msg.reply(`⏳ *MODO TESTE*\nGrupo liberado por **10 segundos**!`);
            }

            if (acao === 'rem') {
                await AuthorizedGroup.updateOne(
                    { groupId: idGrupo },
                    { $set: { isAuthorized: false, expiresAt: new Date(0) } }
                );
                return msg.reply(`🔴 *ESTAÇÃO BLOQUEADA*`);
            }

        } catch (err) {
            console.error("❌ Erro no comando AUTH:", err);
            return msg.reply("⚠️ Erro no banco de dados.");
        }
    }
};