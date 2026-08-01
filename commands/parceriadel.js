const Partnership = require('../models/partnershipSchema');

module.exports = {
    name: 'parceriadel',
    async execute(client, msg, { chatId, args, isAdmin }) {
        // 1. Validação de Grupo
        if (!chatId.endsWith('@g.us')) {
            return msg.reply("❌ Este comando só pode ser usado em grupos.");
        }

        // 2. Validação de Permissão (Apenas administradores do bot/grupo)
        if (!isAdmin) {
            return msg.reply("❌ Apenas administradores podem desfechar parcerias da estação.");
        }

        const termoBusca = args.join(' ').trim();
        if (!termoBusca) {
            return msg.reply(
                "⚠️ *Uso correto do comando:*\n" +
                "`/parceriadel [Nome exato do parceiro ou código]`\n\n" +
                "_Dica: Use `/parcerias` para ver a lista exata e os nomes cadastrados._"
            );
        }

        try {
            // 3. Tenta encontrar a parceria pelo nome ou pelo código (case insensitive)
            const queryBusca = {
                groupId: chatId,
                $or: [
                    { partnerName: { $regex: new RegExp(`^${termoBusca}$`, 'i') } },
                    { partnerCode: { $regex: new RegExp(`^${termoBusca}$`, 'i') } }
                ]
            };

            const parceriaAlvo = await Partnership.findOne(queryBusca);

            if (!parceriaAlvo) {
                return msg.reply(`❌ Nenhuma parceria encontrada com o termo \`${termoBusca}\`. Verifique o nome exato usando \`/parcerias\`.`);
            }

            const nomeParceiro = parceriaAlvo.partnerName;
            const partnerGroupIdAlvo = parceriaAlvo.partnerGroupId;

            // 4. Remove a parceria principal deste grupo
            await Partnership.deleteOne({ _id: parceriaAlvo._id });

            // 5. Se houver um vínculo cruzado com outro grupo da YukonBot, remove o espelho de lá também
            if (partnerGroupIdAlvo) {
                await Partnership.deleteOne({
                    groupId: partnerGroupIdAlvo,
                    partnerGroupId: chatId
                });
            }

            return msg.reply(
                `🗑️ *PARCERIA ENCERRADA COM SUCESSO*\n\n` +
                `O vínculo com *${nomeParceiro}* foi desfeito e removido dos registros da Yukon Station.`
            );

        } catch (err) {
            console.error("❌ Erro no /parceriadel:", err);
            return msg.reply("⚠️ Erro crítico ao tentar remover a parceria.");
        }
    }
};