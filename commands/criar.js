const Evento = require('../models/eventSchema');
const GroupStats = require('../index').GroupStats || require('mongoose').model('GroupStats');

module.exports = {
    name: 'criar',
    async execute(client, msg, { chatId, senderRaw }) {
        if (!chatId.endsWith('@g.us')) return msg.reply("❌ Comando exclusivo para grupos.");
        
        // Pega o texto bruto da mensagem para preservar quebras de linha e espaços exatos
        const corpoMensagem = msg.body || '';
        // Remove o comando inicial (/criar evento) e pega o resto do texto
        const semComando = corpoMensagem.replace(/^\/criar\s+evento\s*/i, '').trim();

        if (!semComando) {
            return msg.reply("⚠️ Use o formato correto separando com vírgula:\n`/criar evento [Título] , [Descrição]`");
        }

        // Divide o texto na primeira vírgula encontrada para separar Título e Descrição
        const primeiraVirgulaIndex = semComando.indexOf(',');
        
        let titulo = semComando;
        let descricao = '';

        if (primeiraVirgulaIndex !== -1) {
            titulo = semComando.slice(0, primeiraVirgulaIndex).trim();
            descricao = semComando.slice(primeiraVirgulaIndex + 1).trim();
        }

        if (!titulo) {
            return msg.reply("⚠️ O título do evento não pode estar vazio!\nUse: `/criar evento [Título] , [Descrição]`");
        }

        try {
            await Evento.updateMany({ groupId: chatId, status: 'criado' }, { status: 'finalizado' });

            await Evento.create({
                groupId: chatId,
                titulo: titulo,
                descricao: descricao,
                criadoPor: senderRaw
            });

            // Incrementar contador de eventos criados
            await GroupStats.findOneAndUpdate(
                { groupId: chatId },
                { $inc: { eventsCreated: 1 } },
                { upsert: true }
            );

            return msg.reply(
                `🚀 *EVENTO CRIADO COM SUCESSO!*\n\n` +
                `📌 *Título:* ${titulo}\n` +
                `${descricao ? `📝 *Descrição:*\n${descricao}\n\n` : ''}` +
                `Configure as informações usando:\n\`/infor evento [data] | [hora] | [true/false para adv]\``
            );
        } catch (err) {
            console.error("❌ Erro ao criar evento:", err);
            return msg.reply("⚠️ Erro ao criar o evento.");
        }
    }
};