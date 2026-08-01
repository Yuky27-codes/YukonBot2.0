const Evento = require('../models/eventSchema');

module.exports = {
    name: 'sair',
    async execute(client, msg, { chatId, senderRaw }) {
        if (!chatId.endsWith('@g.us')) return msg.reply("❌ Comando exclusivo para grupos.");

        try {
            const evento = await Evento.findOne({ groupId: chatId, status: { $in: ['criado', 'andamento'] } });
            if (!evento) return msg.reply("❌ Não há nenhum evento ativo.");

            const index = evento.participantes.findIndex(p => p.userId === senderRaw);
            if (index === -1) return msg.reply("⚠️ Você não está inscrito neste evento.");

            evento.participantes.splice(index, 1);
            await evento.save();

            return msg.reply("✅ Você saiu da lista de participantes do evento.");
        } catch (err) {
            console.error("❌ Erro no /sair:", err);
            return msg.reply("⚠️ Erro ao sair do evento.");
        }
    }
};