const Evento = require('../models/eventSchema');

module.exports = {
    name: 'participar',
    async execute(client, msg, { chatId, senderRaw }) {
        if (!chatId.endsWith('@g.us')) return msg.reply("❌ Comando exclusivo para grupos.");

        try {
            const evento = await Evento.findOne({ groupId: chatId, status: { $in: ['criado', 'andamento'] } });
            if (!evento) return msg.reply("❌ Não há nenhum evento aberto no momento.");
                
            const jaParticipa = evento.participantes.some(p => p.userId === senderRaw);
            if (jaParticipa) return msg.reply("⚠️ Você já está na lista de participantes deste evento!");

            const contato = await msg.getContact();
            const nomeUser = contato.pushname || contato.number || "Tripulante";

            evento.participantes.push({
                userId: senderRaw,
                nome: nomeUser,
                confirmado: false
            });
            await evento.save();

            return msg.reply(`✅ *Inscrição realizada com sucesso!* Você entrou na lista da nave. Aguarde o início do evento — sua presença será confirmada pelos administradores.`);
        } catch (err) {
            console.error("❌ Erro no /participar:", err);
            return msg.reply("⚠️ Erro ao processar inscrição.");
        }
    }
};