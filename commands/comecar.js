const Evento = require('../models/eventSchema');

module.exports = {
    name: 'começar',
    async execute(client, msg, { chatId, chat: chatFromIndex, isAdmin }) {
        if (!chatId.endsWith('@g.us')) return msg.reply("❌ Comando exclusivo para grupos.");
        if (!isAdmin) return msg.reply("❌ Apenas administradores podem iniciar o evento.");

        const tipo = msg.body.split(' ')[1]?.toLowerCase();
        if (tipo !== 'evento') {
            return msg.reply("⚠️ Use o formato correto: `/começar evento`");
        }

        try {
            const evento = await Evento.findOne({ groupId: chatId, status: 'criado' });
            if (!evento) return msg.reply("❌ Não há nenhum evento pronto para começar.");

            evento.status = 'andamento';
            await evento.save();

            // Fecha o grupo automaticamente
            try {
                let chat = chatFromIndex || await msg.getChat().catch(() => null);
                if (chat && typeof chat.setMessagesAdminsOnly === 'function') {
                    await chat.setMessagesAdminsOnly(true);
                }
            } catch (e) {
                console.log("Erro ao fechar o grupo automaticamente:", e.message);
            }

            return msg.reply(`🚨 *O EVENTO COMEÇOU! A NAVE ESTÁ EM ANDAMENTO!* 🚀\n\nO grupo foi fechado temporariamente para focar nas partidas. Boa sorte à tripulação!`);
        } catch (err) {
            console.error("❌ Erro no /começar evento:", err);
            return msg.reply("⚠️ Erro ao iniciar o evento.");
        }
    }
};