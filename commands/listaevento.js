const Evento = require('../models/eventSchema');

module.exports = {
    name: 'lista evento',
    async execute(client, msg, { chatId }) {
        if (!chatId.endsWith('@g.us')) return msg.reply("❌ Comando exclusivo para grupos.");

        try {
            const evento = await Evento.findOne({ groupId: chatId, status: { $in: ['criado', 'andamento'] } });
            if (!evento) return msg.reply("❌ Nenhum evento ativo no momento.");

            if (evento.participantes.length === 0) {
                return msg.reply("📋 A lista de participantes está vazia no momento.");
            }

            let textoLista = `📋 *LISTA DE PARTICIPANTES* (${evento.participantes.length})\n📍 *Evento:* ${evento.titulo}\n\n`;
            
            evento.participantes.forEach((p, index) => {
                const estrela = p.confirmado ? '⭐ ' : '';
                textoLista += `${index + 1}. ${estrela}*${p.nome}* ${p.confirmado ? '(Confirmado)' : '(Pendente)'}\n`;
            });

            textoLista += `\n_Legenda: O símbolo ⭐ indica quem já usou o /confirmarp._`;
            return msg.reply(textoLista);

        } catch (err) {
            console.error("❌ Erro no /listaevento:", err);
            return msg.reply("⚠️ Erro ao carregar a lista de participantes.");
        }
    }
};