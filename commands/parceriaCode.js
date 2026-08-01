const Partnership = require('../models/partnershipSchema');
const crypto = require('crypto');

module.exports = {
    name: 'parceria_code',
    async execute(client, msg, { chatId, isGroup }) {
        if (!chatId.endsWith('@g.us')) return msg.reply("❌ Este comando só pode ser usado dentro de grupos.");

        try {
            // Verifica se o grupo já tem um código gerado
            let parceriaExistente = await Partnership.findOne({ groupId: chatId, partnerGroupId: null });

            if (!parceriaExistente) {
                // Gera um código único e legível (ex: YUKON-A7X9)
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
};