const Evento = require('../models/eventSchema');

module.exports = {
    name: 'confirmarp',
    async execute(client, msg, { chatId, senderRaw }) {
        if (!chatId.endsWith('@g.us')) return msg.reply("❌ Comando exclusivo para grupos.");

        try {
            const evento = await Evento.findOne({ groupId: chatId, status: { $in: ['criado', 'andamento'] } });
            if (!evento) return msg.reply("❌ Não há nenhum evento ativo para confirmar presença.");

            const participante = evento.participantes.find(p => p.userId === senderRaw);
            if (!participante) return msg.reply("⚠️ Você precisa se inscrever primeiro usando o comando `/participar`.");

            if (participante.confirmado) return msg.reply("⭐ Você já confirmou a sua presença anteriormente!");

            participante.confirmado = true;
            await evento.save();

            return msg.reply("⭐ *PRESENÇA CONFIRMADA COM SUCESSO!* Seu nome agora brilha com a estrela na lista do evento. Não falte!");
        } catch (err) {
            console.error("❌ Erro no /confirmarp:", err);
            return msg.reply("⚠️ Erro ao confirmar presença.");
        }
    }
};