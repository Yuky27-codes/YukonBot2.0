const Evento = require('../models/eventSchema');

module.exports = {
    name: 'infor',
    async execute(client, msg, { chatId, args }) {
        if (!chatId.endsWith('@g.us')) return msg.reply("❌ Comando exclusivo para grupos.");

        const tipo = args[0]?.toLowerCase();
        const textoArgs = args.slice(1).join(' ');

        if (tipo !== 'evento') {
            return msg.reply("⚠️ Uso correto: `/infor evento [Data] | [Hora] | [true/false para adv]`\nExemplo: `/infor evento 10/08/2026 | 20:00 | true`");
        }

        try {
            const evento = await Evento.findOne({ groupId: chatId, status: 'criado' });
            if (!evento) return msg.reply("❌ Nenhum evento ativo para configurar. Use `/criar evento [título]` primeiro.");

            const partes = textoArgs.split('|').map(p => p.trim());
            if (partes.length < 3) {
                return msg.reply("⚠️ Formato incorreto!\nUse: `/infor evento [Data] | [Hora] | [Aplicar Adv: true/false]`\nExemplo: `/infor evento 10/08/2026 | 20:00 | true`");
            }

            evento.data = partes[0];
            evento.hora = partes[1];
            evento.aplicarAdv = partes[2].toLowerCase() === 'true';
            await evento.save();

            return msg.reply(`✅ *INFORMAÇÕES DO EVENTO ATUALIZADAS!*\n\n📅 Data: ${evento.data}\n⏰ Hora: ${evento.hora}\n⚠️ Punição por falta (ADV): ${evento.aplicarAdv ? 'Ativada 🚨' : 'Desativada 🟢'}`);
        } catch (err) {
            console.error("❌ Erro no /infor evento:", err);
            return msg.reply("⚠️ Erro ao atualizar as informações do evento.");
        }
    }
};