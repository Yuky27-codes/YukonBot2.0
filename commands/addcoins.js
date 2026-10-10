module.exports = {
    name: 'addcoins',
    async execute(client, msg, { chatId, isAdmin, isSuperAdmin, senderRaw, User, args }) {
        if (!isAdmin) return await msg.reply("❌ *ACESSO NEGADO:* Apenas oficiais de alta patente (ADMs) podem emitir moedas.");

        try {
            const mongoose = require('mongoose');
            const GroupDailyStats = mongoose.model('GroupDailyStats');
            
            const mencoes = msg.mentionedIds;
            const autorId = String(senderRaw).trim();
            
            const { LIMITES, EmissaoCoins, hojeSP, valorInteiro, emitidoHojeNoGrupo } = require('./_economia');
            const valor = valorInteiro(args.find(arg => !arg.includes('@')));

            if (isNaN(valor)) {
                return await msg.reply("❓ *COMO USAR:*\n• Para você: `/addcoins 5000`\n• Para outro: `/addcoins @tripulante 5000`.");
            }

            // Tetos da economia (os admins globais da Yukon não têm teto)
            if (!isSuperAdmin) {
                if (valor > LIMITES.addcoinsPorUso) {
                    return await msg.reply(`🚫 *LIMITE DO BANCO CENTRAL:* no máximo *${LIMITES.addcoinsPorUso.toLocaleString('pt-BR')} YC* por emissão.`);
                }
                const jaEmitido = await emitidoHojeNoGrupo(chatId);
                if (jaEmitido + valor > LIMITES.addcoinsPorDiaGrupo) {
                    const resta = Math.max(0, LIMITES.addcoinsPorDiaGrupo - jaEmitido);
                    return await msg.reply(`🚫 *LIMITE DIÁRIO DO GRUPO:* o Banco Central já emitiu *${jaEmitido.toLocaleString('pt-BR')} YC* hoje aqui.
Ainda dá para emitir *${resta.toLocaleString('pt-BR')} YC* até a meia-noite.`);
                }
            }

            const alvoId = mencoes.length > 0 
                ? String(mencoes[0]._serialized || mencoes[0]).trim() 
                : autorId;

            const ehParaSiMesmo = (alvoId === autorId);

            await EmissaoCoins.create({ groupId: chatId, por: autorId, para: alvoId, valor, dia: hojeSP(), superAdmin: Boolean(isSuperAdmin) });

            const update = await User.findOneAndUpdate(
                { userId: alvoId, groupId: chatId },
                { $inc: { coins: valor } },
                { upsert: true, returnDocument: 'after' }
            );

            // Capturar coins gerados (injeção do Banco Central)
            const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
            await GroupDailyStats.findOneAndUpdate(
                { groupId: chatId, date: today },
                { $inc: { coinsGenerated: valor } },
                { upsert: true }
            );

            const nomeAlvo = ehParaSiMesmo ? "sua própria conta" : `@${alvoId.split('@')[0]}`;
            
            const textoSucesso = `
💰 *YUKON MINT — EMISSÃO DE CRÉDITOS*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
O Banco Central da Yukon Station injetou:
💵 *VALOR:* ${valor.toLocaleString('pt-BR')} YC
🎯 *DESTINO:* ${nomeAlvo}

✨ *NOVO SALDO:* ${update.coins.toLocaleString('pt-BR')} YC
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`.trim();

            await client.sendMessage(chatId, textoSucesso, {
                mentions: [alvoId]
            });

        } catch (e) {
            console.error("❌ Erro no addcoins:", e);
            await msg.reply("❌ Falha na comunicação com o cofre central.");
        }
    }
};