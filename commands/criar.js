const Evento = require('../models/eventSchema');

module.exports = {
    name: 'criar',
    async execute(client, msg, { chatId, args, senderRaw }) {
        if (!chatId.endsWith('@g.us')) return msg.reply("❌ Comando exclusivo para grupos.");
        
        const tipo = args[0]?.toLowerCase();
        const textoArgs = args.slice(1).join(' ');

        if (tipo !== 'evento' || !textoArgs) {
            return msg.reply("⚠️ Use o formato correto:\n`/criar evento [Título e Descrição]`");
        }

        try {
            await Evento.updateMany({ groupId: chatId, status: 'criado' }, { status: 'finalizado' });

            await Evento.create({
                groupId: chatId,
                titulo: textoArgs,
                criadoPor: senderRaw
            });

            return msg.reply(`🚀 *EVENTO CRIADO COM SUCESSO!*\n\n*Título:* ${textoArgs}\n\nConfigure as informações usando:\n\`/infor evento [data] | [hora] | [true/false para adv]\``);
        } catch (err) {
            console.error("❌ Erro ao criar evento:", err);
            return msg.reply("⚠️ Erro ao criar o evento.");
        }
    }
};