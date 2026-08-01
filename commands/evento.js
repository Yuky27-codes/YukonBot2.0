const Evento = require('../models/eventSchema');

module.exports = {
    name: 'evento',
    async execute(client, msg, { chatId }) {
        if (!chatId.endsWith('@g.us')) return msg.reply("❌ Comando exclusivo para grupos.");

        try {
            const evento = await Evento.findOne({ groupId: chatId, status: { $in: ['criado', 'andamento'] } });
            if (!evento) return msg.reply("❌ Nenhum evento ativo no momento.");

            return msg.reply(`📋 *PAINEL DO EVENTO* 🚀\n\n📌 *Título:* ${evento.titulo}\n📝 *Descrição:* ${evento.descricao || 'N/A'}\n📅 *Data:* ${evento.data || 'A definir'}\n⏰ *Hora:* ${evento.hora || 'A definir'}\n⚠️ *Punição por falta (ADV):* ${evento.aplicarAdv ? 'Sim 🚨' : 'Não 🟢'}\n👥 *Inscritos:* ${evento.participantes.length}\n\n*Comandos úteis:* \`/participar\`, \`/confirmarp\`, \`/sair\`, \`/listaevento\``);
        } catch (err) {
            console.error("❌ Erro no /evento:", err);
            return msg.reply("⚠️ Erro ao buscar painel do evento.");
        }
    }
};