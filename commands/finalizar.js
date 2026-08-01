const Evento = require('../models/eventSchema');

module.exports = {
    name: 'finalizar',
    async execute(client, msg, { chatId, chat: chatFromIndex, isAdmin, senderRaw, User, iAmAdmin }) {
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

            // Lógica de aplicação automática de Advertência (ADV)
            let penalizadosCount = 0;
            const alvosPunidosIds = [];

            if (evento.aplicarAdv && User) {
                const motivoAuto = `Não compareceu no evento (${evento.data || 'Data não informada'})`;
                const autorId = String(senderRaw).trim();

                for (const participante of evento.participantes) {
                    // Se o participante NÃO confirmou presença, aplica a punição
                    if (!participante.confirmado) {
                        const targetStr = String(participante.userId).trim();
                        penalizadosCount++;
                        alvosPunidosIds.push(targetStr);

                        // Atualiza o banco de dados do usuário igualzinho ao comando /adv
                        const userDb = await User.findOneAndUpdate(
                            { userId: targetStr, groupId: chatId },
                            {
                                $inc: { advs: 1 },
                                $push: {
                                    advHistory: {
                                        motivo: motivoAuto,
                                        appliedBy: autorId,
                                        date: new Date()
                                    }
                                }
                            },
                            { upsert: true, new: true }
                        );

                        // Se atingir 3 advertências, aplica a expulsão automática se o bot for admin
                        if (userDb.advs >= 3) {
                            try {
                                await client.sendMessage(
                                    chatId,
                                    `🚫 @${targetStr.split('@')[0]} atingiu 3 advertências acumuladas por ausência em evento e foi ejetado da Yukon!\n📋 *Último motivo:* ${motivoAuto}`,
                                    { mentions: [targetStr] }
                                );

                                if (iAmAdmin) {
                                    const chatTarget = chatFromIndex || await msg.getChat().catch(() => null);
                                    if (chatTarget && typeof chatTarget.removeParticipants === 'function') {
                                        await chatTarget.removeParticipants([targetStr]);
                                    }
                                }

                                await User.updateOne(
                                    { userId: targetStr, groupId: chatId },
                                    { $set: { advs: 0 } }
                                );
                            } catch (e) {
                                console.log("Erro ao banir usuário por limite de ADV no evento:", e.message);
                            }
                        }
                    }
                }
            }

            return msg.reply(
                `🏁 *EVENTO FINALIZADO COM SUCESSO!* 🛑\n\n` +
                `O grupo foi reaberto. ` +
                `${evento.aplicarAdv ? `⚠️ Foram aplicadas advertências automáticas em *${penalizadosCount}* tripulantes que não confirmaram presença (\`/confirmarp\`).` : '🟢 As advertências automáticas estavam desativadas para este evento.'}`
            );

        } catch (err) {
            console.error("❌ Erro no /finalizar evento:", err);
            return msg.reply("⚠️ Erro ao finalizar o evento.");
        }
    }
};