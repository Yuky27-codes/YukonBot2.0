const Partnership = require('../models/partnershipSchema');
const crypto = require('crypto');

module.exports = {
    name: 'parceria',
    async execute(client, msg, { chatId, args }) {
        if (!chatId.endsWith('@g.us')) return msg.reply("❌ Este comando só pode ser usado em grupos.");

        const tipoVinculo = args[0]?.toLowerCase(); // 'code' ou nome manual

        // 1. SE O ARGUMENTO FOR 'CODE'
        if (tipoVinculo === 'code') {
            const codigoParceiro = args[1];

            // 🟢 SE NÃO PASSOU O CÓDIGO NA FRENTE: Gera ou exibe o código do próprio grupo
            if (!codigoParceiro) {
                try {
                    let parceriaExistente = await Partnership.findOne({ groupId: chatId, partnerGroupId: null, partnerCode: { $regex: /^YK-/ } });

                    if (!parceriaExistente) {
                        const randomStr = crypto.randomBytes(3).toString('hex').toUpperCase();
                        const code = `YK-${randomStr}`;

                        parceriaExistente = await Partnership.create({
                            groupId: chatId,
                            partnerCode: code,
                            partnerName: "Aguardando Vínculo"
                        });
                    }

                    return msg.reply(`🤝 *CÓDIGO DE PARCERIA DO GRUPO*\n\nO código fixo para este grupo é:\n\`${parceriaExistente.partnerCode}\`\n\nCompartilhe este código com o ADM de outro grupo para fecharem uma parceria oficial! 🚀`);
                } catch (err) {
                    console.error("❌ Erro ao gerar código de parceria:", err);
                    return msg.reply("⚠️ Erro interno ao gerar o código de parceria.");
                }
            }

            // 🔵 SE PASSOU O CÓDIGO NA FRENTE: Tenta fechar o vínculo com o outro grupo
            const parceiroAlvo = await Partnership.findOne({ partnerCode: codigoParceiro.toUpperCase() });
            if (!parceiroAlvo) return msg.reply("❌ Código de parceria inválido ou não encontrado na base da Yukon.");

            if (parceiroAlvo.groupId === chatId) return msg.reply("⚠️ Você não pode fechar parceria com o seu próprio grupo!");

            await Partnership.create({
                groupId: chatId,
                partnerCode: `VINCULO-${Date.now()}`,
                partnerGroupId: parceiroAlvo.groupId,
                partnerName: `Grupo Parceiro (${parceiroAlvo.groupId.slice(0, 5)}...)`
            });

            return msg.reply(`✅ *PARCERIA FECHADA COM SUCESSO!* 🤝\n\nEste grupo agora está oficialmente aliado ao grupo do código \`${codigoParceiro}\`. As estatísticas de salas conjuntas já estão ativas!`);
        } 
        
        // 2. MODO MANUAL (Caso o outro grupo não use a YukonBot)
        else {
            const nomeParceiro = args.join(' ');
            if (!nomeParceiro) {
                return msg.reply(`⚠️ *COMO USAR O SISTEMA DE PARCERIAS:*
1️⃣ Gerar seu código: \`/parceria code\`
2️⃣ Conectar via código da Yukon: \`/parceria code [CÓDIGO]\`
3️⃣ Conectar manualmente (outro grupo sem bot): \`/parceria [Nome do Grupo Parceiro]\``);
            }

            await Partnership.create({
                groupId: chatId,
                partnerCode: `MANUAL-${Date.now()}`,
                partnerName: nomeParceiro
            });

            return msg.reply(`✅ Parceria manual com *${nomeParceiro}* registrada com sucesso!`);
        }
    }
};