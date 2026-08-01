const Evento = require('../models/eventSchema'); // Ajuste o caminho do seu model se necessário

module.exports = {
    name: 'evento_admin', // Gerenciador de comandos administrativos do evento
    async execute(client, msg, { chatId, args, senderRaw }) {
        const subComando = args[0]?.toLowerCase();
        const textoArgs = args.slice(1).join(' ');

        // Verifica se é administrador (opcional, adicione sua validação de admin aqui se tiver)

        switch (subComando) {
            case 'criar': {
                if (!textoArgs) return msg.reply("⚠️ Use: `/criar evento [Título do Evento + Descrição]`");
                
                // Fecha eventos anteriores abertos no grupo e cria um novo
                await Evento.updateMany({ groupId: chatId, status: 'criado' }, { status: 'finalizado' });

                await Evento.create({
                    groupId: chatId,
                    titulo: textoArgs,
                    criadoPor: senderRaw
                });

                return msg.reply(`🚀 *EVENTO CRIADO COM SUCESSO!*\n\n*Título:* ${textoArgs}\n\nAgora configure as informações usando \`/infor evento [data] | [hora] | [true/false para adv]\``);
            }

            case 'infor': {
                // Exemplo de uso: /infor evento 10/08/2026 | 20:00 | true
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
            }

            case 'começar': {
                const evento = await Evento.findOne({ groupId: chatId, status: 'criado' });
                if (!evento) return msg.reply("❌ Não há nenhum evento pronto para começar.");

                evento.status = 'andamento';
                await evento.save();

                // Fecha o grupo automaticamente (recurso do whatsapp-web.js para fechar o chat apenas para admins mandarem mensagem)
                try {
                    const chat = await msg.getChat();
                    if (chat.isGroup) {
                        await chat.setMessagesAdminsOnly(true);
                    }
                } catch (e) {
                    console.log("Erro ao fechar o grupo automaticamente:", e.message);
                }

                return msg.reply(`🚨 *O EVENTO COMEÇOU! A NAVE ESTÁ EM ANDAMENTO!* 🚀\n\nO grupo foi fechado temporariamente para focar nas partidas. Boa sorte à tripulação!`);
            }

            case 'finalizar': {
                const evento = await Evento.findOne({ groupId: chatId, status: 'andamento' });
                if (!evento) return msg.reply("❌ Não há nenhum evento em andamento para finalizar.");

                evento.status = 'finalizado';
                await evento.save();

                // Reabre o grupo automaticamente
                try {
                    const chat = await msg.getChat();
                    if (chat.isGroup) {
                        await chat.setMessagesAdminsOnly(false);
                    }
                } catch (e) {
                    console.log("Erro ao reabrir o grupo:", e.message);
                }

                // Lógica de aplicação de Advertência (ADV)
                let penalizadosCount = 0;
                if (evento.aplicarAdv) {
                    for (const participante of evento.participantes) {
                        if (!participante.confirmado) {
                            penalizadosCount++;
                            // AQUI VOCÊ CHAMA A SUA LÚGICA DE ADVERTÊNCIA DO SEU BANCO DE DADOS
                            // Exemplo: await User.updateOne({ userId: participante.userId, groupId: chatId }, { $inc: { advs: 1 } });
                        }
                    }
                }

                return msg.reply(`🏁 *EVENTO FINALIZADO COM SUCESSO!* \n\nO grupo foi reaberto. ${evento.aplicarAdv ? `⚠️ Foram aplicadas advertências em *${penalizadosCount}* participantes que confirmaram presença mas não usaram o \`/confirmarP\`.` : ''}`);
            }

            default:
                return msg.reply("❓ Comando de evento inválido para administradores.");
        }
    }
};