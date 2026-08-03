const Partnership = require('../models/partnershipSchema');

module.exports = {
    name: 'addsalap',
    async execute(client, msg, { chatId, args }) {
        if (!chatId.endsWith('@g.us')) return msg.reply("❌ Comando exclusivo para grupos.");

        const numeroIndex = parseInt(args[0]);
        const codigoSalaP = args[1];

        if (isNaN(numeroIndex) || !codigoSalaP) {
            return msg.reply("⚠️ *Uso incorreto!*\nUtilize: `/addsalap [número da parceria] [código da sala]`\nExemplo: `/addsalap 1 PARC123`\n\nConsulte o comando `/parcerias` para ver os números corretos.");
        }

        try {
            // Busca todas as parcerias do grupo ordenadas pela ordem de criação/banco
            const listaParcerias = await Partnership.find({ groupId: chatId });

            if (listaParcerias.length === 0) {
                return msg.reply("❌ Este grupo não possui nenhuma parceria cadastrada. Use `/parcerias` para verificar.");
            }

            const indiceReal = numeroIndex - 1;
            if (indiceReal < 0 || indiceReal >= listaParcerias.length) {
                return msg.reply(`❌ Número de parceria inválido! Escolha um número entre 1 e ${listaParcerias.length}.`);
            }

            const parceriaAlvo = listaParcerias[indiceReal];

            // TRAVA: Verifica se esta parceria já tem uma sala aberta
            if (parceriaAlvo.salaPAtiva) {
                return msg.reply(`⚠️ A parceria com *${parceriaAlvo.partnerName}* já possui uma sala ativa (\`${parceriaAlvo.salaPAtiva}\`). Você precisa encerrar a sala atual usando o comando \`/fsala\` antes de definir uma nova.`);
            }

            // Salva a sala ativa na parceria selecionada
            parceriaAlvo.salaPAtiva = codigoSalaP.toUpperCase();
            await parceriaAlvo.save();

            // Se essa parceria estiver vinculada a um grupo parceiro via YukonBot, atualiza lá também
            if (parceriaAlvo.partnerGroupId) {
                await Partnership.updateMany(
                    { groupId: parceriaAlvo.partnerGroupId, partnerGroupId: chatId },
                    { $set: { salaPAtiva: codigoSalaP.toUpperCase() } }
                );
            }

            return msg.reply(`✅ Sala de Parceria *${codigoSalaP.toUpperCase()}* definida com sucesso para a parceria com *${parceriaAlvo.partnerName}*! 🛰️`);
        } catch (err) {
            console.error("❌ Erro no /addsalap:", err);
            return msg.reply("⚠️ Erro ao definir a sala de parceria.");
        }
    }
};