const Evento = require('../models/eventSchema');

module.exports = {
    name: 'eventoUser',
    async execute(client, msg, { chatId, args, command, senderRaw }) {
        const evento = await Evento.findOne({ groupId: chatId, status: { $in: ['criado', 'andamento'] } });

        switch (command) {
            case 'participar': {
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

                return msg.reply(`✅ *Inscrição realizada com sucesso!* Você entrou na lista da nave. Lembre-se de confirmar sua presença com \`/confirmarP\` quando estiver pronto.`);
            }

            case 'sair': {
                if (!evento) return msg.reply("❌ Não há nenhum evento ativo.");

                const index = evento.participantes.findIndex(p => p.userId === senderRaw);
                if (index === -1) return msg.reply("⚠️ Você não está inscrito neste evento.");

                evento.participantes.splice(index, 1);
                await evento.save();

                return msg.reply("✅ Você saiu da lista de participantes do evento.");
            }

            case 'confirmarp': {
                if (!evento) return msg.reply("❌ Não há nenhum evento ativo para confirmar presença.");

                const participante = evento.participantes.find(p => p.userId === senderRaw);
                if (!participante) return msg.reply("⚠️ Você precisa se inscrever primeiro usando o comando `/participar`.");

                if (participante.confirmado) return msg.reply("⭐ Você já confirmou a sua presença anteriormente!");

                participante.confirmado = true;
                await evento.save();

                return msg.reply("⭐ *PRESENÇA CONFIRMADA COM SUCESSO!* Seu nome agora brilha com a estrela na lista do evento. Não falte!");
            }

            case 'evento': {
                if (!evento) return msg.reply("❌ Nenhum evento ativo no momento.");

                return msg.reply(`📋 *PAINEL DO EVENTO* 🚀\n\n📌 *Título:* ${evento.titulo}\n📝 *Descrição:* ${evento.descricao || 'N/A'}\n📅 *Data:* ${evento.data || 'A definir'}\n⏰ *Hora:* ${evento.hora || 'A definir'}\n⚠️ *Punição por falta (ADV):* ${evento.aplicarAdv ? 'Sim 🚨' : 'Não 🟢'}\n👥 *Inscritos:* ${evento.participantes.length}\n\n*Comandos úteis:* \`/participar\`, \`/confirmarP\`, \`/sair\`, \`/lista evento\``);
            }

            case 'lista': {
                if (!evento) return msg.reply("❌ Nenhum evento ativo.");

                if (evento.participantes.length === 0) return msg.reply("📋 A lista de participantes está vazia no momento.");

                let textoLista = `📋 *LISTA DE PARTICIPANTES* (${evento.participantes.length})\n📍 *Evento:* ${evento.titulo}\n\n`;
                
                evento.participantes.forEach((p, index) => {
                    const estrela = p.confirmado ? '⭐ ' : '';
                    textoLista += `${index + 1}. ${estrela}*${p.nome}* ${p.confirmado ? '(Confirmado)' : '(Pendente)'}\n`;
                });

                textoLista += `\n_Legenda: O símbolo ⭐ indica quem já usou o /confirmarP._`;
                return msg.reply(textoLista);
            }
        }
    }
};