const mongoose = require('mongoose');

module.exports = {
    name: 'mute',
    async execute(client, msg, { args, chatId, isAdmin, iAmAdmin, chat: chatFromIndex }) {
        try {
            // 1. Verificação de Permissão (Admin do Bot)
            if (!isAdmin) {
                return msg.reply('❌ Apenas o comando da tripulação pode silenciar o setor.');
            }

            const horarioArg = args[0];

            // --- 🟢 MODO AGENDADO: /mute HH:MM ---
            if (horarioArg) {
                const match = horarioArg.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
                if (!match) {
                    return msg.reply('❌ Horário inválido. Use o formato HH:MM (ex: /mute 14:00).');
                }

                const [, horaStr, minutoStr] = match;
                const alvo = new Date();
                alvo.setHours(parseInt(horaStr), parseInt(minutoStr), 0, 0);
                if (alvo.getTime() <= Date.now()) {
                    alvo.setDate(alvo.getDate() + 1); // já passou hoje — agenda pra amanhã
                }

                const GroupSchedule = mongoose.model('GroupSchedule');
                await GroupSchedule.findOneAndUpdate(
                    { groupId: chatId, action: 'mute' },
                    {
                        $set: {
                            targetTime: alvo,
                            createdBy: msg._data?.notifyName || 'admin',
                            createdAt: new Date()
                        }
                    },
                    { upsert: true }
                );

                return msg.reply(
                    `🔇 *AGENDAMENTO CONFIRMADO*\n\nO grupo será fechado automaticamente às *${horaStr}:${minutoStr}*.\n\n_Se um /mute ou /desmute manual (sem horário) for enviado antes disso, esse agendamento é cancelado._`
                );
            }

            // --- MODO IMEDIATO (comportamento original) ---

            // 🔧 Reaproveita o "chat" que o index.js já buscou. Se não vier (ou vier
            // nulo por falha lá), tenta buscar de novo aqui — às vezes o erro
            // "Evaluation failed: r" é intermitente e a segunda tentativa funciona.
            // IMPORTANTE: este comando executa uma AÇÃO real no grupo, então não dá
            // pra usar um cache de dados como fallback (precisa do objeto "vivo").
            let chat = chatFromIndex || null;

            if (!chat || typeof chat.setMessagesAdminsOnly !== 'function') {
                try {
                    chat = await msg.getChat();
                } catch (e) {
                    console.warn("⚠️ /mute: getChat() falhou na 2ª tentativa também:", e.message);
                    return msg.reply(
                        "⚠️ O WhatsApp está com instabilidade no momento (bug conhecido na lib do bot) " +
                        "e não consegui acessar os dados do grupo para silenciar. Tente novamente em alguns instantes."
                    );
                }
            }

            if (!chat.isGroup) {
                return msg.reply('❌ Este comando só funciona em grupos.');
            }

            // 2. Verifica se o bot é admin (Já vem pronto do Handler)
            if (!iAmAdmin) {
                return msg.reply('⚠️ Eu preciso de privilégios de Admin para fechar as comunicações do grupo.');
            }

            // --- 🟢 Cancela qualquer agendamento pendente (mute OU desmute) — comando manual tem prioridade ---
            const GroupSchedule = mongoose.model('GroupSchedule');
            const canceladas = await GroupSchedule.deleteMany({ groupId: chatId, action: { $in: ['mute', 'desmute'] } });

            // 3. Fecha o grupo (Apenas admins podem enviar mensagens)
            await chat.setMessagesAdminsOnly(true);

            // 4. Feedback Visual
            let textoFinal = "🔇 *COMUNICAÇÕES INTERROMPIDAS*\n\nO setor foi silenciado pela administração da Yukon. Apenas oficiais podem falar agora.";
            if (canceladas.deletedCount > 0) {
                textoFinal += "\n\n_⚠️ Agendamento(s) automático(s) pendente(s) foram cancelados._";
            }

            await client.sendMessage(chatId, textoFinal, {
                sendSeen: false
            });

        } catch (err) {
            console.error("❌ ERRO NO COMANDO MUTE:", err);
            await msg.reply("❌ Falha crítica ao tentar silenciar o grupo.");
        }
    }
};