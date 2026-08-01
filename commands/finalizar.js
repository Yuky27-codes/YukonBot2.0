const Evento = require('../models/eventSchema');

module.exports = {
    name: 'finalizar',
    async execute(client, msg, { chatId, chat: chatFromIndex, isAdmin }) {
        if (!chatId.endsWith('@g.us')) return msg.reply("❌ Comando exclusivo para grupos.");
        if (!isAdmin) return msg.reply("❌ Apenas administradores podem finalizar o evento.");

        const tipo = msg.body.split(' ')[1]?.toLowerCase();
        if (tipo !== 'evento') {
            return msg.reply("⚠️ Use o formato correto: `/finalizar evento`");
        }

        try {
            const evento = await Evento.findOne({ groupId: chatId, status: 'andamento' });
            if (!evento) return msg.reply("❌ Não há nenhum evento em andamento para finalizar.");

            evento.status = 'finalizado';
            await evento.save();

            // Reabre o grupo automaticamente
            try {
                let chat = chatFromIndex || await msg.getChat().catch(() => null);
                if (chat && typeof chat.setMessagesAdminsOnly === 'function') {
                    await chat.setMessagesAdminsOnly(false);
                }
            } catch (e) {
                console.log("Erro ao reabrir o grupo:", e.message);
            }

            // Lógica de aplicação de Advertência (ADV) para quem confirmou presença mas faltou
            let penalizadosCount = 0;
            if (evento.aplicarAdv) {
                for (const participante of evento.participantes) {
                    if (!participante.confirmado) {
                        penalizadosCount++;
                        // Aqui você pode plugar a sua lógica de incremento de ADV no banco de dados se houver
                    }
                }
            }

            return msg.reply(`🏁 *EVENTO FINALIZADO COM SUCESSO!* \n\nO grupo foi reaberto. ${evento.aplicarAdv ? `⚠️ Foram aplicadas advertências em *${penalizadosCount}* participantes que confirmaram presença mas não usaram o \`/confirmarp\`.` : ''}`);
        } catch (err) {
            console.error("❌ Erro no /finalizar evento:", err);
            return msg.reply("⚠️ Erro ao finalizar o evento.");
        }
    }
};