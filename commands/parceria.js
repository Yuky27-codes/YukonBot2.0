const Partnership = require('../models/partnershipSchema');

module.exports = {
    name: 'parceria',
    async execute(client, msg, { chatId, args, isGroup }) {
        if (!isGroup) return msg.reply("❌ Este comando só pode ser usado em grupos.");

        const tipoVinculo = args[0]?.toLowerCase(); // 'code' ou 'manual' (ou direto se preferir)

        if (tipoVinculo === 'code') {
            const codigoParceiro = args[1];
            if (!codigoParceiro) return msg.reply("⚠️ Uso correto: `/parceria code [CÓDIGO_DO_OUTRO_GRUPO]`");

            // Busca se existe um grupo com esse código gerado no bot
            const parceiroAlvo = await Partnership.findOne({ partnerCode: codigoParceiro.toUpperCase() });
            if (!parceiroAlvo) return msg.reply("❌ Código de parceria inválido ou não encontrado na base da Yukon.");

            if (parceiroAlvo.groupId === chatId) return msg.reply("⚠️ Você não pode fechar parceria com o seu próprio grupo!");

            // Cria o vínculo cruzado para o grupo atual
            await Partnership.create({
                groupId: chatId,
                partnerCode: `VINCULO-${Date.now()}`,
                partnerGroupId: parceiroAlvo.groupId,
                partnerName: `Grupo Parceiro (${parceiroAlvo.groupId.slice(0, 5)}...)`
            });

            return msg.reply(`✅ *PARCERIA FECHADA COM SUCESSO!* 🤝\n\nEste grupo agora está oficialmente aliado ao grupo do código \`${codigoParceiro}\`. As estatísticas de salas conjuntas já estão ativas!`);
        } 
        
        // Modo manual (Caso o outro grupo não use a YukonBot)
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